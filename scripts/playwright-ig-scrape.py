#!/usr/bin/env python3
"""
Scrapes Instagram profile posts using Playwright headless browser.
Logs in once, saves cookies, reuses session on subsequent runs.
Usage: python3 scripts/playwright-ig-scrape.py <handle> [limit] [--login user pass]
"""
import sys, json, time, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / '.ig-cookies.json'

handle = sys.argv[1].lstrip('@')
limit  = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 20

# Optional login args: --login username password
login_user = login_pass = None
if '--login' in sys.argv:
    idx = sys.argv.index('--login')
    login_user = sys.argv[idx + 1]
    login_pass = sys.argv[idx + 2]

def do_login(page, username, password):
    sys.stderr.write('Logging in to Instagram…\n')
    page.goto('https://www.instagram.com/accounts/login/', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(4000)
    # Accept cookies if prompted
    for btn_text in ['Allow', 'Accept', 'Allow all cookies']:
        try:
            page.locator(f'button:has-text("{btn_text}")').first.click(timeout=2000)
            page.wait_for_timeout(1500)
        except Exception:
            pass
    page.wait_for_selector('input[name="email"], input[name="username"]', timeout=30000)
    if page.locator('input[name="email"]').count() > 0:
        page.fill('input[name="email"]', username)
        page.wait_for_timeout(500)
        page.fill('input[name="pass"]', password)
    else:
        page.fill('input[name="username"]', username)
        page.wait_for_timeout(500)
        page.fill('input[name="password"]', password)
    page.wait_for_timeout(500)
    page.keyboard.press('Enter')
    page.wait_for_timeout(6000)
    # Handle "Save login info" or "Turn on notifications" dialogs
    for _ in range(3):
        if page.locator('button:has-text("Not Now")').count() > 0:
            page.locator('button:has-text("Not Now")').first.click()
            page.wait_for_timeout(2000)
    sys.stderr.write('Logged in.\n')

def find_follower_count_in_json(obj, depth=0):
    """Recursively find follower count in a parsed JSON object."""
    if depth > 40:
        return None
    if isinstance(obj, dict):
        if 'follower_count' in obj and isinstance(obj.get('follower_count'), int) and obj['follower_count'] > 0:
            return obj['follower_count']
        if 'edge_followed_by' in obj and isinstance(obj.get('edge_followed_by'), dict):
            count = obj['edge_followed_by'].get('count')
            if isinstance(count, int) and count > 0:
                return count
        for v in obj.values():
            r = find_follower_count_in_json(v, depth + 1)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = find_follower_count_in_json(item, depth + 1)
            if r is not None:
                return r
    return None

def find_post_by_code(obj, code, depth=0):
    """Recursively find a media dict with matching 'code' field in Relay JSON."""
    if depth > 40:
        return None
    if isinstance(obj, dict):
        if obj.get('code') == code:
            return obj
        for v in obj.values():
            r = find_post_by_code(v, code, depth + 1)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = find_post_by_code(item, code, depth + 1)
            if r is not None:
                return r
    return None

def extract_post_from_relay(html, shortcode):
    """Parse page HTML scripts and find media node matching the shortcode."""
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    # Try biggest scripts first (more likely to contain full Relay store)
    for s in sorted(scripts, key=len, reverse=True)[:5]:
        if len(s) < 500:
            continue
        try:
            data = json.loads(s)
            post = find_post_by_code(data, shortcode)
            if post:
                return post
        except Exception:
            pass
    return None

def relay_post_to_apify(post, username, shortcode):
    """Convert a Relay media node to our ApifyPost-compatible dict."""
    is_video = post.get('media_type') in (2, '2') or post.get('is_video', False)
    cap = post.get('caption') or {}
    if isinstance(cap, dict):
        caption_text = cap.get('text', '')
    elif isinstance(cap, str):
        caption_text = cap
    else:
        caption_text = ''
    pk = str(post.get('pk', ''))
    return {
        'id':             pk,
        'shortCode':      shortcode,
        'type':           'Video' if is_video else 'Image',
        'productType':    post.get('product_type', 'clips' if is_video else 'feed'),
        'url':            f'https://www.instagram.com/p/{shortcode}/',
        'caption':        caption_text,
        'likesCount':     post.get('like_count', 0) or 0,
        'commentsCount':  post.get('comment_count', 0) or 0,
        'videoViewCount': post.get('view_count') or post.get('play_count'),
        'videoUrl':       post.get('video_url') or None,
        'displayUrl':     post.get('display_uri', ''),
        'timestamp':      str(post.get('taken_at', '')),
        'ownerUsername':  username,
        'ownerFullName':  '',
        'hashtags':       [],
        'mentions':       [],
        'musicInfo':      None,
        'audioUrl':       None,
        'alt':            post.get('accessibility_caption', ''),
        'videoDuration':  post.get('video_duration'),
    }

def make_stub(shortcode, username):
    return {
        'id': '', 'shortCode': shortcode, 'type': 'Image', 'productType': 'feed',
        'url': f'https://www.instagram.com/p/{shortcode}/',
        'caption': '', 'likesCount': 0, 'commentsCount': 0,
        'videoViewCount': None, 'videoUrl': None, 'displayUrl': '',
        'timestamp': '', 'ownerUsername': username, 'ownerFullName': '',
        'hashtags': [], 'mentions': [], 'musicInfo': None, 'audioUrl': None,
        'alt': '', 'videoDuration': None,
    }

def get_dom_shortcodes(page, max_scroll=8):
    """Scroll profile page and collect all /p/ and /reel/ shortcodes from DOM links."""
    seen = set()
    codes = []
    for _ in range(max_scroll):
        # Filter in JS rather than via CSS selector to avoid comma-selector issues
        links = page.eval_on_selector_all(
            'a',
            'els => els.map(e => e.href).filter(h => h.includes("/p/") || h.includes("/reel/"))'
        )
        for l in links:
            m = re.search(r'instagram\.com/[^/]+/(?:p|reel)/([A-Za-z0-9_\-]+)', l) \
                or re.search(r'instagram\.com/(?:p|reel)/([A-Za-z0-9_\-]+)', l)
            if m and m.group(1) not in seen:
                seen.add(m.group(1))
                codes.append(m.group(1))
        page.evaluate('window.scrollBy(0, 1500)')
        page.wait_for_timeout(1500)
    return codes

def scrape_profile(ctx, username, max_posts):
    sys.stderr.write(f'Loading profile @{username}…\n')

    # Step 1: get shortcodes + follower count from profile page
    prof_page = ctx.new_page()
    follower_count = 0

    def on_response(response):
        nonlocal follower_count
        if follower_count > 0:
            return
        url = response.url
        if 'api/graphql' not in url and 'web_profile_info' not in url:
            return
        try:
            body = response.json()
            count = find_follower_count_in_json(body)
            if count and count > 0:
                follower_count = count
        except Exception:
            pass

    prof_page.on('response', on_response)
    prof_page.goto(f'https://www.instagram.com/{username}/', wait_until='load', timeout=60000)
    prof_page.wait_for_timeout(4000)
    sys.stderr.write(f'Follower count for @{username}: {follower_count}\n')
    # Instagram loads ~12 posts per scroll; cap at 25 scrolls to stay within process timeout.
    shortcodes = get_dom_shortcodes(prof_page, max_scroll=min(25, max(8, max_posts // 3)))
    prof_page.close()
    sys.stderr.write(f'Found {len(shortcodes)} shortcodes on profile\n')

    # Step 2: visit each post/reel page to get metadata
    posts = []
    for sc in shortcodes[:max_posts]:
        post_page = ctx.new_page()
        try:
            url = f'https://www.instagram.com/p/{sc}/'
            post_page.goto(url, wait_until='load', timeout=60000)
            post_page.wait_for_timeout(800)
            html = post_page.content()
            relay_post = extract_post_from_relay(html, sc)
            if relay_post:
                posts.append(relay_post_to_apify(relay_post, username, sc))
            else:
                posts.append(make_stub(sc, username))
        except Exception as e:
            sys.stderr.write(f'  Error loading {sc}: {e}\n')
            posts.append(make_stub(sc, username))
        finally:
            post_page.close()

    return posts, follower_count

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    )
    ctx = browser.new_context(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport={'width': 1280, 'height': 800},
        locale='en-US',
        extra_http_headers={'Accept-Language': 'en-US,en;q=0.9'},
    )
    ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    # Load saved cookies if available
    if COOKIE_FILE.exists() and not login_user:
        cookies = json.loads(COOKIE_FILE.read_text())
        ctx.add_cookies(cookies)
        sys.stderr.write('Loaded saved session.\n')

    if login_user:
        login_page = ctx.new_page()
        do_login(login_page, login_user, login_pass)
        login_page.close()
        COOKIE_FILE.write_text(json.dumps(ctx.cookies()))
        sys.stderr.write(f'Session saved to {COOKIE_FILE}\n')

    posts, follower_count = scrape_profile(ctx, handle, limit)
    browser.close()

print(json.dumps({'posts': posts, 'followersCount': follower_count}))
sys.stderr.write(f'Scraped {len(posts)} posts from @{handle}\n')
