# Firebase setup for Clara sync

This version syncs Clara's app between phones using Firebase Firestore.

The app is already set to use Clara's Firebase project in `script.js`:

```js
projectId: "childapp-af257"
```

## What to upload

Upload all files from this zip to the root of the Clara GitHub repository.

## Firestore rules

Use the included `firestore.rules` file in Firebase Console > Firestore Database > Rules.

The included rules are simple setup rules. They allow open read/write while testing. Once everything is working, lock it down with Firebase Authentication.

## Important

This copy uses its own localStorage keys and Firestore record:

```text
claraAppDataV1
clara-shared-family-app
```

That means it should not overwrite Cameron's local data on the same phone/browser.
