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


## v5 repair

- Restored the original coin IDs/classes used by the JavaScript and CSS, while keeping all visible wording as carrots.
- This fixes the broken Carrot Bank layout and missing button styling.
- Cache version bumped to clara-bunny-v5.


## v7 child Carrot Bank update

- The full Carrot Bank is now visible on Clara's Child Home screen.
- Parent-only carrot add/remove buttons remain hidden in Child Mode.
- Cache version bumped to clara-bunny-v7.


## v12 Daily support tools

- Added Now / Next board.
- Added visual routine builder with tappable steps.
- Added Calm Corner support buttons.
- Added Who am I with today? home card using Clara's calendar.
- Added child reward request status list.
- Kept Clara pastel bunny theme, carrots, Firebase sync, and child Carrot Bank.


## v13 Home layout update

- Moved the full Carrot Bank into Clara's main top square on the Child Home screen.
- Hid the separate Carrot Bank card on Child Home to avoid duplication.
- Removed the "Who am I with today?" home card.
- Parent Mode keeps the normal Carrot Bank controls.


## v14 Single Carrot Bank fix

- Removed the duplicated carrot stat boxes and second bunny journey from Clara's Child Home top square.
- The Child Home top square now shows one full Carrot Bank only.


## v15 Home-only Carrot Bank fix

- The full top Carrot Bank now appears only on the Child Home page.
- Other tabs no longer show the full top Carrot Bank.
- Added a stronger JavaScript and CSS guard so the layout updates correctly when switching tabs.
- Bumped service worker registration to help phones refresh the update.


## v16 Consistent top layout

- Made the same compact Clara top layout appear on every child tab.
- Removed the large top Carrot Bank from every child tab.
- Kept the carrot/streak boxes and bunny journey visible across child tabs.
- Kept the full Carrot Bank controls available in Parent Mode.


## v17 Top Carrot Bank layout

- Added the full Carrot Bank into Clara's top square on every child tab.
- Removed the duplicate carrot/streak boxes and second journey from the top square.
- Kept the top square layout with Clara icon, Clara name, Child Mode, Carrot Bank, and bunny/carrot icons.
- Parent Mode still has the full Carrot Bank controls on the Home page.


## v18 Remove Today card

- Removed the Today section/card from under the navigation.
- Added a CSS safety rule so older cached HTML also hides it.


## v19 Calm Corner in top square

- Moved Calm Corner out of the Home page body and into Clara's main top square.
- Added a bunny help bubble saying "Help! I need to calm down."
- Kept the calm choice buttons in the top square.


## v20 Collapsed Calm Corner

- Calm Corner options are now hidden by default.
- Tapping the bunny help bubble opens the calm options.
- After Clara chooses an option, the choices collapse again.


## v21 Remove Now / Next

- Removed the Now / Next section from Clara's Home page.
- Removed the Parent Mode Now / Next editor panel.
- Added a CSS safety rule so older cached HTML also hides it.


## v22 Editable Routine tab

- Added a dedicated Routine tab.
- Moved Clara's routine out of the Home page into the Routine tab.
- Added a Parent Mode routine editor directly on the Routine tab.
- Removed the duplicate routine editor from the Parent page.
- Child Mode can tick routine steps; Parent Mode can edit the title and steps.


## v23 Routine editor back on Parent screen

- Kept the Routine tab for Clara to view and tick routine steps.
- Moved the routine editor back onto the Parent screen.
- Removed the routine editor from the Routine tab.
