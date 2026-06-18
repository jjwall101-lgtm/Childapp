# Clara bunny sync version

This package is built from Cameron's app files and changed for Clara.

## Included changes

- App name changed to Clara.
- Uploaded Clara picture is used as `icon.png` and `icon-192.png`.
- Bunny theme is locked on; the theme selector has been removed.
- Coin wording has been changed to carrots.
- Firebase config points to Clara's project: `childapp-af257`.
- App storage keys and Firestore family record are changed so it does not clash with Cameron's app.
- Heavy decorative animations are disabled/reduced to improve performance on phones.
- Timer and Family tabs from the uploaded v51 files are kept.

## Upload files

Upload everything in this zip to the root of the GitHub repo:

- index.html
- style.css
- script.js
- manifest.json
- sw.js
- icon.png
- icon-192.png
- clara-icon-preview.png
- firestore.rules
- README.md
- FIREBASE_SETUP.md

## Refresh note

This version uses:

- `style.css?v=clara-bunny-1`
- `script.js?v=clara-bunny-1`
- `sw.js?v=clara-bunny-1`

If the phone still shows the old version, close the app fully, reopen it, or clear the site data/cache once.


## v2 quick fix

- Calendar title changed to CLARA'S CALENDAR.
- Cache bumped to clara-bunny-v2 so phones should update on refresh/reopen.


## Calendar title fix

The calendar page title now says CLARA'S CALENDAR. Cache version bumped to clara-bunny-v4 so phones should refresh the update.
