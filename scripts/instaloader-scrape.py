#!/usr/bin/env python3
"""
Drop-in Instagram scraper using instaloader (free, no API key).
Usage: python3 scripts/instaloader-scrape.py <handle> [limit]
Prints JSON array of posts in Apify-compatible format to stdout.
"""
import sys, json, instaloader, datetime

handle = sys.argv[1].lstrip('@')
limit  = int(sys.argv[2]) if len(sys.argv) > 2 else 20

L = instaloader.Instaloader(
    download_pictures=False,
    download_videos=False,
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    quiet=True,
)

try:
    profile = instaloader.Profile.from_username(L.context, handle)
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)

posts = []
for post in profile.get_posts():
    if len(posts) >= limit:
        break
    try:
        p = {
            "id":              str(post.mediaid),
            "shortCode":       post.shortcode,
            "type":            "Video" if post.is_video else "Image",
            "productType":     "clips" if post.is_video else ("sidecar" if post.typename == "GraphSidecar" else "feed"),
            "url":             f"https://www.instagram.com/p/{post.shortcode}/",
            "caption":         post.caption or "",
            "likesCount":      post.likes,
            "commentsCount":   post.comments,
            "videoViewCount":  post.video_view_count if post.is_video else None,
            "videoUrl":        post.video_url if post.is_video else None,
            "displayUrl":      post.url,
            "timestamp":       post.date_utc.isoformat() + "Z",
            "ownerUsername":   handle,
            "ownerFullName":   profile.full_name or "",
            "ownerId":         str(profile.userid),
            "hashtags":        list(post.caption_hashtags) if post.caption else [],
            "mentions":        list(post.caption_mentions) if post.caption else [],
            "musicInfo":       None,
            "audioUrl":        None,
            "alt":             "",
            "videoDuration":   post.video_duration if post.is_video else None,
        }
        posts.append(p)
    except Exception:
        continue

print(json.dumps(posts))
sys.stderr.write(f"Scraped {len(posts)} posts from @{handle}\n")
