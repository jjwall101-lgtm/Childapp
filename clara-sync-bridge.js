/*
  Clara App Real Sync Bridge v53
  Drop-in Firebase/Firestore sync helper for the Clara child/parent app.

  What this does:
  - Stops showing green unless Firebase can actually write/read/listen.
  - Syncs localStorage-backed app data between devices using the same family/sync code.
  - Forces a visible refresh after remote data lands so older UI code picks it up.

  Required:
  - Firebase app + Firestore compat SDK must be available as window.firebase OR
    window.CLARA_FIREBASE_CONFIG must be set before this file loads.
  - Add this script after your main app script, just before </body>.
*/
(function () {
  "use strict";

  const VERSION = "clara-v53-real-sync-20260618";
  const COLLECTION = window.CLARA_SYNC_COLLECTION || "claraAppSync";
  const DEFAULT_FAMILY_CODE = window.CLARA_DEFAULT_FAMILY_CODE || "clara-family";
  const AUTO_RELOAD = window.CLARA_SYNC_AUTO_RELOAD !== false;
  const RELOAD_DELAY_MS = Number(window.CLARA_SYNC_RELOAD_DELAY_MS || 700);

  const FAMILY_CODE_KEYS = [
    "familyCode",
    "familyId",
    "syncCode",
    "claraFamilyCode",
    "claraSyncCode",
    "currentFamilyId",
    "currentFamilyCode",
    "activeFamilyId",
    "activeSyncCode",
    "parentFamilyCode"
  ];

  const IGNORE_EXACT = new Set([
    "claraSyncClientId",
    "claraSyncLastHash",
    "claraSyncLastStatus",
    "claraSyncLastAppliedAt",
    "claraSyncLastRemoteUpdatedBy",
    "claraSyncReloadGuard",
    "firebase:previous_websocket_failure"
  ]);

  const IGNORE_PREFIXES = [
    "firebase:",
    "firestore/",
    "_grecaptcha",
    "debug_"
  ];

  let db = null;
  let docRef = null;
  let unsubscribe = null;
  let applyingRemote = false;
  let pushTimer = null;
  let lastLocalHash = "";
  let started = false;

  const clientId = getOrCreateClientId();

  function getOrCreateClientId() {
    try {
      let id = localStorage.getItem("claraSyncClientId");
      if (!id) {
        id = "client-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("claraSyncClientId", id);
      }
      return id;
    } catch (error) {
      return "client-memory-" + Math.random().toString(36).slice(2, 10);
    }
  }

  function normaliseFamilyCode(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || DEFAULT_FAMILY_CODE;
  }

  function getFamilyCode() {
    try {
      for (const key of FAMILY_CODE_KEYS) {
        const value = localStorage.getItem(key);
        if (value && String(value).trim()) return normaliseFamilyCode(value);
      }
    } catch (error) {}

    const fromWindow = window.CLARA_FAMILY_CODE || window.CLARA_SYNC_CODE || window.familyCode || window.syncCode;
    return normaliseFamilyCode(fromWindow || DEFAULT_FAMILY_CODE);
  }

  function shouldIgnoreKey(key) {
    if (!key) return true;
    if (IGNORE_EXACT.has(key)) return true;
    return IGNORE_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  function getLocalDataSnapshot() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || shouldIgnoreKey(key)) continue;
        data[key] = localStorage.getItem(key);
      }
    } catch (error) {
      console.warn("Clara sync: could not read localStorage", error);
    }
    return data;
  }

  function hashObject(obj) {
    try {
      return JSON.stringify(obj, Object.keys(obj).sort());
    } catch (error) {
      return String(Date.now());
    }
  }

  function setSyncStatus(kind, message) {
    const text = message || kind;
    try {
      localStorage.setItem("claraSyncLastStatus", kind + ": " + text);
    } catch (error) {}

    const selectors = [
      "#syncStatus",
      "#sync-status",
      "#firebaseStatus",
      "#firebase-status",
      "#connectionStatus",
      "#connection-status",
      "#syncBadge",
      "#sync-badge",
      ".sync-status",
      ".firebase-status",
      ".connection-status",
      "[data-sync-status]"
    ];

    const nodes = Array.from(document.querySelectorAll(selectors.join(",")));
    nodes.forEach((node) => {
      node.textContent = text;
      node.dataset.syncStatus = kind;
      node.classList.remove("sync-ok", "sync-warn", "sync-error", "sync-testing");
      node.classList.add(
        kind === "ok" ? "sync-ok" :
        kind === "warn" ? "sync-warn" :
        kind === "testing" ? "sync-testing" : "sync-error"
      );
      node.style.background = kind === "ok" ? "#dcfce7" : kind === "testing" ? "#dbeafe" : kind === "warn" ? "#fef3c7" : "#fee2e2";
      node.style.color = kind === "ok" ? "#166534" : kind === "testing" ? "#1e40af" : kind === "warn" ? "#92400e" : "#991b1b";
      node.style.border = "1px solid rgba(0,0,0,.08)";
    });

    if (nodes.length === 0) {
      ensureFloatingStatus(kind, text);
    }
  }

  function ensureFloatingStatus(kind, text) {
    let badge = document.getElementById("clara-real-sync-floating-status");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "clara-real-sync-floating-status";
      badge.setAttribute("data-sync-status", kind);
      badge.style.cssText = [
        "position:fixed",
        "right:12px",
        "bottom:12px",
        "z-index:99999",
        "font:600 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif",
        "padding:8px 10px",
        "border-radius:999px",
        "box-shadow:0 6px 18px rgba(0,0,0,.12)",
        "max-width:80vw"
      ].join(";");
      document.documentElement.appendChild(badge);
    }
    badge.textContent = text;
    badge.style.background = kind === "ok" ? "#dcfce7" : kind === "testing" ? "#dbeafe" : kind === "warn" ? "#fef3c7" : "#fee2e2";
    badge.style.color = kind === "ok" ? "#166534" : kind === "testing" ? "#1e40af" : kind === "warn" ? "#92400e" : "#991b1b";
    badge.style.border = "1px solid rgba(0,0,0,.08)";
  }

  function waitForFirebase(timeoutMs) {
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        if (window.firebase && typeof window.firebase.firestore === "function") {
          resolve(window.firebase);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Firebase Firestore SDK was not found on window.firebase"));
          return;
        }
        setTimeout(check, 150);
      };
      check();
    });
  }

  function initFirebaseIfNeeded(firebase) {
    if (firebase.apps && firebase.apps.length) return;
    const config = window.CLARA_FIREBASE_CONFIG || window.firebaseConfig || window.FIREBASE_CONFIG;
    if (config) {
      firebase.initializeApp(config);
      return;
    }
    throw new Error("Firebase is loaded but no app has been initialised. Expose config as window.CLARA_FIREBASE_CONFIG or initialise Firebase before clara-sync-bridge.js loads.");
  }

  async function realConnectionTest() {
    const familyCode = getFamilyCode();
    docRef = db.collection(COLLECTION).doc(familyCode);

    const pingRef = docRef.collection("_diagnostics").doc(clientId);
    await pingRef.set({
      version: VERSION,
      clientId,
      familyCode,
      userAgent: navigator.userAgent,
      lastPingAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const ping = await pingRef.get();
    if (!ping.exists) throw new Error("Firestore write/read test failed");

    setSyncStatus("ok", "Sync live: " + familyCode);
    return familyCode;
  }

  function applyRemoteData(remoteData, meta) {
    if (!remoteData || typeof remoteData !== "object") return;

    applyingRemote = true;
    try {
      Object.keys(remoteData).forEach((key) => {
        if (shouldIgnoreKey(key)) return;
        const value = remoteData[key];
        if (value === null || typeof value === "undefined") return;
        localStorage.setItem(key, String(value));
      });

      localStorage.setItem("claraSyncLastAppliedAt", new Date().toISOString());
      localStorage.setItem("claraSyncLastRemoteUpdatedBy", meta && meta.updatedBy ? meta.updatedBy : "unknown");
    } catch (error) {
      console.warn("Clara sync: could not apply remote data", error);
    } finally {
      applyingRemote = false;
    }

    try {
      window.dispatchEvent(new CustomEvent("claraSyncUpdated", { detail: { remoteData, meta } }));
      window.dispatchEvent(new Event("storage"));
    } catch (error) {}

    if (AUTO_RELOAD) scheduleReload();
  }

  function scheduleReload() {
    try {
      const guard = sessionStorage.getItem("claraSyncReloadGuard");
      const now = Date.now();
      if (guard && now - Number(guard) < 2500) return;
      sessionStorage.setItem("claraSyncReloadGuard", String(now));
    } catch (error) {}

    setTimeout(() => {
      try {
        window.location.reload();
      } catch (error) {}
    }, RELOAD_DELAY_MS);
  }

  async function pushLocalState(reason) {
    if (!docRef || applyingRemote) return;

    const data = getLocalDataSnapshot();
    const currentHash = hashObject(data);
    if (currentHash === lastLocalHash) return;
    lastLocalHash = currentHash;

    try {
      await docRef.set({
        version: VERSION,
        updatedBy: clientId,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAtClient: new Date().toISOString(),
        reason: reason || "local-change",
        data
      }, { merge: true });

      setSyncStatus("ok", "Sync live: " + getFamilyCode());
    } catch (error) {
      console.error("Clara sync: upload failed", error);
      setSyncStatus("error", "Sync blocked: cannot save to Firebase");
    }
  }

  function schedulePush(reason) {
    if (applyingRemote || !docRef) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushLocalState(reason), 350);
  }

  function patchLocalStorage() {
    if (window.__claraSyncStoragePatched) return;
    window.__claraSyncStoragePatched = true;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    Storage.prototype.setItem = function (key, value) {
      const result = originalSetItem.apply(this, arguments);
      if (this === localStorage && !shouldIgnoreKey(String(key))) schedulePush("localStorage.setItem:" + key);
      return result;
    };

    Storage.prototype.removeItem = function (key) {
      const result = originalRemoveItem.apply(this, arguments);
      if (this === localStorage && !shouldIgnoreKey(String(key))) schedulePush("localStorage.removeItem:" + key);
      return result;
    };

    Storage.prototype.clear = function () {
      const result = originalClear.apply(this, arguments);
      if (this === localStorage) schedulePush("localStorage.clear");
      return result;
    };
  }

  function addActivityFallbacks() {
    ["click", "change", "input", "keyup", "touchend"].forEach((eventName) => {
      document.addEventListener(eventName, () => schedulePush("user-activity:" + eventName), { passive: true, capture: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") schedulePush("page-hidden");
      if (document.visibilityState === "visible") pushLocalState("page-visible");
    });

    window.addEventListener("beforeunload", () => schedulePush("beforeunload"));
  }

  function startListener() {
    if (!docRef) return;
    if (unsubscribe) unsubscribe();

    unsubscribe = docRef.onSnapshot((snap) => {
      if (!snap.exists) {
        pushLocalState("first-device-created-sync-doc");
        return;
      }

      const remote = snap.data() || {};
      const remoteUpdatedBy = remote.updatedBy;
      const remoteData = remote.data || {};

      if (!remoteData || Object.keys(remoteData).length === 0) return;
      if (remoteUpdatedBy === clientId) return;

      const remoteHash = hashObject(remoteData);
      if (remoteHash === lastLocalHash) return;

      setSyncStatus("ok", "Sync received update");
      applyRemoteData(remoteData, {
        updatedBy: remoteUpdatedBy,
        updatedAtClient: remote.updatedAtClient,
        version: remote.version
      });
    }, (error) => {
      console.error("Clara sync: listener failed", error);
      setSyncStatus("error", "Sync blocked: cannot read Firebase");
    });
  }

  async function start() {
    if (started) return;
    started = true;
    setSyncStatus("testing", "Testing real sync...");

    try {
      const firebase = await waitForFirebase(10000);
      initFirebaseIfNeeded(firebase);
      db = firebase.firestore();

      await realConnectionTest();
      patchLocalStorage();
      addActivityFallbacks();
      startListener();
      await pushLocalState("startup");

      window.claraRealSync = {
        version: VERSION,
        clientId,
        collection: COLLECTION,
        getFamilyCode,
        pushNow: () => pushLocalState("manual-push"),
        status: () => localStorage.getItem("claraSyncLastStatus"),
        stop: () => { if (unsubscribe) unsubscribe(); }
      };
    } catch (error) {
      console.error("Clara real sync failed:", error);
      setSyncStatus("error", "Sync not working: " + error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
