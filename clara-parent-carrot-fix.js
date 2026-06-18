/*
  Clara Parent Carrot Fix v55
  Drop-in fix for manual carrot +/- buttons not changing the reward bank.

  Load this AFTER the main app script and AFTER clara-sync-bridge.js.
*/
(function () {
  "use strict";

  const VERSION = "clara-v55-parent-carrots-20260618";
  const DEFAULT_PIN = "1234";
  const UNLOCK_MINUTES = Number(window.CLARA_PARENT_UNLOCK_MINUTES || 30);
  const DEFAULT_TARGET = Number(window.CLARA_CARROT_TARGET || 1000);

  const CARROT_KEYS = [
    "carrots",
    "carrotBank",
    "claraCarrots",
    "claraCarrotBank",
    "rewardCarrots",
    "totalCarrots",
    "parentCarrots",
    "coins",
    "coinBank",
    "claraCoins",
    "rewardCoins",
    "points",
    "rewardPoints"
  ];

  const PIN_KEYS = [
    "claraParentPin",
    "parentPin",
    "parentPIN",
    "parentCode",
    "claraPin",
    "claraPIN",
    "appPin",
    "appPIN",
    "pin"
  ];

  const UNLOCK_KEYS = [
    "claraParentControlsUnlocked",
    "parentControlsUnlocked",
    "parentUnlocked",
    "claraParentUnlocked",
    "isParentUnlocked"
  ];

  const LOCKED_TEXT = "Parent controls locked";
  const UNLOCKED_TEXT = "Parent controls unlocked";

  let chosenCarrotKey = null;

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function readTargetFromPage() {
    try {
      const text = document.body ? document.body.innerText : "";
      const match = text.match(/\/\s*(\d{2,6})/);
      if (match) return Number(match[1]) || DEFAULT_TARGET;
    } catch (e) {}
    return DEFAULT_TARGET;
  }

  function findBestCarrotKey() {
    if (chosenCarrotKey) return chosenCarrotKey;

    for (const key of CARROT_KEYS) {
      const value = safeGet(key);
      if (value !== null && value !== "" && !Number.isNaN(Number(value))) {
        chosenCarrotKey = key;
        return key;
      }
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const lower = key.toLowerCase();
        if (!(lower.includes("carrot") || lower.includes("coin") || lower.includes("reward") || lower.includes("point"))) continue;
        const value = localStorage.getItem(key);
        if (value !== null && value !== "" && !Number.isNaN(Number(value))) {
          chosenCarrotKey = key;
          return key;
        }
      }
    } catch (e) {}

    chosenCarrotKey = "claraCarrots";
    return chosenCarrotKey;
  }

  function readCarrotsFromDom() {
    try {
      const rewardArea = getRewardArea();
      const root = rewardArea || document.body;
      const text = root ? root.innerText : "";
      const match = text.match(/\b(\d{1,5})\s*\/\s*\d{2,6}\b/);
      if (match) return Number(match[1]);

      const nodes = Array.from((root || document).querySelectorAll("*"));
      const bigNumbers = nodes
        .map((node) => ({ node, text: (node.textContent || "").trim() }))
        .filter((item) => /^\d{1,5}$/.test(item.text))
        .map((item) => Number(item.text));
      if (bigNumbers.length) return bigNumbers[0];
    } catch (e) {}
    return 0;
  }

  function getCarrots() {
    const key = findBestCarrotKey();
    const stored = safeGet(key);
    if (stored !== null && stored !== "" && !Number.isNaN(Number(stored))) {
      return Number(stored);
    }

    for (const k of CARROT_KEYS) {
      const value = safeGet(k);
      if (value !== null && value !== "" && !Number.isNaN(Number(value))) return Number(value);
    }

    return readCarrotsFromDom();
  }

  function getParentPin() {
    if (window.CLARA_PARENT_PIN) return String(window.CLARA_PARENT_PIN);
    for (const key of PIN_KEYS) {
      const value = safeGet(key);
      if (value && String(value).trim()) return String(value).trim();
    }
    return DEFAULT_PIN;
  }

  function isUnlocked() {
    const until = Number(safeGet("claraParentUnlockedUntil") || 0);
    if (until && Date.now() < until) return true;

    for (const key of UNLOCK_KEYS) {
      const value = String(safeGet(key) || "").toLowerCase();
      if (["true", "1", "yes", "unlocked", "on"].includes(value)) return true;
    }

    if (window.CLARA_PARENT_UNLOCKED === true || window.parentControlsUnlocked === true) return true;
    return false;
  }

  function unlockParentControls() {
    const until = Date.now() + UNLOCK_MINUTES * 60 * 1000;
    safeSet("claraParentUnlockedUntil", until);
    UNLOCK_KEYS.forEach((key) => safeSet(key, "true"));
    try {
      window.CLARA_PARENT_UNLOCKED = true;
      window.parentControlsUnlocked = true;
    } catch (e) {}
    updateLockText(true);
    toast("Parent controls unlocked");
    return true;
  }

  function askToUnlock() {
    if (isUnlocked()) return true;
    const entered = window.prompt("Enter parent PIN to change carrots");
    if (entered === null) return false;
    if (String(entered).trim() === getParentPin()) return unlockParentControls();
    toast("Wrong PIN");
    return false;
  }

  function getRewardArea() {
    const all = Array.from(document.querySelectorAll("section, article, main, div, form"));
    return all.find((node) => {
      const text = (node.innerText || "").toLowerCase();
      return text.includes("carrot bank") || text.includes("next reward") || text.includes("parent controls locked") || text.includes("parent controls unlocked");
    }) || null;
  }

  function looksLikeCarrotButton(button) {
    if (!button) return null;
    const text = (button.textContent || "").replace(/\s+/g, "").trim();
    const match = text.match(/^([+-])(\d{1,4})$/);
    if (!match) return null;

    const amount = Number(match[2]) * (match[1] === "-" ? -1 : 1);
    const areaText = ((button.closest("section, article, main, div, form") || document.body).innerText || "").toLowerCase();
    const pageText = (document.body ? document.body.innerText : "").toLowerCase();

    if (
      areaText.includes("carrot") ||
      areaText.includes("reward") ||
      areaText.includes("parent controls") ||
      pageText.includes("carrot bank") ||
      pageText.includes("next reward")
    ) {
      return amount;
    }

    return null;
  }

  function writeCarrots(value, reason) {
    const target = readTargetFromPage();
    const next = clamp(value, 0, target);
    const key = findBestCarrotKey();

    // Write to the detected app key and the common aliases so older Clara builds pick it up after reload.
    safeSet(key, next);
    CARROT_KEYS.forEach((k) => safeSet(k, next));
    safeSet("claraLastCarrotUpdateReason", reason || "manual-parent-control");
    safeSet("claraLastCarrotUpdateAt", new Date().toISOString());

    updateCarrotDom(next, target);

    try {
      window.dispatchEvent(new CustomEvent("claraCarrotsChanged", { detail: { carrots: next, target, reason } }));
      window.dispatchEvent(new Event("storage"));
      document.dispatchEvent(new CustomEvent("claraCarrotsChanged", { detail: { carrots: next, target, reason } }));
    } catch (e) {}

    try {
      if (window.claraRealSync && typeof window.claraRealSync.pushNow === "function") {
        setTimeout(() => window.claraRealSync.pushNow(), 50);
      }
    } catch (e) {}

    toast("Carrots updated: " + next);
    return next;
  }

  function addCarrots(amount) {
    const current = getCarrots();
    const next = current + amount;
    return writeCarrots(next, "manual-button-" + amount);
  }

  function updateCarrotDom(value, target) {
    const root = getRewardArea() || document.body;
    if (!root) return;

    // Replace text like "50 / 1000" if present.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const original = node.nodeValue || "";
      const replaced = original.replace(/\b\d{1,5}\s*\/\s*\d{2,6}\b/, value + " / " + target);
      if (replaced !== original) node.nodeValue = replaced;
    });

    // Update obvious standalone number display in the carrot bank area.
    const elements = Array.from(root.querySelectorAll("*"));
    const oldNumber = String(getCarrots());
    for (const el of elements) {
      const text = (el.textContent || "").trim();
      if (/^\d{1,5}$/.test(text)) {
        const nearby = ((el.parentElement && el.parentElement.innerText) || root.innerText || "").toLowerCase();
        if (nearby.includes("carrot") || nearby.includes("/ " + target) || nearby.includes("reward")) {
          el.textContent = String(value);
          break;
        }
      }
    }

    // Update progress/meter elements where present.
    Array.from(root.querySelectorAll("progress, meter")).forEach((el) => {
      try {
        el.max = target;
        el.value = value;
      } catch (e) {}
    });

    // Update common progress/fill bars without relying on exact class names.
    const percent = target > 0 ? Math.max(0, Math.min(100, (value / target) * 100)) : 0;
    Array.from(root.querySelectorAll("[class*='fill'], [class*='progress'], [data-progress]")).forEach((el) => {
      const cls = String(el.className || "").toLowerCase();
      if (cls.includes("progress") || cls.includes("fill") || el.hasAttribute("data-progress")) {
        if (el !== root) {
          try { el.setAttribute("aria-valuenow", String(value)); } catch (e) {}
          if (el.children.length === 0 || cls.includes("fill")) {
            try { el.style.width = percent + "%"; } catch (e) {}
          }
        }
      }
    });
  }

  function updateLockText(unlocked) {
    const root = getRewardArea() || document.body;
    if (!root) return;
    Array.from(root.querySelectorAll("*"))
      .filter((el) => {
        const text = (el.textContent || "").trim().toLowerCase();
        return text === LOCKED_TEXT.toLowerCase() || text === UNLOCKED_TEXT.toLowerCase();
      })
      .forEach((el) => {
        el.textContent = unlocked ? UNLOCKED_TEXT : LOCKED_TEXT;
        el.dataset.parentControls = unlocked ? "unlocked" : "locked";
      });
  }

  function toast(message) {
    let box = document.getElementById("clara-parent-carrot-toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "clara-parent-carrot-toast";
      box.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:72px",
        "transform:translateX(-50%)",
        "z-index:999999",
        "background:#111827",
        "color:#fff",
        "font:700 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif",
        "padding:10px 14px",
        "border-radius:999px",
        "box-shadow:0 8px 22px rgba(0,0,0,.22)",
        "opacity:0",
        "transition:opacity .18s ease"
      ].join(";");
      document.documentElement.appendChild(box);
    }
    box.textContent = message;
    box.style.opacity = "1";
    clearTimeout(box.__timer);
    box.__timer = setTimeout(() => { box.style.opacity = "0"; }, 1800);
  }

  function handleClick(event) {
    const button = event.target && event.target.closest ? event.target.closest("button, [role='button'], .btn, .button") : null;

    if (button) {
      const amount = looksLikeCarrotButton(button);
      if (amount !== null) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!askToUnlock()) return;
        addCarrots(amount);
        return;
      }
    }

    const target = event.target && event.target.closest ? event.target.closest("button, [role='button'], .btn, .button, div, span, p") : null;
    if (target && (target.textContent || "").trim().toLowerCase() === LOCKED_TEXT.toLowerCase()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      askToUnlock();
    }
  }

  function start() {
    if (window.__claraParentCarrotFixV55) return;
    window.__claraParentCarrotFixV55 = true;

    document.addEventListener("click", handleClick, true);
    document.addEventListener("touchend", function () { setTimeout(() => updateLockText(isUnlocked()), 50); }, { passive: true, capture: true });

    setTimeout(() => {
      updateLockText(isUnlocked());
      const current = getCarrots();
      updateCarrotDom(current, readTargetFromPage());
    }, 250);

    window.claraParentCarrotFix = {
      version: VERSION,
      unlock: unlockParentControls,
      isUnlocked,
      getCarrots,
      setCarrots: (value) => writeCarrots(value, "manual-console-set"),
      addCarrots,
      key: () => findBestCarrotKey()
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
