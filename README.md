# Clara v55 Parent Carrot Hotfix

This fixes the manual `+5`, `+10`, `+50`, `-5`, `-10`, and `-50` carrot buttons when the app shows `Parent controls locked`.

## Upload to GitHub

Upload these files into the same folder as Clara's app:

- `clara-parent-carrot-fix.js`
- `sw.js`

Do not delete your existing `index.html`, `style.css`, `script.js`, Firebase files, or `clara-sync-bridge.js`.

## Edit index.html

Add the contents of `index-add-this-before-body.txt` just above `</body>`.

It must be after the normal `script.js` line and after the `clara-sync-bridge.js` line.

## Parent PIN

The default PIN in the snippet is:

`1234`

Change this line if you want a different PIN:

```html
window.CLARA_PARENT_PIN = "1234";
```

## How it works

- Tapping a carrot +/- button while locked asks for the parent PIN.
- After the PIN is accepted, parent controls unlock for 30 minutes.
- The button updates the carrot bank locally.
- It also calls `claraRealSync.pushNow()` if your v54 sync bridge is installed, so the change is pushed to Firebase.

## After upload

Everyone should open the GitHub/Netlify app link in Chrome once and refresh. If the home screen shortcut still shows the old version, delete and re-add the shortcut.
