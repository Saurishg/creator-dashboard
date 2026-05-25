#!/usr/bin/env python3
"""
Fast Instagram scraper using saved Playwright session cookies.
Reads scripts/.ig-cookies.json and calls Instagram's internal API to
bulk-fetch posts — no Apify needed, no per-post page loads.

Usage:
  python3 scripts/ig-session-scrape.py <handle> [limit]
  python3 scripts/ig-session-scrape.py <handle> [limit] --login iguser igpass

Output: JSON {"posts": [...], "followersCount": N} to stdout.
"""
import sys, json, time, re
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'requests'])
    import requests

SCRIPT_DIR  = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / '.ig-cookies.json'
USER_CACHE  = SCRIPT_DIR / '.ig-user-cache.json'

HEADERS = {
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept':           '*/*',
    'Accept-Language':  'en-US,en;q=0.9',
    'X-IG-App-ID':      '936619743392459',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer':          'https://www.instagram.com/',
    'Origin':           'https://www.instagram.com',
}

# ── Args ─────────────────────────────────────────────────────────────────────

handle = sys.argv[1].lstrip('@') if len(sys.argv) > 1 else ''
limit  = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 50

if not handle:
    print(json.dumps({'error': 'Usage: ig-session-scrape.py <handle> [limit]'}), file=sys.stderr)
    sys.exit(1)

# ── Session ───────────────────────────────────────────────────────────────────

def cookies_to_jar(cookie_list):
    return {c['name']: c['value'] for c in cookie_list}

def load_session():
    if not COOKIE_FILE.exists():
        return {}
    data = json.loads(COOKIE_FILE.read_text())
    return cookies_to_jar(data)

def save_playwright_cookies(username, password):
    """Log in via Playwright and save cookies, then return the jar."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        ctx = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = ctx.new_page()
        page.goto('https://www.instagram.com/accounts/login/', wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(3000)
        for btn in ['Allow all cookies', 'Accept all', 'Allow']:
            try:
                page.locator(f'button:has-text("{btn}")').first.click(timeout=2000)
                page.wait_for_timeout(1000)
            except Exception:
                pass
        page.wait_for_selector('input[name="username"]', timeout=20000)
        page.fill('input[name="username"]', username)
        page.wait_for_timeout(400)
        page.fill('input[name="password"]', password)
        page.keyboard.press('Enter')
        page.wait_for_timeout(5000)
        for _ in range(3):
            if page.locator('button:has-text("Not Now")').count() > 0:
                page.locator('button:has-text("Not Now")').first.click()
                page.wait_for_timeout(1500)
        new_cookies = ctx.cookies()
        browser.close()
    COOKIE_FILE.write_text(json.dumps(new_cookies))
    sys.stderr.write('Session saved.\n')
    return cookies_to_jar(new_cookies)

# ── Instagram API calls ───────────────────────────────────────────────────────

session = requests.Session()
session.headers.update(HEADERS)

def load_user_cache():
    if USER_CACHE.exists():
        try: return json.loads(USER_CACHE.read_text())
        except Exception: return {}
    return {}

def save_user_cache(cache):
    try: USER_CACHE.write_text(json.dumps(cache))
    except Exception: pass

def get_user_id_from_html(username, jar):
    """Extract user_id from the profile page HTML (less rate-limited than API)."""
    r = session.get(
        f'https://www.instagram.com/{username}/',
        cookies=jar, timeout=20,
        headers={**HEADERS, 'Accept': 'text/html,application/xhtml+xml'},
    )
    if r.status_code != 200:
        raise RuntimeError(f'profile page status {r.status_code}')
    html = r.text
    # Several patterns IG uses to embed the user id in the HTML
    for pattern in (
        r'"profile_id":"(\d+)"',
        r'"id":"(\d+)","username":"' + re.escape(username) + r'"',
        r'"owner":\{"id":"(\d+)"',
        r'profilePage_(\d+)',
        r'"user_id":"(\d+)"',
    ):
        m = re.search(pattern, html)
        if m:
            uid = m.group(1)
            # Try to also pull follower count
            f = re.search(r'"edge_followed_by":\{"count":(\d+)\}', html)
            return uid, (int(f.group(1)) if f else 0)
    raise RuntimeError('could not find user_id in profile HTML')

def get_user_info(username, jar):
    """Return (user_id, followers_count). Uses cache + HTML extraction + API fallback."""
    cache = load_user_cache()
    entry = cache.get(username.lower())
    if entry and entry.get('user_id'):
        sys.stderr.write(f'  using cached user_id={entry["user_id"]}\n')
        return entry['user_id'], entry.get('followers', 0)

    # Try HTML scrape first
    try:
        uid, followers = get_user_id_from_html(username, jar)
        cache[username.lower()] = {'user_id': uid, 'followers': followers}
        save_user_cache(cache)
        return uid, followers
    except Exception as e:
        sys.stderr.write(f'  HTML extraction failed: {e}; trying API\n')

    # Fallback to the profile API
    r = session.get(
        f'https://www.instagram.com/api/v1/users/web_profile_info/?username={username}',
        cookies=jar, timeout=20
    )
    r.raise_for_status()
    user = r.json()['data']['user']
    uid = str(user['id'])
    followers = user.get('edge_followed_by', {}).get('count', 0)
    cache[username.lower()] = {'user_id': uid, 'followers': followers}
    save_user_cache(cache)
    return uid, followers

def fetch_timeline_graphql(user_id, jar, want):
    """Paginate user timeline via Instagram's GraphQL endpoint."""
    posts = []
    cursor = None
    csrf = jar.get('csrftoken', '')

    while len(posts) < want:
        batch = min(50, want - len(posts))
        variables = {'id': user_id, 'first': batch}
        if cursor:
            variables['after'] = cursor

        r = session.post(
            'https://www.instagram.com/graphql/query',
            data={
                'doc_id':    '17888483320059182',
                'variables': json.dumps(variables),
            },
            headers={
                **HEADERS,
                'X-CSRFToken':  csrf,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-IG-App-ID':  '936619743392459',
            },
            cookies=jar,
            timeout=30,
        )

        if r.status_code != 200:
            sys.stderr.write(f'[graphql] status {r.status_code}: {r.text[:200]}\n')
            break

        try:
            data = r.json()
        except Exception:
            sys.stderr.write(f'[graphql] non-JSON response: {r.text[:200]}\n')
            break

        timeline = (
            data.get('data', {}).get('user', {}).get('edge_owner_to_timeline_media')
            or data.get('data', {}).get('xdt_api__v1__feed__user_timeline_graphql_connection')
        )
        if not timeline:
            sys.stderr.write(f'[graphql] unexpected shape: keys={list(data.get("data", {}).keys())}\n')
            break

        edges     = timeline.get('edges', [])
        page_info = timeline.get('page_info', {})

        for edge in edges:
            node = edge.get('node', {})
            posts.append(node_to_apify(node, handle))

        sys.stderr.write(f'[graphql] +{len(edges)} (total {len(posts)})\n')

        if not page_info.get('has_next_page') or not edges:
            break
        cursor = page_info.get('end_cursor')
        time.sleep(0.4)

    return posts

def fetch_via_api_v1(user_id, jar, want):
    """Fallback: /api/v1/feed/user/ pagination."""
    posts = []
    max_id = None
    csrf   = jar.get('csrftoken', '')

    while len(posts) < want:
        params = {'count': min(50, want - len(posts))}
        if max_id:
            params['max_id'] = max_id

        r = session.get(
            f'https://i.instagram.com/api/v1/feed/user/{user_id}/',
            params=params,
            headers={**HEADERS, 'X-CSRFToken': csrf},
            cookies=jar,
            timeout=30,
        )

        if r.status_code != 200:
            sys.stderr.write(f'[api/v1] status {r.status_code}: {r.text[:200]}\n')
            break

        try:
            data = r.json()
        except Exception:
            sys.stderr.write(f'[api/v1] non-JSON: {r.text[:200]}\n')
            break

        items = data.get('items', [])
        for item in items:
            posts.append(media_item_to_apify(item, handle))

        sys.stderr.write(f'[api/v1] +{len(items)} (total {len(posts)})\n')

        if not data.get('more_available') or not items:
            break
        max_id = data.get('next_max_id')
        time.sleep(0.3)

    return posts

# ── Post normalisation ────────────────────────────────────────────────────────

def node_to_apify(node, username):
    is_video = node.get('is_video', False)
    caption  = ''
    cap_edges = node.get('edge_media_to_caption', {}).get('edges', [])
    if cap_edges:
        caption = cap_edges[0].get('node', {}).get('text', '')

    music = None
    clips_music = node.get('clips_music_attribution_info') or node.get('music_metadata')
    if clips_music:
        music = {
            'artist_name': clips_music.get('artist_name') or clips_music.get('music_canonical_id'),
            'song_name':   clips_music.get('song_name'),
        }

    return {
        'id':             node.get('id', ''),
        'shortCode':      node.get('shortcode', ''),
        'type':           'Video' if is_video else 'Image',
        'productType':    node.get('product_type') or ('clips' if is_video else 'feed'),
        'url':            f"https://www.instagram.com/p/{node.get('shortcode', '')}/",
        'caption':        caption,
        'likesCount':     node.get('edge_liked_by', {}).get('count', 0)
                          or node.get('edge_media_preview_like', {}).get('count', 0),
        'commentsCount':  node.get('edge_media_to_comment', {}).get('count', 0),
        'videoViewCount': node.get('video_view_count'),
        'videoUrl':       node.get('video_url'),
        'displayUrl':     node.get('display_url', ''),
        'timestamp':      str(node.get('taken_at_timestamp', '')),
        'ownerUsername':  username,
        'ownerFullName':  node.get('owner', {}).get('full_name', ''),
        'hashtags':       re.findall(r'#(\w+)', caption),
        'mentions':       re.findall(r'@(\w+)', caption),
        'musicInfo':      music,
        'audioUrl':       None,
        'alt':            node.get('accessibility_caption', ''),
        'videoDuration':  node.get('video_duration'),
    }

def media_item_to_apify(item, username):
    is_video = item.get('media_type') in (2, '2')
    cap_obj  = item.get('caption') or {}
    caption  = cap_obj.get('text', '') if isinstance(cap_obj, dict) else str(cap_obj)

    music = None
    if item.get('clips_metadata') and item['clips_metadata'].get('music_info'):
        mi = item['clips_metadata']['music_info'].get('music_asset_info', {})
        music = {'artist_name': mi.get('artist_name'), 'song_name': mi.get('title')}

    code = item.get('code') or item.get('shortcode', '')

    return {
        'id':             str(item.get('pk', '')),
        'shortCode':      code,
        'type':           'Video' if is_video else 'Image',
        'productType':    item.get('product_type', 'clips' if is_video else 'feed'),
        'url':            f'https://www.instagram.com/p/{code}/',
        'caption':        caption,
        'likesCount':     item.get('like_count', 0),
        'commentsCount':  item.get('comment_count', 0),
        'videoViewCount': item.get('view_count') or item.get('play_count'),
        'videoUrl':       (item.get('video_versions') or [{}])[0].get('url') if is_video else None,
        'displayUrl':     ((item.get('image_versions2') or {}).get('candidates') or [{}])[0].get('url', ''),
        'timestamp':      str(item.get('taken_at', '')),
        'ownerUsername':  username,
        'ownerFullName':  (item.get('user') or {}).get('full_name', ''),
        'hashtags':       re.findall(r'#(\w+)', caption),
        'mentions':       re.findall(r'@(\w+)', caption),
        'musicInfo':      music,
        'audioUrl':       None,
        'alt':            item.get('accessibility_caption', ''),
        'videoDuration':  item.get('video_duration'),
    }

# ── Main ──────────────────────────────────────────────────────────────────────

if '--login' in sys.argv:
    idx = sys.argv.index('--login')
    jar = save_playwright_cookies(sys.argv[idx + 1], sys.argv[idx + 2])
else:
    jar = load_session()

if not jar.get('sessionid'):
    sys.stderr.write('[ig-session-scrape] No saved session. Re-run with --login iguser igpassword\n')
    print(json.dumps({'posts': [], 'followersCount': 0}))
    sys.exit(0)

try:
    sys.stderr.write(f'Fetching profile info for @{handle}…\n')
    user_id, followers = get_user_info(handle, jar)
    sys.stderr.write(f'  user_id={user_id} followers={followers}\n')
except Exception as e:
    sys.stderr.write(f'Failed to get user info: {e}\n')
    print(json.dumps({'posts': [], 'followersCount': 0}))
    sys.exit(1)

posts = []
sys.stderr.write(f'Fetching up to {limit} posts via GraphQL…\n')
try:
    posts = fetch_timeline_graphql(user_id, jar, limit)
except Exception as e:
    sys.stderr.write(f'GraphQL failed: {e}\n')

if not posts:
    sys.stderr.write('Falling back to /api/v1/feed/user/…\n')
    try:
        posts = fetch_via_api_v1(user_id, jar, limit)
    except Exception as e:
        sys.stderr.write(f'/api/v1 also failed: {e}\n')

print(json.dumps({'posts': posts, 'followersCount': followers}))
sys.stderr.write(f'Done: {len(posts)} posts from @{handle}\n')
