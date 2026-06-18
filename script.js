import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDp3cpmMLQb-luKHlwBlqEFPcgSvZz6I_U",
    authDomain: "childapp-af257.firebaseapp.com",
    projectId: "childapp-af257",
    storageBucket: "childapp-af257.firebasestorage.app",
    messagingSenderId: "296730501575",
    appId: "1:296730501575:web:8f97dc9e61491b389fb9e2",
    measurementId: "G-F24ZSYYSQV"
  };

  const FAMILY_RECORD_ID = "clara-shared-family-app";
  const DATA_KEY = "claraAppDataV1";
  const PIN_KEY = "claraParentPinV1";
  const THEME_KEY = "claraSelectedTheme";
  const NOTE_AUTHOR_KEY = "claraParentNoteAuthorV1";
  const LAST_NOTIFICATION_KEY = "claraLastNotificationV2";
  const CHILD_MODE_KEY = "claraChildModeV1";
  const TIMER_STATE_KEY = "claraVisualTimerV1";
  const DEFAULT_PIN = "1234";

  const DEFAULT_CATEGORIES = [
    "General",
    "School",
    "Home",
    "Bedtime",
    "Toileting",
    "Kindness",
    "Listening",
    "Meltdown",
    "Shutdown",
    "Sensory overload",
    "Physical outburst",
    "Good transition"
  ];

  const DEFAULT_REWARDS = [
    { id: "reward-100-story", icon: "📖", name: "Choose bedtime story", cost: 100 },
    { id: "reward-250-treat", icon: "🍫", name: "Small treat", cost: 250 },
    { id: "reward-500-park", icon: "🛝", name: "Park trip", cost: 500 },
    { id: "reward-1000-prize", icon: "🎁", name: "Big prize", cost: 1000 }
  ];

  const DEFAULT_FAMILY_MEMBERS = [
    { id: "family-clara", icon: "👧", relationship: "Me", name: "Clara", branch: "Clara", description: "This is me." },
    { id: "family-mummy", icon: "👩", relationship: "Mummy", name: "Mummy", branch: "Parents", description: "Mummy loves me and helps me." },
    { id: "family-daddy", icon: "👨", relationship: "Daddy", name: "Daddy", branch: "Parents", description: "Daddy loves me and helps me." },
    { id: "family-joshua", icon: "👦", relationship: "Brother", name: "Joshua", branch: "Siblings", description: "My brother." },
    { id: "family-harriet", icon: "👶", relationship: "Sister", name: "Harriet", branch: "Siblings", description: "My baby sister." },
    { id: "family-nanny", icon: "👵", relationship: "Nanny", name: "Nanny", branch: "Other family", description: "My nanny." },
    { id: "family-grandad", icon: "👴", relationship: "Grandad", name: "Grandad", branch: "Other family", description: "My grandad." }
  ];

  const FEELINGS = [
    { id: "happy", label: "Happy", emoji: "😊", colour: "yellow" },
    { id: "sad", label: "Sad", emoji: "😢", colour: "blue" },
    { id: "angry", label: "Angry", emoji: "😠", colour: "red" },
    { id: "worried", label: "Worried", emoji: "😟", colour: "purple" },
    { id: "scared", label: "Scared", emoji: "😨", colour: "grey" },
    { id: "tired", label: "Tired", emoji: "😴", colour: "navy" },
    { id: "excited", label: "Excited", emoji: "🤩", colour: "orange" },
    { id: "calm", label: "Calm", emoji: "😌", colour: "green" },
    { id: "confused", label: "Confused", emoji: "😕", colour: "teal" },
    { id: "overwhelmed", label: "Overwhelmed", emoji: "🥴", colour: "pink" }
  ];


  const CALM_CHOICES = [
    { id: "breathing", icon: "🌬️", label: "Breathing" },
    { id: "quiet", icon: "🤫", label: "Quiet time" },
    { id: "cuddle", icon: "🤗", label: "Cuddle" },
    { id: "drink", icon: "🥤", label: "Drink" },
    { id: "sensory", icon: "🧸", label: "Sensory break" },
    { id: "talk", icon: "💬", label: "Talk to me" },
    { id: "not-sure", icon: "❔", label: "I don't know" }
  ];

  const DEFAULT_ROUTINE = {
    title: "Morning routine",
    steps: [
      { id: "routine-toilet", icon: "🚽", text: "Toilet" },
      { id: "routine-teeth", icon: "🪥", text: "Brush teeth" },
      { id: "routine-dressed", icon: "👗", text: "Get dressed" },
      { id: "routine-breakfast", icon: "🥣", text: "Breakfast" }
    ],
    doneStepIds: [],
    dateISO: ""
  };

  let app = null;
  let db = null;
  let auth = null;
  let appDoc = null;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let parentUnlocked = false;
  let childMode = localStorage.getItem(CHILD_MODE_KEY) !== "false";
  let notificationsReady = false;
  let serviceWorkerRegistration = null;
  let editingNoteId = "";
  let editingFamilyMemberId = "";
  let currentData = getLocalData();
  let selectedCalendarDate = getDateISO();
  let timerState = getLocalTimerState();
  let timerInterval = null;
  let timerFinishedAlertShown = false;

  const $ = id => document.getElementById(id);

  const elements = {
    syncStatus: $("syncStatus"),
    headerUnlockButton: $("headerUnlockButton"),
    modeStatusPill: $("modeStatusPill"),
    pinPadBackdrop: $("pinPadBackdrop"),
    pinPadText: $("pinPadText"),
    pinBoxRow: $("pinBoxRow"),
    pinKeypad: $("pinKeypad"),
    pinPadCancelButton: $("pinPadCancelButton"),
    pinPadConfirmButton: $("pinPadConfirmButton"),
    childCoinTotal: $("childCoinTotal"),
    childNextReward: $("childNextReward"),
    childTodayLevel: $("childTodayLevel"),
    childStreakCount: $("childStreakCount"),
    whoTodayCard: $("whoTodayCard"),
    nowText: $("nowText"),
    nextText: $("nextText"),
    nowNextNowInput: $("nowNextNowInput"),
    nowNextNextInput: $("nowNextNextInput"),
    saveNowNextButton: $("saveNowNextButton"),
    routineTitleDisplay: $("routineTitleDisplay"),
    childRoutineList: $("childRoutineList"),
    routineTitleInput: $("routineTitleInput"),
    routineStepsInput: $("routineStepsInput"),
    saveRoutineButton: $("saveRoutineButton"),
    resetRoutineButton: $("resetRoutineButton"),
    calmToggleButton: $("calmToggleButton"),
    calmChoiceList: $("calmChoiceList"),
    calmStatus: $("calmStatus"),
    parentCalmList: $("parentCalmList"),
    rewardRequestStatusList: $("rewardRequestStatusList"),
    feelingsGrid: $("feelingsGrid"),
    latestFeelingChild: $("latestFeelingChild"),
    parentDashboardGrid: $("parentDashboardGrid"),
    parentFeelingsList: $("parentFeelingsList"),
    rewardRequestList: $("rewardRequestList"),
    quickLogLevelSelect: $("quickLogLevelSelect"),
    quickLogCategorySelect: $("quickLogCategorySelect"),
    quickLogNoteText: $("quickLogNoteText"),
    saveQuickLogButton: $("saveQuickLogButton"),
    calendarGrid: $("calendarGrid"),
    calendarDayDetails: $("calendarDayDetails"),
    familyTodayCard: $("familyTodayCard"),
    calendarEditor: $("calendarEditor"),
    calendarDateInput: $("calendarDateInput"),
    calendarWhoInput: $("calendarWhoInput"),
    calendarIconSelect: $("calendarIconSelect"),
    calendarNoteInput: $("calendarNoteInput"),
    saveCalendarEntryButton: $("saveCalendarEntryButton"),
    deleteCalendarEntryButton: $("deleteCalendarEntryButton"),
    familyTreeDisplay: $("familyTreeDisplay"),
    familyTreeEditor: $("familyTreeEditor"),
    familyRelationshipInput: $("familyRelationshipInput"),
    familyNameInput: $("familyNameInput"),
    familyIconInput: $("familyIconInput"),
    familyBranchSelect: $("familyBranchSelect"),
    familyDescriptionInput: $("familyDescriptionInput"),
    addFamilyMemberButton: $("addFamilyMemberButton"),
    cancelFamilyEditButton: $("cancelFamilyEditButton"),
    familyMemberEditorList: $("familyMemberEditorList"),
    timerRing: $("timerRing"),
    timerCharacter: $("timerCharacter"),
    timerTime: $("timerTime"),
    timerStatus: $("timerStatus"),
    startTimerButton: $("startTimerButton"),
    pauseTimerButton: $("pauseTimerButton"),
    resetTimerButton: $("resetTimerButton"),
    customTimerMinutes: $("customTimerMinutes"),
    setCustomTimerButton: $("setCustomTimerButton"),
    parentPageUnlockButton: $("parentPageUnlockButton"),
    settingsUnlockButton: $("settingsUnlockButton"),
    lockStatus: $("lockStatus"),

    themeSelect: $("themeSelect"),

    heroCoinTotalMain: $("heroCoinTotalMain"),
    heroGoalDisplay: $("heroGoalDisplay"),
    heroCoinProgress: $("heroCoinProgress"),
    heroProgressCharacter: $("heroProgressCharacter"),
    heroFinishGoal: $("heroFinishGoal"),
    heroNextRewardText: $("heroNextRewardText"),

    coinTotalMain: $("coinTotalMain"),
    goalDisplay: $("goalDisplay"),
    finishGoal: $("finishGoal"),
    coinProgress: $("coinProgress"),
    progressCharacter: $("progressCharacter"),
    childProgressCharacter: $("childProgressCharacter"),
    childFinishGoal: $("childFinishGoal"),
    nextRewardText: $("nextRewardText"),

    deduct5Button: $("deduct5Button"),
    deduct10Button: $("deduct10Button"),
    deduct50Button: $("deduct50Button"),
    add5Button: $("add5Button"),
    add10Button: $("add10Button"),
    add50Button: $("add50Button"),
    resetCoinsButton: $("resetCoinsButton"),

    enableNotificationsButton: $("enableNotificationsButton"),
    settingsEnableNotificationsButton: $("settingsEnableNotificationsButton"),
    notificationStatus: $("notificationStatus"),
    settingsNotificationStatus: $("settingsNotificationStatus"),

    streakCount: $("streakCount"),
    bestStreak: $("bestStreak"),
    streakMessage: $("streakMessage"),

    todayLevelPill: $("todayLevelPill"),
    behaviourCategorySelect: $("behaviourCategorySelect"),
    behaviourReasonText: $("behaviourReasonText"),
    redLight: $("redLight"),
    amberLight: $("amberLight"),
    greenLight: $("greenLight"),
    redLabel: $("redLabel"),
    amberLabel: $("amberLabel"),
    greenLabel: $("greenLabel"),
    redCoinValue: $("redCoinValue"),
    greenCoinValue: $("greenCoinValue"),
    resetTodayButton: $("resetTodayButton"),

    treatCard: $("treatCard"),
    prizeDropIcon: $("prizeDropIcon"),
    prizeDropName: $("prizeDropName"),
    treatSubtitle: $("treatSubtitle"),
    treatResetNote: $("treatResetNote"),
    collectPrizeButton: $("collectPrizeButton"),

    rewardsList: $("rewardsList"),

    parentLockedPanel: $("parentLockedPanel"),
    parentUnlockedContent: $("parentUnlockedContent"),
    noteAuthor: $("noteAuthor"),
    noteCategorySelect: $("noteCategorySelect"),
    parentNoteText: $("parentNoteText"),
    addParentNoteButton: $("addParentNoteButton"),
    noteFilterSelect: $("noteFilterSelect"),
    parentNotesList: $("parentNotesList"),

    rewardIconInput: $("rewardIconInput"),
    rewardNameInput: $("rewardNameInput"),
    rewardCostInput: $("rewardCostInput"),
    addRewardButton: $("addRewardButton"),
    rewardEditorList: $("rewardEditorList"),

    newCategoryInput: $("newCategoryInput"),
    addCategoryButton: $("addCategoryButton"),
    categoryList: $("categoryList"),

    historyFilterSelect: $("historyFilterSelect"),
    historyList: $("historyList"),
    clearHistoryButton: $("clearHistoryButton"),

    reportSummary: $("reportSummary"),
    levelChart: $("levelChart"),
    coinChart: $("coinChart"),
    noteChart: $("noteChart"),
    copyWeeklyReportButton: $("copyWeeklyReportButton"),

    settingsLockedPanel: $("settingsLockedPanel"),
    settingsUnlockedContent: $("settingsUnlockedContent"),
    goalInput: $("goalInput"),
    greenCoinsInput: $("greenCoinsInput"),
    redCoinsInput: $("redCoinsInput"),
    saveCoinSettingsButton: $("saveCoinSettingsButton"),
    newPinInput: $("newPinInput"),
    changePinButton: $("changePinButton"),

    authEmailInput: $("authEmailInput"),
    authPasswordInput: $("authPasswordInput"),
    createAccountButton: $("createAccountButton"),
    signInButton: $("signInButton"),
    signOutButton: $("signOutButton"),
    addThisParentButton: $("addThisParentButton"),
    authStatus: $("authStatus"),

    exportDataButton: $("exportDataButton"),
    clearAllDataButton: $("clearAllDataButton")
  };

  function getDateISO(date = new Date()) {
    // Use the phone's local date, not UTC.
    // toISOString() can shift the app back a day after midnight in the UK,
    // which made the calendar show one day while selecting another.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(date = new Date()) {
    return date.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getDefaultData() {
    const today = getDateISO();

    return {
      coinTotal: 0,
      today: {
        date: today,
        level: "amber",
        category: "General",
        reason: ""
      },
      history: [],
      parentNotes: [],
      rewards: DEFAULT_REWARDS,
      rewardRequests: [],
      feelingLogs: [],
      familyCalendar: [],
      nowNext: {
        now: "Check my routine",
        next: "Choose how I feel",
        updatedAt: ""
      },
      routine: {
        ...DEFAULT_ROUTINE,
        dateISO: today
      },
      calmLogs: [],
      familyTree: DEFAULT_FAMILY_MEMBERS,
      categories: DEFAULT_CATEGORIES,
      streak: {
        current: 0,
        best: 0,
        lastGreenDate: ""
      },
      settings: {
        goal: 1000,
        greenCoins: 50,
        redCoins: 50,
        dailyResetLevel: "amber"
      },
      celebration: {
        active: false,
        id: "",
        theme: "bunny"
      },
      memberUids: {}
    };
  }

  function normalizeSettings(settings = {}) {
    return {
      goal: Math.max(50, Math.min(10000, Number(settings.goal) || 1000)),
      greenCoins: Math.max(0, Math.min(1000, Number(settings.greenCoins) || 50)),
      redCoins: Math.max(0, Math.min(1000, Number(settings.redCoins) || 50)),
      dailyResetLevel: ["red", "amber", "green"].includes(settings.dailyResetLevel) ? settings.dailyResetLevel : "amber"
    };
  }

  function normalizeRewards(rewards) {
    const source = Array.isArray(rewards) && rewards.length ? rewards : DEFAULT_REWARDS;

    return source
      .filter(reward => reward && typeof reward === "object")
      .map(reward => ({
        id: reward.id || `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        icon: String(reward.icon || "🎁").slice(0, 4),
        name: String(reward.name || "Reward").slice(0, 60),
        cost: Math.max(1, Math.min(10000, Number(reward.cost) || 100))
      }))
      .filter(reward => reward.name.trim())
      .slice(0, 50);
  }

  function normalizeRewardRequests(requests) {
    if (!Array.isArray(requests)) {
      return [];
    }

    return requests
      .filter(request => request && typeof request === "object")
      .map(request => ({
        id: request.id || `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rewardId: request.rewardId || "",
        rewardName: String(request.rewardName || "Reward").slice(0, 80),
        rewardIcon: String(request.rewardIcon || "🎁").slice(0, 4),
        rewardCost: Math.max(1, Number(request.rewardCost) || 1),
        status: ["pending", "approved", "rejected"].includes(request.status) ? request.status : "pending",
        requestedAt: request.requestedAt || "",
        requestedDateISO: request.requestedDateISO || "",
        resolvedAt: request.resolvedAt || "",
        resolvedBy: request.resolvedBy || ""
      }))
      .slice(0, 100);
  }

  function normalizeFeelingLogs(feelingLogs) {
    if (!Array.isArray(feelingLogs)) {
      return [];
    }

    return feelingLogs
      .filter(log => log && typeof log === "object")
      .map(log => ({
        id: log.id || `feeling-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        feelingId: log.feelingId || "",
        label: String(log.label || "Feeling").slice(0, 40),
        emoji: String(log.emoji || "🙂").slice(0, 4),
        colour: String(log.colour || "yellow").slice(0, 20),
        dateISO: log.dateISO || "",
        dateText: log.dateText || "",
        savedAt: log.savedAt || ""
      }))
      .filter(log => log.feelingId && log.label)
      .slice(0, 250);
  }

  function normalizeFamilyCalendar(calendarEntries) {
    if (!Array.isArray(calendarEntries)) {
      return [];
    }

    return calendarEntries
      .filter(entry => entry && typeof entry === "object")
      .map(entry => ({
        id: entry.id || `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dateISO: entry.dateISO || "",
        who: String(entry.who || "").slice(0, 50),
        icon: String(entry.icon || "⭐").slice(0, 8),
        note: String(entry.note || "").slice(0, 300),
        updatedAt: entry.updatedAt || ""
      }))
      .filter(entry => entry.dateISO && entry.who.trim())
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .slice(0, 365);
  }


  function normalizeNowNext(nowNext = {}) {
    return {
      now: String(nowNext.now || "Check my routine").slice(0, 80),
      next: String(nowNext.next || "Choose how I feel").slice(0, 80),
      updatedAt: nowNext.updatedAt || ""
    };
  }

  function splitIconAndText(line, index) {
    const clean = String(line || "").trim();
    if (!clean) {
      return null;
    }

    const first = Array.from(clean)[0] || "⭐";
    const rest = clean.slice(first.length).trim();
    const looksLikeIcon = /\p{Extended_Pictographic}/u.test(first);

    return {
      id: `routine-${index}-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "step"}`,
      icon: looksLikeIcon ? first : "⭐",
      text: looksLikeIcon && rest ? rest : clean
    };
  }

  function normalizeRoutine(routine = {}) {
    const today = getDateISO();
    const sourceSteps = Array.isArray(routine.steps) && routine.steps.length ? routine.steps : DEFAULT_ROUTINE.steps;
    const steps = sourceSteps
      .filter(step => step && typeof step === "object")
      .map((step, index) => ({
        id: step.id || `routine-${index}-${Math.random().toString(36).slice(2, 7)}`,
        icon: String(step.icon || "⭐").slice(0, 8),
        text: String(step.text || "Step").slice(0, 80)
      }))
      .filter(step => step.text.trim())
      .slice(0, 20);

    const sourceDone = Array.isArray(routine.doneStepIds) && routine.dateISO === today ? routine.doneStepIds : [];
    const stepIds = new Set(steps.map(step => step.id));

    return {
      title: String(routine.title || DEFAULT_ROUTINE.title).slice(0, 60),
      steps: steps.length ? steps : DEFAULT_ROUTINE.steps,
      doneStepIds: sourceDone.filter(id => stepIds.has(id)).slice(0, 20),
      dateISO: today
    };
  }

  function normalizeCalmLogs(logs) {
    if (!Array.isArray(logs)) {
      return [];
    }

    return logs
      .filter(log => log && typeof log === "object")
      .map(log => ({
        id: log.id || `calm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        choiceId: String(log.choiceId || "").slice(0, 40),
        label: String(log.label || "Calm choice").slice(0, 80),
        icon: String(log.icon || "💗").slice(0, 8),
        dateISO: log.dateISO || "",
        dateText: log.dateText || "",
        savedAt: log.savedAt || ""
      }))
      .filter(log => log.choiceId && log.label)
      .slice(0, 200);
  }

  function normalizeFamilyTree(familyTree) {
    const source = Array.isArray(familyTree) && familyTree.length ? familyTree : DEFAULT_FAMILY_MEMBERS;

    return source
      .filter(member => member && typeof member === "object")
      .map(member => ({
        id: member.id || `family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        icon: (() => {
          const rawIcon = String(member.icon || "⭐").slice(0, 8);
          const isClara = member.id === "family-clara" || String(member.branch || "") === "Clara" || (String(member.name || "").trim().toLowerCase() === "clara" && String(member.relationship || "").trim().toLowerCase() === "me");
          return isClara && rawIcon === "👦" ? "👧" : rawIcon;
        })(),
        relationship: String(member.relationship || "Family").slice(0, 40),
        name: String(member.name || "Family").slice(0, 60),
        branch: String(member.branch || "Other family").slice(0, 40),
        description: String(member.description || "").slice(0, 300)
      }))
      .filter(member => member.name.trim() && member.relationship.trim())
      .slice(0, 80);
  }

  function normalizeCategories(categories) {
    const list = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;
    const clean = list
      .map(category => String(category || "").trim())
      .filter(Boolean)
      .slice(0, 60);

    return [...new Set(clean.length ? clean : DEFAULT_CATEGORIES)];
  }

  function normalizeNotes(notes) {
    if (!Array.isArray(notes)) {
      return [];
    }

    return notes
      .filter(note => note && typeof note === "object")
      .map(note => ({
        id: note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author: String(note.author || "Parent").slice(0, 40),
        category: String(note.category || "General").slice(0, 40),
        text: String(note.text || "").slice(0, 1500),
        dateText: note.dateText || "",
        dateISO: note.dateISO || "",
        savedAt: note.savedAt || ""
      }))
      .filter(note => note.text.trim())
      .slice(0, 250);
  }

  function normalizeHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .filter(item => item && typeof item === "object")
      .map(item => ({
        id: item.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: item.type || "general",
        level: item.level || "",
        category: item.category || "",
        text: String(item.text || "").slice(0, 500),
        coinChange: Number(item.coinChange) || 0,
        coinsAfter: Math.max(0, Number(item.coinsAfter) || 0),
        dateISO: item.dateISO || getDateISO(),
        dateText: item.dateText || "",
        savedAt: item.savedAt || ""
      }))
      .slice(0, 500);
  }

  function normalizeData(data) {
    const defaults = getDefaultData();
    const settings = normalizeSettings(data?.settings || defaults.settings);
    const todayDate = data?.today?.date || getDateISO();

    return {
      coinTotal: Math.max(0, Number(data?.coinTotal) || 0),
      today: {
        date: todayDate,
        level: ["red", "amber", "green"].includes(data?.today?.level) ? data.today.level : "amber",
        category: data?.today?.category || "General",
        reason: data?.today?.reason || ""
      },
      history: normalizeHistory(data?.history),
      parentNotes: normalizeNotes(data?.parentNotes),
      rewards: normalizeRewards(data?.rewards),
      rewardRequests: normalizeRewardRequests(data?.rewardRequests),
      feelingLogs: normalizeFeelingLogs(data?.feelingLogs),
      familyCalendar: normalizeFamilyCalendar(data?.familyCalendar),
      nowNext: normalizeNowNext(data?.nowNext),
      routine: normalizeRoutine(data?.routine),
      calmLogs: normalizeCalmLogs(data?.calmLogs),
      familyTree: normalizeFamilyTree(data?.familyTree),
      categories: normalizeCategories(data?.categories),
      streak: {
        current: Math.max(0, Number(data?.streak?.current) || 0),
        best: Math.max(0, Number(data?.streak?.best) || 0),
        lastGreenDate: data?.streak?.lastGreenDate || ""
      },
      settings,
      celebration: {
        active: Boolean(data?.celebration?.active),
        id: data?.celebration?.id || "",
        theme: data?.celebration?.theme || getCurrentTheme()
      },
      memberUids: data?.memberUids && typeof data.memberUids === "object" ? data.memberUids : {}
    };
  }

  function getLocalData() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      return normalizeData(raw ? JSON.parse(raw) : getDefaultData());
    } catch (error) {
      console.error(error);
      return getDefaultData();
    }
  }

  function storeLocalData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(normalizeData(data)));
  }

  function getParentPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  }

  function askForParentPin(actionText = "continue") {
    return new Promise(resolve => {
      if (!elements.pinPadBackdrop || !elements.pinKeypad || !elements.pinBoxRow) {
        resolve(window.prompt(`Enter parent PIN to ${actionText}:`));
        return;
      }

      let enteredPin = "";
      const pinLength = Math.max(4, Math.min(8, getParentPin().length || 4));

      const renderBoxes = () => {
        elements.pinBoxRow.innerHTML = "";

        for (let index = 0; index < pinLength; index += 1) {
          const box = document.createElement("span");
          box.className = "pin-box";

          if (enteredPin.length > index) {
            box.classList.add("filled");
            box.textContent = "•";
          }

          if (enteredPin.length === index) {
            box.classList.add("active");
          }

          elements.pinBoxRow.appendChild(box);
        }

        if (enteredPin.length > pinLength) {
          const extra = document.createElement("span");
          extra.className = "pin-extra";
          extra.textContent = `+${enteredPin.length - pinLength}`;
          elements.pinBoxRow.appendChild(extra);
        }
      };

      const cleanup = () => {
        elements.pinPadBackdrop.hidden = true;
        elements.pinKeypad.removeEventListener("click", onKeypadClick);
        elements.pinPadCancelButton.removeEventListener("click", onCancel);
        elements.pinPadConfirmButton.removeEventListener("click", onConfirm);
      };

      const onConfirm = () => {
        const value = enteredPin;
        cleanup();
        resolve(value);
      };

      const onCancel = () => {
        cleanup();
        resolve(null);
      };

      const onKeypadClick = event => {
        const button = event.target.closest("button");

        if (!button) {
          return;
        }

        const digit = button.dataset.pinDigit;
        const action = button.dataset.pinAction;

        if (digit !== undefined && enteredPin.length < 12) {
          enteredPin += digit;
        }

        if (action === "delete") {
          enteredPin = enteredPin.slice(0, -1);
        }

        if (action === "clear") {
          enteredPin = "";
        }

        renderBoxes();
      };

      elements.pinPadText.textContent = `Enter parent PIN to ${actionText}`;
      elements.pinPadBackdrop.hidden = false;
      renderBoxes();

      elements.pinKeypad.addEventListener("click", onKeypadClick);
      elements.pinPadCancelButton.addEventListener("click", onCancel);
      elements.pinPadConfirmButton.addEventListener("click", onConfirm);
    });
  }

  async function verifyParentPin(actionText = "continue") {
    if (parentUnlocked) {
      return true;
    }

    const pin = await askForParentPin(actionText);

    if (pin === null) {
      return false;
    }

    if (pin === getParentPin()) {
      parentUnlocked = true;

      if (childMode) {
        childMode = false;
        localStorage.setItem(CHILD_MODE_KEY, "false");
      }

      updateParentLockDisplay();
      return true;
    }

    alert("Wrong PIN.");
    return false;
  }

  function getCurrentTheme() {
    return "bunny";
  }

  function setTheme(theme) {
    const safeTheme = "bunny";
    document.documentElement.dataset.theme = safeTheme;
    localStorage.setItem(THEME_KEY, safeTheme);

    if (elements.themeSelect) {
      elements.themeSelect.value = safeTheme;
    }

    updateProgressCharacter();
    updatePrizeDetails();
    updateTimerDisplay();
  }

  function applyDailyReset(data) {
    const today = getDateISO();
    const next = normalizeData(data);

    if (next.today.date !== today) {
      next.today = {
        date: today,
        level: next.settings.dailyResetLevel,
        category: "General",
        reason: ""
      };
    }

    return next;
  }

  async function saveData(data) {
    let next = applyDailyReset(normalizeData(data));

    if (currentUser?.uid) {
      next.memberUids = {
        ...(next.memberUids || {}),
        [currentUser.uid]: true
      };
    }

    currentData = next;
    storeLocalData(next);
    updateDisplay();

    if (!appDoc) {
      setSyncStatus("Local only", "offline");
      return;
    }

    try {
      await setDoc(appDoc, {
        ...next,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSyncStatus(navigator.onLine ? "Sync connected" : "Saved offline", navigator.onLine ? "online" : "offline");
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync failed - saved on this phone", "error");
    }
  }

  async function getLatestData() {
    if (!appDoc) {
      return normalizeData(currentData);
    }

    try {
      const snapshot = await getDoc(appDoc);

      if (snapshot.exists()) {
        return applyDailyReset(normalizeData(snapshot.data()));
      }
    } catch (error) {
      console.error(error);
    }

    return normalizeData(currentData);
  }

  function setSyncStatus(text, className = "") {
    if (!elements.syncStatus) {
      return;
    }

    elements.syncStatus.textContent = text;
    elements.syncStatus.className = `sync-pill ${className}`.trim();
  }

  function addHistoryEntry(data, entry) {
    const now = new Date();
    data.history = normalizeHistory(data.history);
    data.history.unshift({
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: entry.type || "general",
      level: entry.level || "",
      category: entry.category || "",
      text: entry.text || "",
      coinChange: Number(entry.coinChange) || 0,
      coinsAfter: Math.max(0, Number(entry.coinsAfter) || 0),
      dateISO: getDateISO(now),
      dateText: formatDateTime(now),
      savedAt: now.toISOString()
    });
    data.history = data.history.slice(0, 500);
  }

  function getPrizeDetails(theme = getCurrentTheme()) {
    return {
      icon: "🥕",
      name: "BUNNY PRIZE",
      subtitle: "Clara reached her carrot goal!"
    };
  }

  function startCelebrationIfNeeded(data) {
    const goal = data.settings.goal;

    if (data.coinTotal >= goal && !data.celebration.active) {
      data.celebration = {
        active: true,
        id: `celebration-${Date.now()}`,
        theme: getCurrentTheme()
      };

      addHistoryEntry(data, {
        type: "prize",
        level: "prize",
        text: `Prize reached at ${goal} carrots`,
        coinChange: 0,
        coinsAfter: data.coinTotal
      });

      showPhoneNotification("Prize reached!", {
        body: `Clara reached ${goal} carrots.`,
        tag: "clara-prize"
      }).catch(console.error);
    }
  }

  async function adjustCoins(amount) {
    if (childMode) {
      alert("Enter Parent Mode to change carrots.");
      return;
    }

    if (!await verifyParentPin("change carrots")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = Math.max(0, before + amount);
    const actualChange = data.coinTotal - before;

    if (actualChange === 0) {
      return;
    }

    addHistoryEntry(data, {
      type: "carrot",
      level: actualChange > 0 ? "gain" : "loss",
      text: actualChange > 0 ? `Manual carrot gain: +${actualChange}` : `Manual carrot loss: ${actualChange}`,
      coinChange: actualChange,
      coinsAfter: data.coinTotal
    });

    startCelebrationIfNeeded(data);
    await saveData(data);
  }

  async function setLevel(level) {
    if (childMode) {
      alert("Enter Parent Mode to change today's level.");
      return;
    }

    if (!await verifyParentPin("change today's level")) {
      return;
    }

    const data = await getLatestData();
    const today = getDateISO();

    if (data.today.date !== today) {
      data.today = {
        date: today,
        level: "amber",
        category: "General",
        reason: ""
      };
    }

    const previousLevel = data.today.level;

    if (previousLevel === level) {
      return;
    }

    if (level === "green" && previousLevel !== "amber") {
      alert("Go to amber before green.");
      return;
    }

    const category = elements.behaviourCategorySelect?.value || "General";
    const reason = elements.behaviourReasonText?.value.trim() || "";
    let coinChange = 0;
    let text = "";

    if (level === "green" && previousLevel === "amber") {
      coinChange = data.settings.greenCoins;
      text = `Moved to GREEN: +${coinChange} carrots`;
    } else if (level === "red" && previousLevel !== "red") {
      coinChange = -data.settings.redCoins;
      text = `Moved to RED: -${data.settings.redCoins} carrots`;
    } else if (level === "amber") {
      text = "Moved to AMBER";
    } else {
      text = `Moved to ${level.toUpperCase()}`;
    }

    const before = data.coinTotal;
    data.coinTotal = Math.max(0, before + coinChange);
    const actualChange = data.coinTotal - before;

    data.today = {
      date: today,
      level,
      category,
      reason
    };

    if (level === "green" && data.streak.lastGreenDate !== today) {
      data.streak.current += 1;
      data.streak.best = Math.max(data.streak.best, data.streak.current);
      data.streak.lastGreenDate = today;
    }

    if (level === "red") {
      data.streak.current = 0;
    }

    addHistoryEntry(data, {
      type: "level",
      level,
      category,
      text: reason ? `${text}. ${reason}` : text,
      coinChange: actualChange,
      coinsAfter: data.coinTotal
    });

    if (elements.behaviourReasonText) {
      elements.behaviourReasonText.value = "";
    }

    startCelebrationIfNeeded(data);
    await saveData(data);
  }

  async function resetToday() {
    if (!await verifyParentPin("reset today")) {
      return;
    }

    const data = await getLatestData();
    data.today = {
      date: getDateISO(),
      level: "amber",
      category: "General",
      reason: ""
    };

    addHistoryEntry(data, {
      type: "level",
      level: "amber",
      category: "General",
      text: "Today reset to amber",
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  async function resetCoins() {
    if (!await verifyParentPin("reset carrots")) {
      return;
    }

    if (!confirm("Reset carrots to 0?")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = 0;
    data.celebration = {
      active: false,
      id: "",
      theme: getCurrentTheme()
    };

    addHistoryEntry(data, {
      type: "carrot",
      level: "reset",
      text: "Carrots reset to 0",
      coinChange: -before,
      coinsAfter: 0
    });

    await saveData(data);
  }

  async function collectPrize() {
    if (!await verifyParentPin("collect the prize")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = 0;
    data.celebration = {
      active: false,
      id: "",
      theme: getCurrentTheme()
    };

    addHistoryEntry(data, {
      type: "reward",
      level: "prize",
      text: "Prize collected. Carrots reset to 0",
      coinChange: -before,
      coinsAfter: 0
    });

    await saveData(data);
  }

  async function logFeeling(feelingId) {
    const feeling = FEELINGS.find(item => item.id === feelingId);

    if (!feeling) {
      return;
    }

    const data = await getLatestData();
    const now = new Date();

    data.feelingLogs = normalizeFeelingLogs(data.feelingLogs);

    data.feelingLogs.unshift({
      id: `feeling-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      feelingId: feeling.id,
      label: feeling.label,
      emoji: feeling.emoji,
      colour: feeling.colour,
      dateISO: getDateISO(now),
      dateText: formatDateTime(now),
      savedAt: now.toISOString()
    });

    addHistoryEntry(data, {
      type: "feeling",
      level: "feeling",
      category: "Feeling",
      text: `Feeling recorded: ${feeling.emoji} ${feeling.label}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);

    await showPhoneNotification("Clara shared a feeling", {
      body: `Clara feels ${feeling.emoji} ${feeling.label}`,
      tag: `feeling-${feeling.id}-${getDateISO(now)}`
    });

    alert(`You chose: ${feeling.emoji} ${feeling.label}`);
  }

  function updateFeelingsPage() {
    const grid = elements.feelingsGrid;

    if (!grid) {
      return;
    }

    const latest = normalizeFeelingLogs(currentData.feelingLogs)[0];

    if (elements.latestFeelingChild) {
      if (latest && latest.dateISO === getDateISO()) {
        elements.latestFeelingChild.textContent = `Today: ${latest.emoji} ${latest.label}`;
      } else {
        elements.latestFeelingChild.textContent = "No feeling chosen yet today.";
      }
    }

    grid.innerHTML = "";

    FEELINGS.forEach(feeling => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `feeling-face feeling-${feeling.colour}`;
      button.setAttribute("aria-label", feeling.label);
      button.innerHTML = `
        <span class="feeling-emoji">${feeling.emoji}</span>
        <strong>${feeling.label}</strong>
      `;
      button.addEventListener("click", () => logFeeling(feeling.id));
      grid.appendChild(button);
    });
  }

  function updateParentFeelings() {
    const list = elements.parentFeelingsList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock Parent Mode to view feelings.</p>";
      return;
    }

    const logs = normalizeFeelingLogs(currentData.feelingLogs).slice(0, 20);

    list.innerHTML = "";

    if (!logs.length) {
      list.innerHTML = "<p class='empty-notes'>No feelings logged yet.</p>";
      return;
    }

    logs.forEach(log => {
      const item = document.createElement("article");
      item.className = "parent-feeling-item";
      item.innerHTML = `
        <div class="parent-feeling-icon">${log.emoji}</div>
        <div>
          <strong>${log.label}</strong>
          <span>${log.dateText || "No date"}</span>
        </div>
      `;
      list.appendChild(item);
    });
  }

  async function requestReward(rewardId) {
    const data = await getLatestData();
    data.rewardRequests = normalizeRewardRequests(data.rewardRequests);

    const reward = normalizeRewards(data.rewards).find(item => item.id === rewardId);

    if (!reward) {
      return;
    }

    if (data.coinTotal < reward.cost) {
      alert("Not enough carrots for this reward yet.");
      return;
    }

    const existingPending = data.rewardRequests.some(request => request.status === "pending" && request.rewardId === rewardId);

    if (existingPending) {
      alert("This reward has already been requested.");
      return;
    }

    const now = new Date();

    data.rewardRequests.unshift({
      id: `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      rewardId: reward.id,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      rewardCost: reward.cost,
      status: "pending",
      requestedAt: now.toISOString(),
      requestedDateISO: getDateISO(now),
      resolvedAt: "",
      resolvedBy: ""
    });

    addHistoryEntry(data, {
      type: "reward",
      level: "request",
      text: `Reward requested: ${reward.icon} ${reward.name}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);

    alert("Reward request sent to Parent Mode.");
  }

  async function approveRewardRequest(requestId) {
    if (!await verifyParentPin("approve this reward request")) {
      return;
    }

    const data = await getLatestData();
    data.rewardRequests = normalizeRewardRequests(data.rewardRequests);

    const request = data.rewardRequests.find(item => item.id === requestId && item.status === "pending");

    if (!request) {
      return;
    }

    if (data.coinTotal < request.rewardCost) {
      alert("There are not enough carrots left to approve this reward.");
      return;
    }

    if (!confirm(`Approve "${request.rewardName}" for ${request.rewardCost} carrots?`)) {
      return;
    }

    data.coinTotal = Math.max(0, data.coinTotal - request.rewardCost);

    data.rewardRequests = data.rewardRequests.map(item => {
      if (item.id !== requestId) {
        return item;
      }

      return {
        ...item,
        status: "approved",
        resolvedAt: new Date().toISOString(),
        resolvedBy: elements.noteAuthor?.value || "Parent"
      };
    });

    addHistoryEntry(data, {
      type: "reward",
      level: "approved",
      text: `Reward approved: ${request.rewardIcon} ${request.rewardName}`,
      coinChange: -request.rewardCost,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  async function rejectRewardRequest(requestId) {
    if (!await verifyParentPin("reject this reward request")) {
      return;
    }

    const data = await getLatestData();
    data.rewardRequests = normalizeRewardRequests(data.rewardRequests);

    const request = data.rewardRequests.find(item => item.id === requestId && item.status === "pending");

    if (!request) {
      return;
    }

    data.rewardRequests = data.rewardRequests.map(item => {
      if (item.id !== requestId) {
        return item;
      }

      return {
        ...item,
        status: "rejected",
        resolvedAt: new Date().toISOString(),
        resolvedBy: elements.noteAuthor?.value || "Parent"
      };
    });

    addHistoryEntry(data, {
      type: "reward",
      level: "rejected",
      text: `Reward rejected: ${request.rewardIcon} ${request.rewardName}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  async function saveQuickDailyLog() {
    if (!await verifyParentPin("save a daily log")) {
      return;
    }

    const level = elements.quickLogLevelSelect?.value || "amber";
    const category = elements.quickLogCategorySelect?.value || "General";
    const note = elements.quickLogNoteText?.value.trim() || "";

    const data = await getLatestData();
    const previousLevel = data.today.level;
    let coinChange = 0;

    if (level === "green" && previousLevel !== "green") {
      coinChange = data.settings.greenCoins;
    }

    if (level === "red" && previousLevel !== "red") {
      coinChange = -data.settings.redCoins;
    }

    const before = data.coinTotal;
    data.coinTotal = Math.max(0, before + coinChange);
    const actualChange = data.coinTotal - before;

    data.today = {
      date: getDateISO(),
      level,
      category,
      reason: note
    };

    if (level === "green" && data.streak.lastGreenDate !== getDateISO()) {
      data.streak.current += 1;
      data.streak.best = Math.max(data.streak.best, data.streak.current);
      data.streak.lastGreenDate = getDateISO();
    }

    if (level === "red") {
      data.streak.current = 0;
    }

    addHistoryEntry(data, {
      type: "level",
      level,
      category,
      text: note ? `Quick daily log: ${level.toUpperCase()} - ${note}` : `Quick daily log: ${level.toUpperCase()}`,
      coinChange: actualChange,
      coinsAfter: data.coinTotal
    });

    if (note) {
      const now = new Date();
      const author = elements.noteAuthor?.value.trim() || "Parent";
      data.parentNotes = normalizeNotes(data.parentNotes);
      data.parentNotes.unshift({
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author,
        category,
        text: note,
        dateText: formatDateTime(now),
        dateISO: getDateISO(now),
        savedAt: now.toISOString()
      });
    }

    elements.quickLogNoteText.value = "";

    startCelebrationIfNeeded(data);
    await saveData(data);
  }

  function updateChildDashboard() {
    if (!elements.childCoinTotal || !elements.childNextReward || !elements.childTodayLevel || !elements.childStreakCount) {
      return;
    }

    const total = currentData.coinTotal;
    const rewards = normalizeRewards(currentData.rewards).sort((a, b) => a.cost - b.cost);
    const next = rewards.find(reward => reward.cost > total) || rewards.find(reward => total >= reward.cost);

    elements.childCoinTotal.textContent = total;
    elements.childTodayLevel.textContent = currentData.today.level.toUpperCase();
    elements.childStreakCount.textContent = currentData.streak.current;

    const latestFeeling = normalizeFeelingLogs(currentData.feelingLogs)[0];

    if (latestFeeling && latestFeeling.dateISO === getDateISO()) {
      elements.childNextReward.innerHTML = `
        <span class="child-feeling-text">Today I feel</span>
        <span class="child-feeling-face feeling-${latestFeeling.colour}" aria-label="${latestFeeling.label}">
          <span>${latestFeeling.emoji}</span>
        </span>
      `;
      return;
    }

    if (!next) {
      elements.childNextReward.textContent = "No rewards yet.";
      return;
    }

    if (total >= next.cost) {
      elements.childNextReward.textContent = `${next.icon} ${next.name} is ready!`;
    } else {
      elements.childNextReward.textContent = `${next.icon} ${next.name}: ${next.cost - total} carrots to go`;
    }
  }

  function updateRewardRequests() {
    const list = elements.rewardRequestList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock Parent Mode to view reward requests.</p>";
      return;
    }

    const requests = normalizeRewardRequests(currentData.rewardRequests)
      .filter(request => request.status === "pending");

    list.innerHTML = "";

    if (!requests.length) {
      list.innerHTML = "<p class='empty-notes'>No reward requests yet.</p>";
      return;
    }

    requests.forEach(request => {
      const item = document.createElement("article");
      item.className = "reward-request-item";

      const info = document.createElement("div");
      info.className = "reward-request-info";
      info.innerHTML = `<strong>${request.rewardIcon} ${request.rewardName}</strong><span>${request.rewardCost} carrots</span>`;

      const actions = document.createElement("div");
      actions.className = "reward-request-actions";

      const approve = document.createElement("button");
      approve.type = "button";
      approve.textContent = "Approve";
      approve.addEventListener("click", () => approveRewardRequest(request.id));

      const reject = document.createElement("button");
      reject.type = "button";
      reject.textContent = "Reject";
      reject.className = "reject-request-button";
      reject.addEventListener("click", () => rejectRewardRequest(request.id));

      actions.appendChild(approve);
      actions.appendChild(reject);

      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function branchSortValue(branch) {
    const order = ["Clara", "Parents", "Siblings", "Mum's side", "Dad's side", "Special people", "Other family"];
    const index = order.indexOf(branch);
    return index === -1 ? order.length : index;
  }

  function updateFamilyTree() {
    const display = elements.familyTreeDisplay;

    if (!display) {
      return;
    }

    const members = normalizeFamilyTree(currentData.familyTree);
    const clara = members.find(member => member.branch === "Clara") || {
      icon: "👧",
      relationship: "Me",
      name: "Clara",
      description: "This is me."
    };

    const branches = {};
    members
      .filter(member => member.id !== clara.id && member.branch !== "Clara")
      .forEach(member => {
        const branch = member.branch || "Other family";
        branches[branch] = branches[branch] || [];
        branches[branch].push(member);
      });

    const branchNames = Object.keys(branches)
      .sort((a, b) => branchSortValue(a) - branchSortValue(b) || a.localeCompare(b));

    display.innerHTML = `
      <div class="family-tree-root">
        <div class="family-tree-person family-tree-main-person">
          <div class="family-person-icon">${escapeAttr(clara.icon)}</div>
          <div>
            <strong>${escapeAttr(clara.name)}</strong>
            <span>${escapeAttr(clara.relationship)}</span>
            <p>${escapeAttr(clara.description || "This is me.")}</p>
          </div>
        </div>
      </div>
      <div class="family-tree-branches" id="familyTreeBranches"></div>
    `;

    const branchWrap = display.querySelector("#familyTreeBranches");

    if (!branchNames.length) {
      branchWrap.innerHTML = "<p class='empty-notes'>No family members added yet.</p>";
    } else {
      branchNames.forEach(branchName => {
        const section = document.createElement("section");
        section.className = "family-tree-branch";

        const title = document.createElement("div");
        title.className = "family-branch-title";
        title.textContent = branchName;
        section.appendChild(title);

        branches[branchName].forEach(member => {
          const card = document.createElement("article");
          card.className = "family-tree-person";
          card.innerHTML = `
            <div class="family-person-icon">${escapeAttr(member.icon)}</div>
            <div>
              <strong>${escapeAttr(member.name)}</strong>
              <span>${escapeAttr(member.relationship)}</span>
              ${member.description ? `<p>${escapeAttr(member.description)}</p>` : ""}
            </div>
          `;
          section.appendChild(card);
        });

        branchWrap.appendChild(section);
      });
    }

    updateFamilyMemberEditor();
  }

  async function addOrUpdateFamilyMember() {
    if (!await verifyParentPin("edit the family tree")) {
      return;
    }

    const relationship = elements.familyRelationshipInput?.value.trim() || "";
    const name = elements.familyNameInput?.value.trim() || "";
    const icon = elements.familyIconInput?.value.trim() || "⭐";
    const branch = elements.familyBranchSelect?.value || "Other family";
    const description = elements.familyDescriptionInput?.value.trim() || "";

    if (!relationship || !name) {
      alert("Add a relationship and name first.");
      return;
    }

    const data = await getLatestData();
    const members = normalizeFamilyTree(data.familyTree);

    if (editingFamilyMemberId) {
      data.familyTree = members.map(member => {
        if (member.id !== editingFamilyMemberId) {
          return member;
        }

        return { ...member, relationship, name, icon, branch, description };
      });
    } else {
      data.familyTree = [
        ...members,
        {
          id: `family-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          relationship,
          name,
          icon,
          branch,
          description
        }
      ];
    }

    addHistoryEntry(data, {
      type: "family",
      level: "family",
      category: "Family tree",
      text: editingFamilyMemberId ? `Family tree updated: ${relationship} ${name}` : `Family member added: ${relationship} ${name}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    clearFamilyForm();
    await saveData(data);
  }

  function clearFamilyForm() {
    editingFamilyMemberId = "";

    if (elements.familyRelationshipInput) elements.familyRelationshipInput.value = "";
    if (elements.familyNameInput) elements.familyNameInput.value = "";
    if (elements.familyIconInput) elements.familyIconInput.value = "";
    if (elements.familyBranchSelect) elements.familyBranchSelect.value = "Parents";
    if (elements.familyDescriptionInput) elements.familyDescriptionInput.value = "";
    if (elements.addFamilyMemberButton) elements.addFamilyMemberButton.textContent = "Add Family Member";
    if (elements.cancelFamilyEditButton) elements.cancelFamilyEditButton.hidden = true;
  }

  async function editFamilyMember(memberId) {
    if (!await verifyParentPin("edit this family member")) {
      return;
    }

    const member = normalizeFamilyTree(currentData.familyTree).find(item => item.id === memberId);

    if (!member) {
      return;
    }

    editingFamilyMemberId = member.id;
    elements.familyRelationshipInput.value = member.relationship;
    elements.familyNameInput.value = member.name;
    elements.familyIconInput.value = member.icon;
    elements.familyBranchSelect.value = member.branch === "Clara" ? "Parents" : member.branch;
    elements.familyDescriptionInput.value = member.description || "";
    elements.addFamilyMemberButton.textContent = "Save Family Member";
    elements.cancelFamilyEditButton.hidden = false;
    switchPage("family");
  }

  async function deleteFamilyMember(memberId) {
    if (!await verifyParentPin("delete this family member")) {
      return;
    }

    const member = normalizeFamilyTree(currentData.familyTree).find(item => item.id === memberId);

    if (!member) {
      return;
    }

    if (member.branch === "Clara") {
      alert("Keep Clara as the middle of the family tree.");
      return;
    }

    if (!confirm(`Delete ${member.name} from the family tree?`)) {
      return;
    }

    const data = await getLatestData();
    data.familyTree = normalizeFamilyTree(data.familyTree).filter(item => item.id !== memberId);

    addHistoryEntry(data, {
      type: "family",
      level: "family",
      category: "Family tree",
      text: `Family member removed: ${member.relationship} ${member.name}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  function updateFamilyMemberEditor() {
    const list = elements.familyMemberEditorList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock Parent Mode to edit family members.</p>";
      return;
    }

    const members = normalizeFamilyTree(currentData.familyTree)
      .sort((a, b) => branchSortValue(a.branch) - branchSortValue(b.branch) || a.relationship.localeCompare(b.relationship));

    list.innerHTML = "";

    members.forEach(member => {
      const item = document.createElement("article");
      item.className = "family-member-editor-item";

      const info = document.createElement("div");
      info.className = "family-member-editor-info";
      info.innerHTML = `
        <span class="family-member-editor-icon">${escapeAttr(member.icon)}</span>
        <div>
          <strong>${escapeAttr(member.relationship)} - ${escapeAttr(member.name)}</strong>
          <span>${escapeAttr(member.branch)}</span>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "family-member-editor-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editFamilyMember(member.id));

      const del = document.createElement("button");
      del.type = "button";
      del.textContent = member.branch === "Clara" ? "Main" : "Delete";
      del.disabled = member.branch === "Clara";
      del.className = "delete-family-member-button";
      del.addEventListener("click", () => deleteFamilyMember(member.id));

      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }


  function getTodaysCalendarEntry() {
    const todayISO = getDateISO();
    return normalizeFamilyCalendar(currentData.familyCalendar).find(entry => entry.dateISO === todayISO) || null;
  }

  function updateWhoTodayCard() {
    if (!elements.whoTodayCard) {
      return;
    }

    const entry = getTodaysCalendarEntry();

    if (!entry) {
      elements.whoTodayCard.innerHTML = `
        <div class="who-today-icon">📅</div>
        <div>
          <strong>No plan added for today yet.</strong>
          <span>Ask a parent to add who Clara is with.</span>
        </div>
      `;
      return;
    }

    elements.whoTodayCard.innerHTML = `
      <div class="who-today-icon">${escapeAttr(entry.icon || "⭐")}</div>
      <div>
        <strong>Today I am with ${escapeAttr(entry.who)}</strong>
        <span>${escapeAttr(entry.note || "Tap Calendar to see more.")}</span>
      </div>
    `;
  }

  function updateNowNextTool() {
    const nowNext = normalizeNowNext(currentData.nowNext);

    if (elements.nowText) {
      elements.nowText.textContent = nowNext.now || "Check my routine";
    }

    if (elements.nextText) {
      elements.nextText.textContent = nowNext.next || "Choose how I feel";
    }

    if (elements.nowNextNowInput && document.activeElement !== elements.nowNextNowInput) {
      elements.nowNextNowInput.value = nowNext.now;
    }

    if (elements.nowNextNextInput && document.activeElement !== elements.nowNextNextInput) {
      elements.nowNextNextInput.value = nowNext.next;
    }
  }

  async function saveNowNext() {
    if (!await verifyParentPin("edit the Now / Next board")) {
      return;
    }

    const data = await getLatestData();
    data.nowNext = {
      now: elements.nowNextNowInput?.value.trim() || "Check my routine",
      next: elements.nowNextNextInput?.value.trim() || "Choose how I feel",
      updatedAt: new Date().toISOString()
    };

    addHistoryEntry(data, {
      type: "tool",
      level: "now-next",
      text: `Now / Next updated: ${data.nowNext.now} → ${data.nowNext.next}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  function updateRoutineTool() {
    const routine = normalizeRoutine(currentData.routine);

    if (elements.routineTitleDisplay) {
      const complete = routine.steps.length && routine.doneStepIds.length === routine.steps.length;
      elements.routineTitleDisplay.textContent = `${routine.title}${complete ? " - all done 💗" : ""}`;
    }

    if (elements.childRoutineList) {
      elements.childRoutineList.innerHTML = "";

      routine.steps.forEach(step => {
        const done = routine.doneStepIds.includes(step.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `routine-step-button${done ? " done" : ""}`;
        button.dataset.stepId = step.id;
        button.innerHTML = `
          <span class="routine-step-icon">${escapeAttr(step.icon)}</span>
          <span class="routine-step-text">${escapeAttr(step.text)}</span>
          <span class="routine-step-check">${done ? "✓" : ""}</span>
        `;
        button.addEventListener("click", () => toggleRoutineStep(step.id));
        elements.childRoutineList.appendChild(button);
      });
    }

    if (elements.routineTitleInput && document.activeElement !== elements.routineTitleInput) {
      elements.routineTitleInput.value = routine.title;
    }

    if (elements.routineStepsInput && document.activeElement !== elements.routineStepsInput) {
      elements.routineStepsInput.value = routine.steps.map(step => `${step.icon} ${step.text}`).join("\n");
    }
  }

  async function toggleRoutineStep(stepId) {
    const data = await getLatestData();
    const routine = normalizeRoutine(data.routine);
    const done = new Set(routine.doneStepIds);

    if (done.has(stepId)) {
      done.delete(stepId);
    } else {
      done.add(stepId);
    }

    routine.doneStepIds = [...done];
    routine.dateISO = getDateISO();
    data.routine = routine;

    await saveData(data);
  }

  async function saveRoutine() {
    if (!await verifyParentPin("edit Clara's routine")) {
      return;
    }

    const title = elements.routineTitleInput?.value.trim() || "Today's routine";
    const rawSteps = (elements.routineStepsInput?.value || "").split("\n");
    const steps = rawSteps
      .map((line, index) => splitIconAndText(line, index))
      .filter(Boolean)
      .slice(0, 20);

    if (!steps.length) {
      alert("Add at least one routine step.");
      return;
    }

    const data = await getLatestData();
    data.routine = {
      title,
      steps,
      doneStepIds: [],
      dateISO: getDateISO()
    };

    addHistoryEntry(data, {
      type: "tool",
      level: "routine",
      text: `Routine updated: ${title}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  async function resetRoutineTicks() {
    if (!await verifyParentPin("reset the routine ticks")) {
      return;
    }

    const data = await getLatestData();
    const routine = normalizeRoutine(data.routine);
    routine.doneStepIds = [];
    routine.dateISO = getDateISO();
    data.routine = routine;

    await saveData(data);
  }


  function setCalmOptionsOpen(isOpen) {
    const calmTool = document.querySelector(".hero-calm-tool");

    if (calmTool) {
      calmTool.classList.toggle("open", Boolean(isOpen));
    }

    if (elements.calmToggleButton) {
      elements.calmToggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    if (elements.calmChoiceList) {
      elements.calmChoiceList.hidden = !isOpen;
    }

    if (elements.calmStatus) {
      elements.calmStatus.hidden = !isOpen;
      if (!isOpen) {
        elements.calmStatus.textContent = "Tap something that might help right now.";
      }
    }
  }

  function toggleCalmOptions() {
    const calmTool = document.querySelector(".hero-calm-tool");
    const isOpen = calmTool?.classList.contains("open");
    setCalmOptionsOpen(!isOpen);
  }

  function updateCalmTool() {
    if (!elements.calmChoiceList) {
      return;
    }

    elements.calmChoiceList.innerHTML = "";

    CALM_CHOICES.forEach(choice => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calm-choice-button";
      button.dataset.calmChoice = choice.id;
      button.innerHTML = `<span>${choice.icon}</span><strong>${choice.label}</strong>`;
      button.addEventListener("click", () => logCalmChoice(choice.id));
      elements.calmChoiceList.appendChild(button);
    });
  }

  async function logCalmChoice(choiceId) {
    const choice = CALM_CHOICES.find(item => item.id === choiceId);

    if (!choice) {
      return;
    }

    const data = await getLatestData();
    data.calmLogs = normalizeCalmLogs(data.calmLogs);
    const now = new Date();

    data.calmLogs.unshift({
      id: `calm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      choiceId: choice.id,
      label: choice.label,
      icon: choice.icon,
      dateISO: getDateISO(now),
      dateText: formatDateTime(now),
      savedAt: now.toISOString()
    });

    data.calmLogs = data.calmLogs.slice(0, 200);

    addHistoryEntry(data, {
      type: "calm",
      level: choice.id,
      text: `Calm tool chosen: ${choice.icon} ${choice.label}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    if (elements.calmStatus) {
      elements.calmStatus.textContent = `${choice.icon} ${choice.label} sent to Parent Mode.`;
    }

    await saveData(data);
  }


  function updateParentCalmChoices() {
    const list = elements.parentCalmList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock Parent Mode to view calm choices.</p>";
      return;
    }

    const logs = normalizeCalmLogs(currentData.calmLogs).slice(0, 8);

    if (!logs.length) {
      list.innerHTML = "<p class='empty-notes'>No calm choices yet.</p>";
      return;
    }

    list.innerHTML = "";

    logs.forEach(log => {
      const item = document.createElement("article");
      item.className = "parent-calm-item";
      item.innerHTML = `
        <strong>${escapeAttr(log.icon)} ${escapeAttr(log.label)}</strong>
        <span>${escapeAttr(log.dateText || log.dateISO || "")}</span>
      `;
      list.appendChild(item);
    });
  }

  function updateRewardRequestStatus() {
    const list = elements.rewardRequestStatusList;

    if (!list) {
      return;
    }

    const requests = normalizeRewardRequests(currentData.rewardRequests).slice(0, 6);

    if (!requests.length) {
      list.innerHTML = "<p class='empty-notes'>No reward requests yet.</p>";
      return;
    }

    list.innerHTML = "";

    requests.forEach(request => {
      const item = document.createElement("article");
      item.className = `reward-request-status-item ${request.status}`;
      item.innerHTML = `
        <strong>${escapeAttr(request.rewardIcon)} ${escapeAttr(request.rewardName)}</strong>
        <span>${request.rewardCost} carrots</span>
        <small>${request.status === "pending" ? "Waiting for parent" : request.status === "approved" ? "Approved 💗" : "Not this time"}</small>
      `;
      list.appendChild(item);
    });
  }

  function updateParentDashboard() {
    const grid = elements.parentDashboardGrid;

    if (!grid) {
      return;
    }

    if (!parentUnlocked) {
      grid.innerHTML = "";
      return;
    }

    const pendingRequests = normalizeRewardRequests(currentData.rewardRequests)
      .filter(request => request.status === "pending").length;

    const todayHistory = normalizeHistory(currentData.history)
      .filter(item => item.dateISO === getDateISO());

    const greenLogs = todayHistory.filter(item => item.level === "green").length;
    const redLogs = todayHistory.filter(item => item.level === "red").length;
    const notesToday = normalizeNotes(currentData.parentNotes)
      .filter(note => note.dateISO === getDateISO()).length;

    const latestFeeling = normalizeFeelingLogs(currentData.feelingLogs)[0];
    const latestFeelingText = latestFeeling
      ? `${latestFeeling.emoji} ${latestFeeling.label}`
      : "None";

    grid.innerHTML = "";

    [
      ["Carrots", currentData.coinTotal],
      ["Today", currentData.today.level.toUpperCase()],
      ["Pending rewards", pendingRequests],
      ["Latest feeling", latestFeelingText],
      ["Notes today", notesToday],
      ["Green logs", greenLogs],
      ["Red logs", redLogs]
    ].forEach(([label, value]) => {
      const card = document.createElement("div");
      card.className = "dashboard-stat";
      card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
      grid.appendChild(card);
    });
  }

  function getCalendarEntry(dateISO) {
    return normalizeFamilyCalendar(currentData.familyCalendar).find(entry => entry.dateISO === dateISO) || null;
  }

  function formatCalendarDate(date) {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short"
    });
  }

  function buildCalendarDetailHtml(dateISO, entry) {
    const date = new Date(`${dateISO}T12:00:00`);
    const dateTitle = formatCalendarDate(date);

    if (entry) {
      const safeWho = escapeAttr(entry.who);
      const safeIcon = escapeAttr(entry.icon);
      const safeNote = entry.note ? escapeAttr(entry.note) : "No description added for this day.";

      return `
        <div class="calendar-detail-main selected-calendar-detail" data-selected-date="${dateISO}">
          <div class="calendar-detail-icon">${safeIcon}</div>
          <div>
            <strong>${dateTitle}</strong>
            <span>Clara is with ${safeWho}</span>
            <p class="calendar-selected-description"><b>Description:</b> ${safeNote}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="calendar-detail-main selected-calendar-detail" data-selected-date="${dateISO}">
        <div class="calendar-detail-icon">📅</div>
        <div>
          <strong>${dateTitle}</strong>
          <span>No plan has been added for this day yet.</span>
          <p class="calendar-selected-description"><b>Description:</b> ${parentUnlocked ? "Use the editor below to add who Clara is with and what is happening." : "Nothing has been added for Clara to see yet."}</p>
        </div>
      </div>
    `;
  }

  function updateCalendarEditorFields(dateISO, entry) {
    if (elements.calendarDateInput) {
      elements.calendarDateInput.value = dateISO;
    }

    if (elements.calendarWhoInput) {
      elements.calendarWhoInput.value = entry?.who || "";
    }

    if (elements.calendarIconSelect) {
      elements.calendarIconSelect.value = entry?.icon || "🏠";
    }

    if (elements.calendarNoteInput) {
      elements.calendarNoteInput.value = entry?.note || "";
    }
  }

  function selectCalendarDay(dateISO) {
    if (!dateISO) {
      dateISO = getDateISO();
    }

    selectedCalendarDate = dateISO;

    const entry = getCalendarEntry(dateISO);
    const selectedHtml = buildCalendarDetailHtml(dateISO, entry);

    document.querySelectorAll(".family-calendar-day").forEach(dayButton => {
      const isSelected = dayButton.dataset.date === dateISO;
      dayButton.classList.toggle("selected", isSelected);
      dayButton.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    updateCalendarEditorFields(dateISO, entry);

    if (elements.familyTodayCard) {
      elements.familyTodayCard.innerHTML = selectedHtml;
      elements.familyTodayCard.dataset.selectedDate = dateISO;
    }

    if (elements.calendarDayDetails) {
      elements.calendarDayDetails.innerHTML = selectedHtml;
      elements.calendarDayDetails.dataset.selectedDate = dateISO;
    }
  }

  function updateCalendar() {
    const grid = elements.calendarGrid;

    if (!grid) {
      return;
    }

    const entries = normalizeFamilyCalendar(currentData.familyCalendar);
    const today = new Date();
    const todayISO = getDateISO(today);
    const datesToShow = [];

    if (childMode) {
      // Child view stays simple: only today plus the next 6 days.
      for (let offset = 0; offset < 7; offset += 1) {
        datesToShow.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12));
      }
    } else {
      // Parent view shows the whole current calendar month.
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
        datesToShow.push(new Date(year, month, dayNumber, 12));
      }
    }

    grid.setAttribute("aria-label", childMode ? "Next seven days" : "Current month");
    grid.innerHTML = "";

    datesToShow.forEach(date => {
      const dateISO = getDateISO(date);
      const entry = entries.find(item => item.dateISO === dateISO);

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.date = dateISO;
      button.className = "calendar-day family-calendar-day";
      button.classList.toggle("today", dateISO === todayISO);
      button.classList.toggle("selected", dateISO === selectedCalendarDate);
      button.classList.toggle("has-plan", Boolean(entry));
      button.setAttribute("aria-pressed", dateISO === selectedCalendarDate ? "true" : "false");

      const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
      const day = date.getDate();
      const month = date.toLocaleDateString("en-GB", { month: "short" });

      button.innerHTML = `
        <span class="calendar-weekday">${weekday}</span>
        <strong>${day}</strong>
        <span class="calendar-month">${month}</span>
        <div class="calendar-person">
          <span class="calendar-person-icon">${entry?.icon || "—"}</span>
          <span class="calendar-person-name">${entry?.who || "No plan"}</span>
        </div>
      `;

      const chooseCalendarDay = event => {
        event.preventDefault();
        selectedCalendarDate = dateISO;
        selectCalendarDay(dateISO);
      };

      button.addEventListener("click", chooseCalendarDay);
      grid.appendChild(button);
    });

    const visibleDates = [...grid.querySelectorAll(".family-calendar-day")]
      .map(button => button.dataset.date);

    if (!visibleDates.includes(selectedCalendarDate)) {
      selectedCalendarDate = todayISO;
    }

    if (elements.calendarDateInput && !elements.calendarDateInput.value) {
      elements.calendarDateInput.value = selectedCalendarDate;
    }

    selectCalendarDay(selectedCalendarDate || todayISO);
  }

  async function saveCalendarEntry() {
    if (!await verifyParentPin("edit Clara's calendar")) {
      return;
    }

    const dateISO = elements.calendarDateInput?.value || "";
    const who = elements.calendarWhoInput?.value.trim() || "";
    const icon = elements.calendarIconSelect?.value || "⭐";
    const note = elements.calendarNoteInput?.value.trim() || "";

    if (!dateISO) {
      alert("Choose a day first.");
      return;
    }

    if (!who) {
      alert("Add who Clara is with first.");
      return;
    }

    const data = await getLatestData();
    const calendar = normalizeFamilyCalendar(data.familyCalendar).filter(entry => entry.dateISO !== dateISO);

    calendar.push({
      id: `calendar-${dateISO}`,
      dateISO,
      who,
      icon,
      note,
      updatedAt: new Date().toISOString()
    });

    data.familyCalendar = calendar;

    addHistoryEntry(data, {
      type: "calendar",
      level: "calendar",
      category: "Calendar",
      text: `Calendar updated: ${dateISO} - Clara is with ${who}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    selectedCalendarDate = dateISO;
    await saveData(data);
    selectCalendarDay(dateISO);
  }

  async function deleteCalendarEntry() {
    if (!await verifyParentPin("clear this calendar day")) {
      return;
    }

    const dateISO = elements.calendarDateInput?.value || "";

    if (!dateISO) {
      alert("Choose a day first.");
      return;
    }

    if (!confirm("Clear this calendar day?")) {
      return;
    }

    const data = await getLatestData();
    data.familyCalendar = normalizeFamilyCalendar(data.familyCalendar).filter(entry => entry.dateISO !== dateISO);

    addHistoryEntry(data, {
      type: "calendar",
      level: "calendar",
      category: "Calendar",
      text: `Calendar cleared: ${dateISO}`,
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    if (elements.calendarWhoInput) elements.calendarWhoInput.value = "";
    if (elements.calendarNoteInput) elements.calendarNoteInput.value = "";

    selectedCalendarDate = dateISO;
    await saveData(data);
    selectCalendarDay(dateISO);
  }

  async function claimReward(rewardId) {
    if (!await verifyParentPin("claim this reward")) {
      return;
    }

    const data = await getLatestData();
    const reward = normalizeRewards(data.rewards).find(item => item.id === rewardId);

    if (!reward) {
      return;
    }

    if (data.coinTotal < reward.cost) {
      alert("Not enough carrots for this reward yet.");
      return;
    }

    if (!confirm(`Claim "${reward.name}" for ${reward.cost} carrots?`)) {
      return;
    }

    data.coinTotal -= reward.cost;

    addHistoryEntry(data, {
      type: "reward",
      level: "claimed",
      text: `Reward claimed: ${reward.icon} ${reward.name}`,
      coinChange: -reward.cost,
      coinsAfter: data.coinTotal
    });

    await saveData(data);

    showPhoneNotification("Reward claimed", {
      body: `${reward.name} claimed for ${reward.cost} carrots.`,
      tag: `reward-${rewardId}`
    }).catch(console.error);
  }

  async function addReward() {
    if (!await verifyParentPin("add a reward")) {
      return;
    }

    const icon = elements.rewardIconInput?.value.trim() || "🎁";
    const name = elements.rewardNameInput?.value.trim() || "";
    const cost = Math.round(Number(elements.rewardCostInput?.value) || 0);

    if (!name) {
      alert("Add a reward name first.");
      return;
    }

    if (cost < 1) {
      alert("Add a valid carrot cost.");
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards);
    data.rewards.push({
      id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      icon,
      name,
      cost: Math.max(1, Math.min(10000, cost))
    });

    elements.rewardIconInput.value = "";
    elements.rewardNameInput.value = "";
    elements.rewardCostInput.value = "";

    await saveData(data);
  }

  async function saveReward(rewardId) {
    if (!await verifyParentPin("edit this reward")) {
      return;
    }

    const row = document.querySelector(`[data-reward-editor-id="${rewardId}"]`);

    if (!row) {
      return;
    }

    const icon = row.querySelector(".reward-edit-icon").value.trim() || "🎁";
    const name = row.querySelector(".reward-edit-name").value.trim();
    const cost = Math.round(Number(row.querySelector(".reward-edit-cost").value) || 0);

    if (!name || cost < 1) {
      alert("Reward needs a name and valid cost.");
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards).map(reward => {
      if (reward.id !== rewardId) {
        return reward;
      }

      return {
        ...reward,
        icon,
        name,
        cost: Math.max(1, Math.min(10000, cost))
      };
    });

    await saveData(data);
  }

  async function deleteReward(rewardId) {
    if (!await verifyParentPin("delete this reward")) {
      return;
    }

    if (!confirm("Delete this reward?")) {
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards).filter(reward => reward.id !== rewardId);
    await saveData(data);
  }

  async function addOrUpdateNote() {
    if (!await verifyParentPin("add a parent note")) {
      return;
    }

    const author = elements.noteAuthor?.value.trim() || "";
    const category = elements.noteCategorySelect?.value || "General";
    const text = elements.parentNoteText?.value.trim() || "";

    if (!author) {
      alert("Add who wrote the note first.");
      return;
    }

    if (!text) {
      alert("Write a note first.");
      return;
    }

    localStorage.setItem(NOTE_AUTHOR_KEY, author);

    const data = await getLatestData();
    data.parentNotes = normalizeNotes(data.parentNotes);

    if (editingNoteId) {
      data.parentNotes = data.parentNotes.map(note => {
        if (note.id !== editingNoteId) {
          return note;
        }

        return {
          ...note,
          author,
          category,
          text
        };
      });
      editingNoteId = "";
      elements.addParentNoteButton.textContent = "Add Note";
    } else {
      const now = new Date();
      data.parentNotes.unshift({
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author,
        category,
        text,
        dateText: formatDateTime(now),
        dateISO: getDateISO(now),
        savedAt: now.toISOString()
      });

      addHistoryEntry(data, {
        type: "note",
        level: "note",
        category,
        text: `Parent note added by ${author}: ${text.slice(0, 120)}`,
        coinChange: 0,
        coinsAfter: data.coinTotal
      });
    }

    elements.parentNoteText.value = "";
    await saveData(data);
  }

  async function editNote(noteId) {
    if (!await verifyParentPin("edit this note")) {
      return;
    }

    const note = currentData.parentNotes.find(item => item.id === noteId);

    if (!note) {
      return;
    }

    editingNoteId = noteId;
    elements.noteAuthor.value = note.author;
    elements.noteCategorySelect.value = note.category || "General";
    elements.parentNoteText.value = note.text;
    elements.addParentNoteButton.textContent = "Save Note";
    switchPage("parent");
  }

  async function deleteNote(noteId) {
    if (!await verifyParentPin("delete this note")) {
      return;
    }

    if (!confirm("Delete this parent note?")) {
      return;
    }

    const data = await getLatestData();
    data.parentNotes = normalizeNotes(data.parentNotes).filter(note => note.id !== noteId);
    await saveData(data);
  }

  async function addCategory() {
    if (!await verifyParentPin("add a category")) {
      return;
    }

    const value = elements.newCategoryInput?.value.trim();

    if (!value) {
      return;
    }

    const data = await getLatestData();
    data.categories = normalizeCategories([...normalizeCategories(data.categories), value]);
    elements.newCategoryInput.value = "";
    await saveData(data);
  }

  async function deleteCategory(category) {
    if (!await verifyParentPin("delete this category")) {
      return;
    }

    if (DEFAULT_CATEGORIES.includes(category)) {
      alert("Default categories are kept so reports stay consistent.");
      return;
    }

    const data = await getLatestData();
    data.categories = normalizeCategories(data.categories).filter(item => item !== category);
    await saveData(data);
  }

  async function saveCoinSettings() {
    if (!await verifyParentPin("save settings")) {
      return;
    }

    const data = await getLatestData();
    data.settings = normalizeSettings({
      goal: Number(elements.goalInput.value),
      greenCoins: Number(elements.greenCoinsInput.value),
      redCoins: Number(elements.redCoinsInput.value),
      dailyResetLevel: "amber"
    });

    await saveData(data);
  }

  async function changePin() {
    if (!await verifyParentPin("change the PIN")) {
      return;
    }

    const newPin = elements.newPinInput?.value.trim() || "";

    if (newPin.length < 3) {
      alert("Use at least 3 numbers.");
      return;
    }

    localStorage.setItem(PIN_KEY, newPin);
    elements.newPinInput.value = "";
    alert("Parent PIN changed on this phone.");
  }

  async function clearHistory() {
    if (!await verifyParentPin("clear history")) {
      return;
    }

    if (!confirm("Clear all history?")) {
      return;
    }

    const data = await getLatestData();
    data.history = [];
    await saveData(data);
  }

  async function clearAllData() {
    if (!await verifyParentPin("clear all data")) {
      return;
    }

    if (!confirm("This clears carrots, rewards, notes, history and settings. Are you sure?")) {
      return;
    }

    await saveData(getDefaultData());
  }

  async function exportData() {
    if (!await verifyParentPin("export data")) {
      return;
    }

    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clara-app-export-${getDateISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

 
  function getDefaultTimerState() {
    return {
      durationSeconds: 300,
      remainingSeconds: 300,
      running: false,
      endTime: 0
    };
  }

  function normalizeTimerState(state = {}) {
    const duration = Math.max(60, Math.min(7200, Math.round(Number(state.durationSeconds) || 300)));
    let remaining = Math.max(0, Math.min(duration, Math.round(Number(state.remainingSeconds) || duration)));
    const running = Boolean(state.running);
    const endTime = Math.max(0, Number(state.endTime) || 0);

    if (running && endTime) {
      remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    }

    return {
      durationSeconds: duration,
      remainingSeconds: Math.min(duration, remaining),
      running: running && remaining > 0,
      endTime: running && remaining > 0 ? endTime : 0
    };
  }

  function getLocalTimerState() {
    try {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      return normalizeTimerState(raw ? JSON.parse(raw) : getDefaultTimerState());
    } catch (error) {
      console.error(error);
      return getDefaultTimerState();
    }
  }

  function storeLocalTimerState() {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(normalizeTimerState(timerState)));
  }

  function formatTimerTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getTimerCharacter() {
    return "🐰";
  }

  function updateTimerFromClock() {
    if (!timerState.running) {
      return false;
    }

    const remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    timerState.remainingSeconds = remaining;

    if (remaining <= 0) {
      timerState.running = false;
      timerState.endTime = 0;
      storeLocalTimerState();
      return true;
    }

    storeLocalTimerState();
    return false;
  }

  function updateTimerDisplay() {
    if (!elements.timerTime || !elements.timerRing) {
      return;
    }

    timerState = normalizeTimerState(timerState);

    if (timerState.running) {
      updateTimerFromClock();
    }

    const duration = Math.max(60, timerState.durationSeconds);
    const remaining = Math.max(0, timerState.remainingSeconds);
    const usedPercent = Math.max(0, Math.min(100, ((duration - remaining) / duration) * 100));
    const leftPercent = Math.max(0, 100 - usedPercent);

    elements.timerTime.textContent = formatTimerTime(remaining);
    elements.timerRing.style.background = `conic-gradient(var(--theme-accent) 0 ${leftPercent}%, rgba(255,255,255,0.72) ${leftPercent}% 100%)`;

    if (elements.timerCharacter) {
      elements.timerCharacter.textContent = getTimerCharacter();
    }

    if (elements.timerStatus) {
      if (timerState.running) {
        elements.timerStatus.textContent = "Timer running";
      } else if (remaining === 0) {
        elements.timerStatus.textContent = "Finished";
      } else if (remaining < duration) {
        elements.timerStatus.textContent = "Paused";
      } else {
        elements.timerStatus.textContent = "Ready";
      }
    }

    if (elements.startTimerButton) {
      elements.startTimerButton.disabled = timerState.running;
      elements.startTimerButton.textContent = remaining === 0 ? "Start Again" : "Start";
    }

    if (elements.pauseTimerButton) {
      elements.pauseTimerButton.disabled = !timerState.running;
    }

    document.querySelectorAll("[data-timer-minutes]").forEach(button => {
      const seconds = Math.round(Number(button.dataset.timerMinutes) * 60);
      button.classList.toggle("active", seconds === duration && !timerState.running);
    });
  }

  function startTimerTick() {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    timerInterval = window.setInterval(() => {
      const finished = updateTimerFromClock();
      updateTimerDisplay();

      if (finished) {
        finishTimer();
      }
    }, 500);
  }

  function stopTimerTick() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setTimerDuration(minutes) {
    const duration = Math.max(60, Math.min(7200, Math.round(Number(minutes) * 60 || 300)));
    timerState = {
      durationSeconds: duration,
      remainingSeconds: duration,
      running: false,
      endTime: 0
    };
    timerFinishedAlertShown = false;
    stopTimerTick();
    storeLocalTimerState();
    updateTimerDisplay();
  }

  function startVisualTimer() {
    timerState = normalizeTimerState(timerState);

    if (timerState.remainingSeconds <= 0) {
      timerState.remainingSeconds = timerState.durationSeconds;
    }

    timerState.running = true;
    timerState.endTime = Date.now() + (timerState.remainingSeconds * 1000);
    timerFinishedAlertShown = false;
    storeLocalTimerState();
    startTimerTick();
    updateTimerDisplay();
  }

  function pauseVisualTimer() {
    updateTimerFromClock();
    timerState.running = false;
    timerState.endTime = 0;
    storeLocalTimerState();
    stopTimerTick();
    updateTimerDisplay();
  }

  function resetVisualTimer() {
    timerState = normalizeTimerState(timerState);
    timerState.running = false;
    timerState.endTime = 0;
    timerState.remainingSeconds = timerState.durationSeconds;
    timerFinishedAlertShown = false;
    storeLocalTimerState();
    stopTimerTick();
    updateTimerDisplay();
  }

  function finishTimer() {
    stopTimerTick();
    timerState = normalizeTimerState({
      ...timerState,
      remainingSeconds: 0,
      running: false,
      endTime: 0
    });
    storeLocalTimerState();
    updateTimerDisplay();

    if (navigator.vibrate) {
      navigator.vibrate([250, 120, 250, 120, 450]);
    }

    showPhoneNotification("Timer finished", {
      body: "Clara's timer has finished.",
      tag: "clara-timer"
    }).catch(console.error);

    if (!timerFinishedAlertShown) {
      timerFinishedAlertShown = true;
      window.setTimeout(() => alert("Timer finished!"), 50);
    }
  }

  function setCustomTimerDuration() {
    const minutes = Math.round(Number(elements.customTimerMinutes?.value) || 0);

    if (minutes < 1 || minutes > 120) {
      alert("Choose between 1 and 120 minutes.");
      return;
    }

    setTimerDuration(minutes);

    if (elements.customTimerMinutes) {
      elements.customTimerMinutes.value = "";
    }
  }

  function switchPage(page) {
    if (childMode && !["home", "feelings", "rewards", "calendar", "timer", "family"].includes(page)) {
      page = "home";
    }

    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle("active", section.id === `page-${page}`);
    });

    document.body.dataset.activePage = page;
    updateHeroHomeLayout();

    document.querySelectorAll(".nav-button").forEach(button => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateParentLockDisplay() {
    const locked = !parentUnlocked;

    document.body.classList.toggle("child-mode", childMode);
    document.body.classList.toggle("parent-mode", !childMode);

    if (childMode) {
      parentUnlocked = false;
    }

    document.querySelectorAll(".nav-button").forEach(button => {
      const parentOnlyPage = !["home", "feelings", "rewards", "calendar", "timer", "family"].includes(button.dataset.page);
      button.hidden = childMode && parentOnlyPage;
    });

    if (elements.modeStatusPill) {
      elements.modeStatusPill.textContent = childMode ? "Child Mode" : "Parent Mode";
    }

    if (elements.lockStatus) {
      elements.lockStatus.textContent = childMode
        ? "Child Mode: parent controls hidden"
        : parentUnlocked
          ? "Parent controls unlocked"
          : "Parent controls locked";
    }

    if (elements.headerUnlockButton) {
      elements.headerUnlockButton.textContent = childMode ? "Parent Mode" : "Back to Child Mode";
    }

    if (elements.parentLockedPanel) {
      elements.parentLockedPanel.hidden = parentUnlocked;
    }

    if (elements.parentUnlockedContent) {
      elements.parentUnlockedContent.hidden = locked;
    }

    if (elements.settingsLockedPanel) {
      elements.settingsLockedPanel.hidden = parentUnlocked;
    }

    if (elements.settingsUnlockedContent) {
      elements.settingsUnlockedContent.hidden = locked;
    }

    updateParentOnlyButtons();
    updateParentNotes();
    updateRewardEditor();
    updateCategoryList();
    updateFamilyMemberEditor();
  }

  function updateParentOnlyButtons() {
    const parentButtons = [
      elements.deduct5Button,
      elements.deduct10Button,
      elements.deduct50Button,
      elements.add5Button,
      elements.add10Button,
      elements.add50Button,
      elements.resetTodayButton,
      elements.clearHistoryButton,
      elements.resetCoinsButton,
      elements.clearAllDataButton
    ];

    parentButtons.forEach(button => {
      if (button) {
        button.disabled = childMode || !parentUnlocked;
      }
    });
  }


  function updateHeroHomeLayout() {
    const showTopCarrotBank = childMode;

    document.body.classList.toggle("show-top-carrot-bank", showTopCarrotBank);
    document.body.classList.remove("show-compact-top-layout");
    document.body.classList.remove("show-home-carrot-bank");

    const heroBank = document.querySelector(".hero-carrot-bank");
    if (heroBank) {
      heroBank.hidden = !showTopCarrotBank;
      heroBank.style.display = showTopCarrotBank ? "block" : "none";
    }

    document.querySelectorAll(".hero-child-stats, .child-bunny-journey").forEach(item => {
      item.style.display = showTopCarrotBank ? "none" : "";
    });
  }

  function updateDisplay() {
    const currentActivePage = document.querySelector(".page.active");
    if (currentActivePage) {
      document.body.dataset.activePage = currentActivePage.id.replace("page-", "");
    }

    if (childMode) {
      const activePage = document.querySelector(".page.active");
      if (activePage && !["page-home", "page-feelings", "page-rewards", "page-calendar", "page-timer", "page-family"].includes(activePage.id)) {
        switchPage("home");
      }
    }

    currentData = applyDailyReset(normalizeData(currentData));
    storeLocalData(currentData);

    updateThemeText();
    updateCoinDisplay();
    updateLevelDisplay();
    updateStreakDisplay();
    updateChildDashboard();
    updateNowNextTool();
    updateRoutineTool();
    updateCalmTool();
    updateParentCalmChoices();
    updateRewardRequestStatus();
    updateFeelingsPage();
    updateParentFeelings();
    updateRewardsShop();
    updateRewardRequests();
    updateParentDashboard();
    updateCalendar();
    updateFamilyTree();
    updateTimerDisplay();
    updateParentNotes();
    updateRewardEditor();
    updateCategoryOptions();
    updateCategoryList();
    updateHistory();
    updateReports();
    updateSettingsInputs();
    updateCelebration();
    updateParentLockDisplay();
    updateHeroHomeLayout();
    updateNotificationStatus();
    maybeSendLatestNotification(currentData).catch(console.error);
  }

  function updateThemeText() {
    updateProgressCharacter();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#ff9ccd");
  }

  function updateProgressCharacter() {
    if (elements.progressCharacter) {
      elements.progressCharacter.textContent = "🐰";
    }

    if (elements.childProgressCharacter) {
      elements.childProgressCharacter.textContent = "🐰";
    }
  }

  function updateCoinDisplay() {
    const goal = currentData.settings.goal;
    const total = currentData.coinTotal;
    const percent = Math.max(0, Math.min(100, (total / goal) * 100));

    if (elements.coinTotalMain) {
      elements.coinTotalMain.textContent = total;
    }

    if (elements.goalDisplay) {
      elements.goalDisplay.textContent = goal;
    }

    if (elements.finishGoal) {
      elements.finishGoal.textContent = goal;
    }

    if (elements.coinProgress) {
      elements.coinProgress.style.width = `${percent}%`;
    }

    if (elements.progressCharacter) {
      elements.progressCharacter.style.left = `calc(${percent}% - 18px)`;
    }

    if (elements.heroCoinTotalMain) {
      elements.heroCoinTotalMain.textContent = total;
    }

    if (elements.heroGoalDisplay) {
      elements.heroGoalDisplay.textContent = goal;
    }

    if (elements.heroFinishGoal) {
      elements.heroFinishGoal.textContent = goal;
    }

    if (elements.heroCoinProgress) {
      elements.heroCoinProgress.style.width = `${percent}%`;
    }

    if (elements.heroProgressCharacter) {
      elements.heroProgressCharacter.style.left = `calc(${percent}% - 18px)`;
    }

    if (elements.childFinishGoal) {
      elements.childFinishGoal.textContent = goal;
    }

    if (elements.childProgressCharacter) {
      elements.childProgressCharacter.style.left = `calc(${percent}% - 18px)`;
    }

    if (elements.greenCoinValue) {
      elements.greenCoinValue.textContent = `+${currentData.settings.greenCoins} carrots`;
    }

    if (elements.redCoinValue) {
      elements.redCoinValue.textContent = `-${currentData.settings.redCoins} carrots`;
    }

    const rewards = normalizeRewards(currentData.rewards).sort((a, b) => a.cost - b.cost);
    const nextReward = rewards.find(reward => reward.cost > total);

    let nextRewardMessage = "";

    if (nextReward) {
      nextRewardMessage = `Next reward: ${nextReward.icon} ${nextReward.name} - ${nextReward.cost - total} carrots to go`;
    } else if (rewards.length) {
      nextRewardMessage = "All rewards are affordable!";
    } else {
      nextRewardMessage = "Add rewards in the Parent Page.";
    }

    if (elements.nextRewardText) {
      elements.nextRewardText.textContent = nextRewardMessage;
    }

    if (elements.heroNextRewardText) {
      elements.heroNextRewardText.textContent = nextRewardMessage;
    }
  }

  function updateLevelDisplay() {
    const level = currentData.today.level;
    const label = level.toUpperCase();

    elements.todayLevelPill.textContent = label;
    elements.todayLevelPill.style.background = level === "red" ? "var(--red)" : level === "green" ? "var(--green)" : "var(--amber)";

    elements.redLight.classList.toggle("active", level === "red");
    elements.amberLight.classList.toggle("active", level === "amber");
    elements.greenLight.classList.toggle("active", level === "green");
  }

  function updateStreakDisplay() {
    elements.streakCount.textContent = currentData.streak.current;
    elements.bestStreak.textContent = currentData.streak.best;

    if (currentData.streak.current > 0) {
      elements.streakMessage.textContent = `Great work. Clara has reached green ${currentData.streak.current} day(s) in a row.`;
    } else {
      elements.streakMessage.textContent = "Reach green today to start a streak.";
    }
  }

  function updateCategoryOptions() {
    const categories = normalizeCategories(currentData.categories);
    const selects = [
      elements.behaviourCategorySelect,
      elements.quickLogCategorySelect,
      elements.noteCategorySelect,
      elements.noteFilterSelect
    ];

    selects.forEach(select => {
      if (!select) {
        return;
      }

      const current = select.value;
      select.innerHTML = "";

      if (select === elements.noteFilterSelect) {
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All notes";
        select.appendChild(all);
      }

      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });

      if ([...select.options].some(option => option.value === current)) {
        select.value = current;
      }
    });
  }

  function updateRewardsShop() {
    const list = elements.rewardsList;

    if (!list) {
      return;
    }

    const rewards = normalizeRewards(currentData.rewards).sort((a, b) => a.cost - b.cost);
    const total = currentData.coinTotal;
    list.innerHTML = "";

    if (!rewards.length) {
      list.innerHTML = "<p class='empty-notes'>No rewards set yet.</p>";
      return;
    }

    rewards.forEach(reward => {
      const affordable = total >= reward.cost;
      const item = document.createElement("article");
      item.className = "reward-shop-item";
      item.classList.toggle("reward-affordable", affordable);

      const icon = document.createElement("div");
      icon.className = "reward-shop-icon";
      icon.textContent = reward.icon;

      const info = document.createElement("div");
      info.className = "reward-shop-info";

      const name = document.createElement("strong");
      name.textContent = reward.name;

      const cost = document.createElement("span");
      cost.textContent = `${reward.cost} carrots`;

      const status = document.createElement("small");
      status.textContent = affordable ? "Ready to claim" : `${reward.cost - total} carrots to go`;

      info.appendChild(name);
      info.appendChild(cost);
      info.appendChild(status);

      const existingPending = normalizeRewardRequests(currentData.rewardRequests)
        .some(request => request.status === "pending" && request.rewardId === reward.id);

      const claim = document.createElement("button");
      claim.type = "button";
      claim.className = "claim-reward-button";

      if (childMode) {
        claim.textContent = existingPending ? "Asked" : "Ask";
        claim.disabled = !affordable || existingPending;
        claim.addEventListener("click", () => requestReward(reward.id));
      } else {
        claim.textContent = "Claim";
        claim.disabled = !affordable || !parentUnlocked;
        claim.addEventListener("click", () => claimReward(reward.id));
      }

      item.appendChild(icon);
      item.appendChild(info);
      item.appendChild(claim);
      list.appendChild(item);
    });
  }

  function updateRewardEditor() {
    const list = elements.rewardEditorList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to edit rewards.</p>";
      return;
    }

    const rewards = normalizeRewards(currentData.rewards);
    list.innerHTML = "";

    rewards.forEach(reward => {
      const item = document.createElement("article");
      item.className = "reward-editor-item";
      item.dataset.rewardEditorId = reward.id;

      item.innerHTML = `
        <label>Icon</label>
        <input class="reward-edit-icon" maxlength="4" value="${escapeAttr(reward.icon)}" />
        <label>Reward</label>
        <input class="reward-edit-name" maxlength="60" value="${escapeAttr(reward.name)}" />
        <label>Cost</label>
        <input class="reward-edit-cost" type="number" min="1" max="10000" step="1" value="${reward.cost}" />
        <div class="reward-editor-buttons">
          <button type="button" class="save-reward-button">Save</button>
          <button type="button" class="delete-reward-button">Delete</button>
        </div>
      `;

      item.querySelector(".save-reward-button").addEventListener("click", () => saveReward(reward.id));
      item.querySelector(".delete-reward-button").addEventListener("click", () => deleteReward(reward.id));
      list.appendChild(item);
    });
  }

  function updateParentNotes() {
    const list = elements.parentNotesList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to view notes.</p>";
      return;
    }

    const filter = elements.noteFilterSelect?.value || "all";
    let notes = normalizeNotes(currentData.parentNotes);

    if (filter !== "all") {
      notes = notes.filter(note => note.category === filter);
    }

    list.innerHTML = "";

    if (!notes.length) {
      list.innerHTML = "<p class='empty-notes'>No parent notes yet.</p>";
      return;
    }

    notes.forEach(note => {
      const item = document.createElement("article");
      item.className = "parent-note-item";

      const meta = document.createElement("div");
      meta.className = "parent-note-meta";
      meta.textContent = `${note.dateText || "No date"} - ${note.author} - ${note.category || "General"}`;

      const text = document.createElement("p");
      text.className = "parent-note-text";
      text.textContent = note.text;

      const actions = document.createElement("div");
      actions.className = "note-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-note-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editNote(note.id));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-note-button";
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteNote(note.id));

      actions.appendChild(edit);
      actions.appendChild(del);

      item.appendChild(meta);
      item.appendChild(text);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function updateCategoryList() {
    const list = elements.categoryList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to edit categories.</p>";
      return;
    }

    list.innerHTML = "";

    normalizeCategories(currentData.categories).forEach(category => {
      const item = document.createElement("div");
      item.className = "category-item";

      const text = document.createElement("strong");
      text.textContent = category;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = DEFAULT_CATEGORIES.includes(category) ? "Default" : "Delete";
      button.disabled = DEFAULT_CATEGORIES.includes(category);
      button.addEventListener("click", () => deleteCategory(category));

      item.appendChild(text);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function updateHistory() {
    const list = elements.historyList;

    if (!list) {
      return;
    }

    const filter = elements.historyFilterSelect?.value || "all";
    let history = normalizeHistory(currentData.history);

    if (filter !== "all") {
      history = history.filter(item => item.type === filter || (filter === "reward" && item.type === "prize"));
    }

    list.innerHTML = "";

    if (!history.length) {
      list.innerHTML = "<p class='empty-notes'>No history yet.</p>";
      return;
    }

    history.forEach(item => {
      const row = document.createElement("article");
      row.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = `${item.dateText || "No date"}${item.category ? " - " + item.category : ""}`;

      const text = document.createElement("p");
      text.className = "history-text";
      text.textContent = item.text;

      const coins = document.createElement("strong");
      coins.textContent = `${item.coinChange > 0 ? "+" : ""}${item.coinChange} carrots | Total: ${item.coinsAfter}`;

      row.appendChild(meta);
      row.appendChild(text);
      row.appendChild(coins);
      list.appendChild(row);
    });
  }

  function getRecentHistory(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);

    return normalizeHistory(currentData.history).filter(item => {
      const date = item.savedAt ? new Date(item.savedAt) : new Date(`${item.dateISO}T00:00:00`);
      return date >= cutoff;
    });
  }

  function updateReports() {
    const recent = getRecentHistory(7);
    const greenDays = new Set(recent.filter(i => i.level === "green").map(i => i.dateISO)).size;
    const redItems = recent.filter(i => i.level === "red").length;
    const amberItems = recent.filter(i => i.level === "amber").length;
    const coinsGained = recent.reduce((sum, item) => sum + Math.max(0, item.coinChange), 0);
    const coinsLost = Math.abs(recent.reduce((sum, item) => sum + Math.min(0, item.coinChange), 0));
    const rewardsClaimed = recent.filter(i => i.type === "reward").length;
    const notes = normalizeNotes(currentData.parentNotes).filter(note => {
      const date = note.savedAt ? new Date(note.savedAt) : new Date(`${note.dateISO}T00:00:00`);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);
      return date >= cutoff;
    });

    if (elements.reportSummary) {
      elements.reportSummary.innerHTML = "";
      [
        ["Green days", greenDays],
        ["Red logs", redItems],
        ["Amber logs", amberItems],
        ["Carrots gained", coinsGained],
        ["Carrots lost", coinsLost],
        ["Rewards claimed", rewardsClaimed],
        ["Parent notes", notes.length],
        ["Best streak", currentData.streak.best]
      ].forEach(([label, value]) => {
        const card = document.createElement("div");
        card.className = "report-stat";
        card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        elements.reportSummary.appendChild(card);
      });
    }

    drawChart(elements.levelChart, {
      Green: recent.filter(i => i.level === "green").length,
      Amber: amberItems,
      Red: redItems
    });

    drawChart(elements.coinChart, {
      Gained: coinsGained,
      Lost: coinsLost
    });

    const notesByCategory = {};
    notes.forEach(note => {
      notesByCategory[note.category || "General"] = (notesByCategory[note.category || "General"] || 0) + 1;
    });
    drawChart(elements.noteChart, Object.keys(notesByCategory).length ? notesByCategory : { Notes: 0 });
  }

  function drawChart(container, data) {
    if (!container) {
      return;
    }

    const entries = Object.entries(data);
    const max = Math.max(1, ...entries.map(([, value]) => Number(value) || 0));
    container.innerHTML = "";

    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "bar-row";

      const name = document.createElement("span");
      name.textContent = label;

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, (Number(value) / max) * 100)}%`;

      const count = document.createElement("strong");
      count.textContent = value;

      track.appendChild(fill);
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(count);
      container.appendChild(row);
    });
  }

  function buildWeeklyReportText() {
    const recent = getRecentHistory(7);
    const coinsGained = recent.reduce((sum, item) => sum + Math.max(0, item.coinChange), 0);
    const coinsLost = Math.abs(recent.reduce((sum, item) => sum + Math.min(0, item.coinChange), 0));

    return [
      "Clara's weekly report",
      "",
      `Green logs: ${recent.filter(i => i.level === "green").length}`,
      `Amber logs: ${recent.filter(i => i.level === "amber").length}`,
      `Red logs: ${recent.filter(i => i.level === "red").length}`,
      `Carrots gained: ${coinsGained}`,
      `Carrots lost: ${coinsLost}`,
      `Rewards claimed: ${recent.filter(i => i.type === "reward").length}`,
      `Current streak: ${currentData.streak.current}`,
      `Best streak: ${currentData.streak.best}`,
      "",
      "Recent notes:",
      ...normalizeNotes(currentData.parentNotes).slice(0, 5).map(note => `- ${note.dateText} - ${note.author} - ${note.category}: ${note.text}`)
    ].join("\n");
  }

  async function copyWeeklyReport() {
    const report = buildWeeklyReportText();

    try {
      await navigator.clipboard.writeText(report);
      alert("Weekly report copied.");
    } catch {
      prompt("Copy this report:", report);
    }
  }

  function updateSettingsInputs() {
    if (!elements.goalInput) {
      return;
    }

    elements.goalInput.value = currentData.settings.goal;
    elements.greenCoinsInput.value = currentData.settings.greenCoins;
    elements.redCoinsInput.value = currentData.settings.redCoins;
  }

  function updateCelebration() {
    if (!elements.treatCard) {
      return;
    }

    elements.treatCard.classList.toggle("show", Boolean(currentData.celebration.active));
    updatePrizeDetails();
  }

  function updatePrizeDetails() {
    if (!elements.prizeDropIcon) {
      return;
    }

    const details = getPrizeDetails(currentData.celebration.theme || getCurrentTheme());
    elements.prizeDropIcon.textContent = details.icon;
    elements.prizeDropName.textContent = details.name;
    elements.treatSubtitle.textContent = details.subtitle;
  }

  function escapeAttr(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function notificationSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    try {
      serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js?v=clara-tools-20");
      await navigator.serviceWorker.ready;
      return serviceWorkerRegistration;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function updateNotificationStatus() {
    const statusText = !notificationSupported()
      ? "Notifications are not supported on this phone/browser."
      : Notification.permission === "granted"
        ? "Notifications are on."
        : Notification.permission === "denied"
          ? "Notifications are blocked in browser settings."
          : "Notifications are off.";

    [elements.notificationStatus, elements.settingsNotificationStatus].forEach(el => {
      if (el) {
        el.textContent = statusText;
      }
    });

    [elements.enableNotificationsButton, elements.settingsEnableNotificationsButton].forEach(button => {
      if (button) {
        button.disabled = notificationSupported() && Notification.permission === "granted";
        button.textContent = Notification.permission === "granted" ? "Notifications On" : "Enable Notifications";
      }
    });
  }

  async function enableNotifications() {
    if (!notificationSupported()) {
      updateNotificationStatus();
      return;
    }

    const registration = await setupServiceWorker();

    if (!registration) {
      alert("Could not set up notifications. Refresh and try again.");
      return;
    }

    const permission = await Notification.requestPermission();
    updateNotificationStatus();

    if (permission === "granted") {
      await showPhoneNotification("Clara notifications enabled", {
        body: "You will be notified when carrots, rewards, and important logs change.",
        tag: "notifications-enabled"
      });
    }
  }

  async function showPhoneNotification(title, options = {}) {
    if (!notificationSupported() || Notification.permission !== "granted") {
      return false;
    }

    try {
      const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "icon.png",
        badge: "icon-192.png",
        vibrate: [120, 80, 120],
        data: { url: "./index.html" },
        ...options
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function latestNotifyItem(data) {
    return normalizeHistory(data.history).find(item => {
      if (item.type === "carrot" || item.type === "reward" || item.type === "prize") {
        return true;
      }

      return item.coinChange !== 0;
    });
  }

  async function maybeSendLatestNotification(data) {
    const item = latestNotifyItem(data);

    if (!item) {
      return;
    }

    const id = `${item.id}|${item.savedAt}|${item.coinChange}|${item.coinsAfter}`;
    const last = localStorage.getItem(LAST_NOTIFICATION_KEY);

    if (!notificationsReady) {
      localStorage.setItem(LAST_NOTIFICATION_KEY, id);
      notificationsReady = true;
      return;
    }

    if (id === last) {
      return;
    }

    localStorage.setItem(LAST_NOTIFICATION_KEY, id);

    if (item.coinChange !== 0) {
      const amount = Math.abs(item.coinChange);
      const title = item.coinChange > 0
        ? `Clara gained ${amount} carrots`
        : `Clara lost ${amount} carrots`;

      await showPhoneNotification(title, {
        body: `${item.text}. Total: ${item.coinsAfter}`,
        tag: `carrot-${item.id}`
      });
    }
  }

  async function createAccount() {
    try {
      const email = elements.authEmailInput.value.trim();
      const password = elements.authPasswordInput.value;
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  }

  async function signInParent() {
    try {
      const email = elements.authEmailInput.value.trim();
      const password = elements.authPasswordInput.value;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  }

  async function signOutParent() {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  }

  async function addThisParent() {
    if (!currentUser?.uid) {
      alert("Sign in first.");
      return;
    }

    if (!await verifyParentPin("add this signed-in parent")) {
      return;
    }

    const data = await getLatestData();
    data.memberUids = {
      ...(data.memberUids || {}),
      [currentUser.uid]: true
    };

    await saveData(data);
    alert("This signed-in parent has been added to the family record.");
  }

  function updateAuthStatus() {
    if (!elements.authStatus) {
      return;
    }

    elements.authStatus.textContent = currentUser
      ? `Signed in as ${currentUser.email || currentUser.uid}`
      : "Not signed in.";
  }

  async function initFirebase() {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      enableIndexedDbPersistence(db).catch(() => {
        // Fine to ignore if another tab already has persistence.
      });

      appDoc = doc(db, "families", FAMILY_RECORD_ID);

      onAuthStateChanged(auth, user => {
        currentUser = user;
        updateAuthStatus();
      });

      unsubscribeSnapshot = onSnapshot(appDoc, snapshot => {
        if (snapshot.exists()) {
          currentData = applyDailyReset(normalizeData(snapshot.data()));
          storeLocalData(currentData);
          setSyncStatus(navigator.onLine ? "Sync connected" : "Saved offline", navigator.onLine ? "online" : "offline");
          updateDisplay();
        } else {
          saveData(currentData);
        }
      }, error => {
        console.error(error);
        setSyncStatus("Sync failed - local mode", "error");
      });
    } catch (error) {
      console.error(error);
      setSyncStatus("Local mode", "offline");
    }
  }

  function connectEvents() {
    document.querySelectorAll(".nav-button").forEach(button => {
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });

    elements.headerUnlockButton.addEventListener("click", async () => {
      if (childMode) {
        if (await verifyParentPin("enter Parent Mode")) {
          childMode = false;
          parentUnlocked = true;
          localStorage.setItem(CHILD_MODE_KEY, "false");
          switchPage("home");
        }
      } else {
        childMode = true;
        parentUnlocked = false;
        localStorage.setItem(CHILD_MODE_KEY, "true");
        switchPage("home");
      }

      updateParentLockDisplay();
      updateDisplay();
    });

    elements.parentPageUnlockButton.addEventListener("click", async () => { await verifyParentPin("unlock parent page"); });
    elements.settingsUnlockButton.addEventListener("click", async () => { await verifyParentPin("unlock settings"); });

    if (elements.themeSelect) { elements.themeSelect.addEventListener("change", () => setTheme("bunny")); }

    elements.deduct5Button.addEventListener("click", () => adjustCoins(-5));
    elements.deduct10Button.addEventListener("click", () => adjustCoins(-10));
    elements.deduct50Button.addEventListener("click", () => adjustCoins(-50));
    elements.add5Button.addEventListener("click", () => adjustCoins(5));
    elements.add10Button.addEventListener("click", () => adjustCoins(10));
    elements.add50Button.addEventListener("click", () => adjustCoins(50));

    elements.redLight.addEventListener("click", () => setLevel("red"));
    elements.amberLight.addEventListener("click", () => setLevel("amber"));
    elements.greenLight.addEventListener("click", () => setLevel("green"));
    elements.redLabel.addEventListener("click", () => setLevel("red"));
    elements.amberLabel.addEventListener("click", () => setLevel("amber"));
    elements.greenLabel.addEventListener("click", () => setLevel("green"));

    elements.resetTodayButton.addEventListener("click", resetToday);
    elements.collectPrizeButton.addEventListener("click", collectPrize);

    elements.enableNotificationsButton.addEventListener("click", enableNotifications);
    elements.settingsEnableNotificationsButton.addEventListener("click", enableNotifications);

    elements.saveQuickLogButton.addEventListener("click", saveQuickDailyLog);

    if (elements.saveNowNextButton) {
      elements.saveNowNextButton.addEventListener("click", saveNowNext);
    }

    if (elements.saveRoutineButton) {
      elements.saveRoutineButton.addEventListener("click", saveRoutine);
    }

    if (elements.calmToggleButton) {
      elements.calmToggleButton.addEventListener("click", toggleCalmOptions);
    }

    if (elements.resetRoutineButton) {
      elements.resetRoutineButton.addEventListener("click", resetRoutineTicks);
    }

    elements.addParentNoteButton.addEventListener("click", addOrUpdateNote);
    elements.noteAuthor.value = localStorage.getItem(NOTE_AUTHOR_KEY) || "";
    elements.noteAuthor.addEventListener("input", () => localStorage.setItem(NOTE_AUTHOR_KEY, elements.noteAuthor.value.trim()));
    elements.noteFilterSelect.addEventListener("change", updateParentNotes);

    elements.addRewardButton.addEventListener("click", addReward);

    elements.addCategoryButton.addEventListener("click", addCategory);

    elements.historyFilterSelect.addEventListener("change", updateHistory);
    elements.clearHistoryButton.addEventListener("click", clearHistory);

    elements.saveCalendarEntryButton.addEventListener("click", saveCalendarEntry);
    elements.deleteCalendarEntryButton.addEventListener("click", deleteCalendarEntry);
    elements.calendarDateInput.addEventListener("change", () => selectCalendarDay(elements.calendarDateInput.value));

    if (elements.addFamilyMemberButton) {
      elements.addFamilyMemberButton.addEventListener("click", addOrUpdateFamilyMember);
    }

    if (elements.cancelFamilyEditButton) {
      elements.cancelFamilyEditButton.addEventListener("click", clearFamilyForm);
    }

    document.querySelectorAll("[data-timer-minutes]").forEach(button => {
      button.addEventListener("click", () => setTimerDuration(button.dataset.timerMinutes));
    });

    if (elements.startTimerButton) {
      elements.startTimerButton.addEventListener("click", startVisualTimer);
    }

    if (elements.pauseTimerButton) {
      elements.pauseTimerButton.addEventListener("click", pauseVisualTimer);
    }

    if (elements.resetTimerButton) {
      elements.resetTimerButton.addEventListener("click", resetVisualTimer);
    }

    if (elements.setCustomTimerButton) {
      elements.setCustomTimerButton.addEventListener("click", setCustomTimerDuration);
    }

    elements.copyWeeklyReportButton.addEventListener("click", copyWeeklyReport);

    elements.saveCoinSettingsButton.addEventListener("click", saveCoinSettings);
    elements.changePinButton.addEventListener("click", changePin);

    elements.createAccountButton.addEventListener("click", createAccount);
    elements.signInButton.addEventListener("click", signInParent);
    elements.signOutButton.addEventListener("click", signOutParent);
    elements.addThisParentButton.addEventListener("click", addThisParent);

    elements.exportDataButton.addEventListener("click", exportData);
    elements.resetCoinsButton.addEventListener("click", resetCoins);
    elements.clearAllDataButton.addEventListener("click", clearAllData);

    window.addEventListener("online", () => setSyncStatus("Back online", "online"));
    window.addEventListener("offline", () => setSyncStatus("Offline - saved on phone", "offline"));
  }

  setTheme("bunny");
  connectEvents();
  setupServiceWorker().finally(updateNotificationStatus);
  if (timerState.running) {
    startTimerTick();
  }
  updateDisplay();
  initFirebase();
});
