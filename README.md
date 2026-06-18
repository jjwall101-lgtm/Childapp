# Clara App v53 Real Sync Hotfix

This package fixes the issue where every device says **sync connected** but nothing actually syncs.

The old green light was likely only proving Firebase loaded. This bridge proves sync properly by doing a real Firestore write/read, then syncing the app's localStorage state across devices that use the same family/sync code.

## Upload these files to GitHub

Upload these into the same folder as Clara's app:

- `clara-sync-bridge.js`
- `sw.js`

Do not delete your existing `index.html`, `style.css`, `script.js`, or `manifest.json`.

## Edit index.html

Add this just above `</body>`, after your normal `script.js` line:

```html
<script src="clara-sync-bridge.js?v=clara-v53-real-sync-20260618"></script>
```

Also change the file links to add the v53 cache buster:

```html
<link rel="manifest" href="manifest.json?v=clara-v53-real-sync">
<link rel="stylesheet" href="style.css?v=clara-v53-real-sync">
<script defer src="script.js?v=clara-v53-real-sync"></script>
```

## Important: all devices need the same family/sync code

If one device is using `clara-family` and another is using `family123`, both can show connected but they will not see the same data.

This bridge checks these localStorage keys for a shared code:

- `familyCode`
- `familyId`
- `syncCode`
- `claraFamilyCode`
- `claraSyncCode`
- `currentFamilyId`
- `currentFamilyCode`
- `activeFamilyId`
- `activeSyncCode`
- `parentFamilyCode`

If it cannot find one, it uses:

```text
clara-family
```

## Firestore rules for private testing

If the app says `Sync blocked`, your Firestore rules are probably blocking writes or reads.

Use the contents of `firestore-testing-rules.txt` temporarily while testing only.

## What the badge means

- `Testing real sync...` = bridge is checking Firebase properly.
- `Sync live: family-code` = Firestore write/read worked and the app is listening for updates.
- `Sync blocked: cannot save to Firebase` = Firestore write is blocked.
- `Sync blocked: cannot read Firebase` = Firestore listener/read is blocked.
- `Firebase Firestore SDK was not found` = the Firebase scripts/config are missing or loading after the bridge.

## After uploading

Ask everyone to:

1. Open the app link in Chrome, not the home-screen shortcut.
2. Refresh once.
3. Close and reopen Chrome.
4. Delete and re-add the home-screen shortcut if it still looks old.

