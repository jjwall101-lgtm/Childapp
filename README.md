# Clara sync version

This version keeps the latest rules and adds Firebase syncing.

## Rules

- Every new day starts on amber
- Okay to green adds 50 carrots every time
- Pressing green again while already green adds 0 carrots
- Amazing to amber removes 0 carrots
- Okay is safe
- Clara must be amber before he can go green
- Amazing can go straight to red
- Moving onto red removes 50 carrots
- Pressing red again while already red removes 0 carrots
- 1000 carrots unlocks the special treat message
- Changes can sync between phones after Firebase config is added

## Refresh note

This version uses:

style.css?v=10
script.js?v=10


## v57 Bunny timer + cache refresh

This package adds:
- A Bunny Timer tab.
- Cache busting on `index.html`, `style.css`, `script.js`, `manifest.json` and `sw.js` using `clara-v57-bunny-timer-cache-20260618`.
- A service worker that deletes old caches and loads fresh app files when someone opens the app.

Upload all files in this folder to the same GitHub repository. Keep existing icon files if they are already in the repo.
