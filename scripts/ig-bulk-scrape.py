#!/usr/bin/env python3
"""
Bulk Instagram scraper using Playwright + in-browser fetch().
Loads the profile page in a real browser (saved session cookies),
then calls Instagram's private /api/v1/feed/user/ endpoint from
*inside* the browser context so Instagram sees a normal-looking
session instead of a script.

Usage:
  python3 scripts/ig-bulk-scrape.py <handle> [limit]
  python3 scripts/ig-bulk-scrape.py <handle> [limit] --login user pass

Output: JSON {"posts": [...], "followersCount": N} to stdout.
"""
import sys, json, time, re
from pathlib import Path
from playwright.sync_api import sync_playwright

SCRIPT_DIR  = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / '.ig-cookies.json'

handle = sys.argv[1].lstrip('@') if len(sys.argv) > 1 else ''
limit  = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 50

if not handle:
    print(json.dumps({'error': 'Usage: ig-bulk-scrape.py <handle> [limit]'}), file=sys.stderr)
    sys.exit(1)

# Optional --login user pass
login_user = login_pass = None
if '--login' in sys.argv:
    idx = sys.argv.index('--login')
    login_user, login_pass = sys.argv[idx+1], sys.argv[idx+2]

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_in_json(obj, key, depth=0):
    if depth > 30: return None
    if isinstance(obj, dict):
        if key in obj: return obj[key]
        for v in obj.values():
            r = find_in_json(v, key, depth+1)
            if r is not None: return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_in_json(v, key, depth+1)
            if r is not None: return r
    return None

def find_user_id(obj, depth=0):
    if depth > 30: return None
    if isinstance(obj, dict):
        # Common shapes that hold the profile user id
        if 'profile_id' in obj and obj['profile_id']:
            return str(obj['profile_id'])
        if 'pk_id' in obj and obj.get('username', '').lower() == handle.lower():
            return str(obj['pk_id'])
        if 'pk' in obj and obj.get('username', '').lower() == handle.lower():
            return str(obj['pk'])
        if obj.get('username', '').lower() == handle.lower() and obj.get('id'):
            try: int(obj['id'])  # numeric only
            except Exception: pass
            else: return str(obj['id'])
        for v in obj.values():
            r = find_user_id(v, depth+1)
            if r: return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_user_id(v, depth+1)
            if r: return r
    return None

def find_follower_count(obj, depth=0):
    if depth > 30: return None
    if isinstance(obj, dict):
        if 'follower_count' in obj and isinstance(obj.get('follower_count'), int):
            return obj['follower_count']
        if 'edge_followed_by' in obj:
            c = obj['edge_followed_by'].get('count')
            if isinstance(c, int): return c
        for v in obj.values():
            r = find_follower_count(v, depth+1)
            if r is not None: return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_follower_count(v, depth+1)
            if r is not None: return r
    return None

def do_login(page, username, password):
    sys.stderr.write('Logging in to Instagram…\n')
    page.goto('https://www.instagram.com/accounts/login/', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(3500)
    for btn_text in ['Allow', 'Accept', 'Allow all cookies']:
        try:
            page.locator(f'button:has-text("{btn_text}")').first.click(timeout=2000)
            page.wait_for_timeout(1500)
        except Exception:
            pass
    page.wait_for_selector('input[name="username"], input[name="email"]', timeout=30000)
    if page.locator('input[name="email"]').count() > 0:
        page.fill('input[name="email"]', username)
        page.fill('input[name="pass"]', password)
    else:
        page.fill('input[name="username"]', username)
        page.fill('input[name="password"]', password)
    page.keyboard.press('Enter')
    page.wait_for_timeout(6000)
    for _ in range(3):
        if page.locator('button:has-text("Not Now")').count() > 0:
            page.locator('button:has-text("Not Now")').first.click()
            page.wait_for_timeout(1500)
    sys.stderr.write('Logged in.\n')

def media_item_to_apify(item, username):
    is_video = item.get('media_type') in (2, '2')
    cap_obj  = item.get('caption') or {}
    caption  = cap_obj.get('text', '') if isinstance(cap_obj, dict) else str(cap_obj)

    music = None
    cm = item.get('clips_metadata') or {}
    mi = (cm.get('music_info') or {}).get('music_asset_info') or {}
    oa = cm.get('original_sound_info') or {}
    if mi:
        music = {'artist_name': mi.get('artist_name'), 'song_name': mi.get('title')}
    elif oa:
        music = {'artist_name': oa.get('ig_artist', {}).get('username') if isinstance(oa.get('ig_artist'), dict) else None,
                 'song_name':   oa.get('original_audio_title')}

    code = item.get('code') or item.get('shortcode', '')
    return {
        'id':             str(item.get('pk', '') or item.get('id', '')),
        'shortCode':      code,
        'type':           'Video' if is_video else 'Image',
        'productType':    item.get('product_type', 'clips' if is_video else 'feed'),
        'url':            f'https://www.instagram.com/p/{code}/',
        'caption':        caption,
        'likesCount':     item.get('like_count', 0) or 0,
        'commentsCount':  item.get('comment_count', 0) or 0,
        'videoViewCount': item.get('play_count') or item.get('view_count'),
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

# ── Browser-side fetcher ──────────────────────────────────────────────────────

BROWSER_FETCH_JS = """
async ({ userId, maxId, count }) => {
  const params = new URLSearchParams({ count: String(count) });
  if (maxId) params.set('max_id', maxId);
  const url = `https://www.instagram.com/api/v1/feed/user/${userId}/?` + params.toString();
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'X-IG-App-ID':      '936619743392459',
      'X-ASBD-ID':        '129477',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept':           '*/*',
    },
    credentials: 'include',
  });
  const text = await resp.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (e) {}
  return { status: resp.status, body: parsed, raw: parsed ? null : text.slice(0, 400) };
}
"""

def bulk_fetch(page, user_id, want):
    posts  = []
    max_id = None
    while len(posts) < want:
        batch = min(50, want - len(posts))
        result = page.evaluate(BROWSER_FETCH_JS, {'userId': user_id, 'maxId': max_id, 'count': batch})

        if result.get('status') != 200 or not result.get('body'):
            sys.stderr.write(f'[bulk] status={result.get("status")} raw={result.get("raw")}\n')
            break

        body = result['body']
        items = body.get('items', [])
        for it in items:
            posts.append(media_item_to_apify(it, handle))

        sys.stderr.write(f'[bulk] +{len(items)} (total {len(posts)})\n')

        if not body.get('more_available') or not items:
            break
        max_id = body.get('next_max_id')
        time.sleep(0.4)

    return posts

# ── Main ──────────────────────────────────────────────────────────────────────

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

    if COOKIE_FILE.exists() and not login_user:
        ctx.add_cookies(json.loads(COOKIE_FILE.read_text()))
        sys.stderr.write('Loaded saved session.\n')

    if login_user:
        login_page = ctx.new_page()
        do_login(login_page, login_user, login_pass)
        login_page.close()
        COOKIE_FILE.write_text(json.dumps(ctx.cookies()))
        sys.stderr.write(f'Session saved to {COOKIE_FILE}\n')

    page = ctx.new_page()
    user_id = [None]
    follower_count = [0]

    def on_response(response):
        url = response.url
        if 'web_profile_info' not in url and 'api/graphql' not in url and '/api/v1/users/' not in url:
            return
        try:
            body = response.json()
        except Exception:
            return
        if not user_id[0]:
            uid = find_user_id(body)
            if uid: user_id[0] = uid
        if not follower_count[0]:
            fc = find_follower_count(body)
            if fc: follower_count[0] = fc

    page.on('response', on_response)
    sys.stderr.write(f'Loading profile @{handle}…\n')
    page.goto(f'https://www.instagram.com/{handle}/', wait_until='load', timeout=60000)
    page.wait_for_timeout(5000)
    sys.stderr.write(f'  follower_count={follower_count[0]} user_id={user_id[0]}\n')

    # If still no user_id, try the in-browser API directly
    if not user_id[0]:
        try:
            profile_info = page.evaluate("""
              async (h) => {
                const r = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${h}`,
                  { headers: {'X-IG-App-ID':'936619743392459','X-ASBD-ID':'129477'}, credentials:'include' });
                if (!r.ok) return { error: r.status };
                const j = await r.json();
                return j;
              }
            """, handle)
            if profile_info and profile_info.get('data', {}).get('user'):
                u = profile_info['data']['user']
                user_id[0] = str(u['id'])
                follower_count[0] = u.get('edge_followed_by', {}).get('count', 0)
                sys.stderr.write(f'  in-browser profile_info OK: user_id={user_id[0]} followers={follower_count[0]}\n')
            else:
                sys.stderr.write(f'  in-browser profile_info failed: {profile_info}\n')
        except Exception as e:
            sys.stderr.write(f'  in-browser profile_info error: {e}\n')

    posts = []
    if user_id[0]:
        sys.stderr.write(f'Bulk-fetching up to {limit} posts via in-browser /api/v1/feed/user/…\n')
        posts = bulk_fetch(page, user_id[0], limit)
    else:
        sys.stderr.write('Could not determine user_id — returning empty.\n')

    browser.close()

print(json.dumps({'posts': posts, 'followersCount': follower_count[0]}))
sys.stderr.write(f'Done: {len(posts)} posts from @{handle}\n')
