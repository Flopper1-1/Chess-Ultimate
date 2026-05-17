(function () {
  const SETTINGS_KEY = "chessUltimate_settings_v1";
  const SAVE_PREFIX = "chessUltimate_saves_v1";

  const DEFAULT_SETTINGS = {
    autosaveInterval: 1,
    autosaveAmount: 5,
    battleStartVariant: "standard",
    battleStartColor: "random",
    jokerStartVariant: "standard",
    jokerStartColor: "random"
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeCount(value, fallback, min, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function getSettings() {
    const stored = readJson(SETTINGS_KEY, {});
    const merged = { ...DEFAULT_SETTINGS, ...(stored || {}) };
    merged.autosaveInterval = normalizeCount(merged.autosaveInterval, DEFAULT_SETTINGS.autosaveInterval, 1, 99);
    merged.autosaveAmount = normalizeCount(merged.autosaveAmount, DEFAULT_SETTINGS.autosaveAmount, 1, 20);
    return merged;
  }

  function saveSettings(next) {
    const settings = { ...getSettings(), ...(next || {}) };
    settings.autosaveInterval = normalizeCount(settings.autosaveInterval, DEFAULT_SETTINGS.autosaveInterval, 1, 99);
    settings.autosaveAmount = normalizeCount(settings.autosaveAmount, DEFAULT_SETTINGS.autosaveAmount, 1, 20);
    writeJson(SETTINGS_KEY, settings);
    return settings;
  }

  function saveKey(edition, variant) {
    return `${SAVE_PREFIX}:${edition || "unknown"}:${variant || "standard"}`;
  }

  function readSaveList(edition, variant) {
    const list = readJson(saveKey(edition, variant), []);
    return Array.isArray(list) ? list : [];
  }

  function writeSaveList(edition, variant, list) {
    writeJson(saveKey(edition, variant), Array.isArray(list) ? list : []);
  }

  function saveGame(snapshot, options = {}) {
    if (!snapshot || !snapshot.edition || !snapshot.variant) return null;
    const autosave = Boolean(options.autosave || snapshot.type === "autosave");
    const limit = normalizeCount(options.limit, getSettings().autosaveAmount, 1, 20);
    const now = new Date().toISOString();
    const save = {
      ...clone(snapshot),
      id: snapshot.id || `${autosave ? "auto" : "manual"}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: autosave ? "autosave" : "manual",
      savedAt: now
    };

    const list = readSaveList(save.edition, save.variant);
    let next = autosave
      ? list.filter((entry) => entry.type !== "autosave")
      : list.filter((entry) => entry.id !== save.id);
    const autosaves = autosave
      ? [save, ...list.filter((entry) => entry.type === "autosave")]
      : list.filter((entry) => entry.type === "autosave");
    const trimmedAutosaves = autosaves
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
      .slice(0, limit);
    if (!autosave) next.push(save);
    next = [...trimmedAutosaves, ...next.filter((entry) => entry.type !== "autosave")]
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    writeSaveList(save.edition, save.variant, next);
    return save;
  }

  function listSaves(edition, variant) {
    return readSaveList(edition, variant)
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }

  function listAllSaves(edition) {
    const prefix = `${SAVE_PREFIX}:${edition || "unknown"}:`;
    const saves = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const list = readJson(key, []);
      if (Array.isArray(list)) saves.push(...list);
    }
    return saves.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }

  function deleteSave(save) {
    if (!save || !save.edition || !save.variant || !save.id) return false;
    const list = readSaveList(save.edition, save.variant).filter((entry) => entry.id !== save.id);
    writeSaveList(save.edition, save.variant, list);
    return true;
  }

  window.ChessUltimateStorage = {
    DEFAULT_SETTINGS,
    clone,
    getSettings,
    saveSettings,
    saveGame,
    listSaves,
    listAllSaves,
    deleteSave
  };
})();
