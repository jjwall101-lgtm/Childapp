# Clara v54 Force Same Family Code Sync Fix

Upload these files to the same GitHub folder as Clara's app:

- `clara-sync-bridge.js`
- `sw.js`

Then edit `index.html` and add the contents of `index-add-this-before-body.txt` just above `</body>`, after the normal `script.js` line.

## What changed from v53

v53 used `clara-family` only when no old code existed on the phone.

v54 actively overwrites the common localStorage family/sync code keys on every device, so everyone is forced to use the same Firebase document:

`clara-family`

## After upload

Everyone should open the app link in Chrome once, refresh it, then reopen the home-screen app. If it still looks stuck, delete and re-add the home-screen shortcut.

## How to change the shared code later

In `index.html`, change:

```html
window.CLARA_LOCKED_FAMILY_CODE = "clara-family";
```

to another shared code. Everyone must use the same code.
