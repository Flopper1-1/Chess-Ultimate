(function () {
  const STORE_KEY = "chessUltimate_global_progress_v1";
  const QUALIFYING_ELO = 1000;

  const ACHIEVEMENTS = [
    { id: "first_blood", icon: "⚔️", name: "First Blood", difficulty: "Trivial", desc: "Make your first capture.", variants: ["standard", "chess960"] },
    { id: "brilliant", icon: "💡", name: "Brilliant!", difficulty: "Insane", desc: "Play a brilliant move (!!).", variants: ["standard", "chess960"] },
    { id: "checkmate", icon: "👑", name: "Checkmate!", difficulty: "Easy", desc: "Win your first game.", variants: ["standard", "chess960"] },
    { id: "castle_king", icon: "🏰", name: "Fortified", difficulty: "Easy", desc: "Castle kingside.", variants: ["standard", "chess960"] },
    { id: "promotion", icon: "⭐", name: "Crowned", difficulty: "Easy", desc: "Promote a pawn.", variants: ["standard", "chess960"] },
    { id: "check10", icon: "🎯", name: "Relentless", difficulty: "Hard", desc: "Give check 10 times total.", variants: ["standard", "chess960"] },
    { id: "win5", icon: "🏆", name: "Veteran", difficulty: "Mild", desc: "Win 5 games.", variants: ["standard", "chess960"] },
    { id: "blunder_lose", icon: "💀", name: "Lesson Learned", difficulty: "Accidental", desc: "Blunder and lose.", variants: ["standard", "chess960"] },
    { id: "long_game", icon: "⏱️", name: "Marathon", difficulty: "Mild", desc: "Play a game with 40+ moves.", variants: ["standard", "chess960"] },
    { id: "sacrifice", icon: "🔥", name: "The Sacrifice", difficulty: "Accidental", desc: "Sacrifice your queen.", variants: ["standard", "chess960"] },
    { id: "en_passant", icon: "👻", name: "En Passant!", difficulty: "Hard", desc: "Capture en passant.", variants: ["standard", "chess960"] },
    { id: "speedrun", icon: "⚡", name: "Speedrun", difficulty: "Insane", desc: "Win in under 15 moves.", variants: ["standard", "chess960"] },
    { id: "resourceful", icon: "🧰", name: "Resourceful", difficulty: "Mild", desc: "Go 10 of your moves without losing a piece.", variants: ["standard", "chess960"] },
    { id: "quick_check", icon: "🚨", name: "Quick Check", difficulty: "Mild", desc: "Give check within 10 moves.", variants: ["standard", "chess960"] },
    { id: "win50", icon: "🎖️", name: "Seasoned Player", difficulty: "Mild", desc: "Win 50 games.", variants: ["standard", "chess960"] },
    { id: "chess960_win", icon: "🔀", name: "Chess960", difficulty: "Easy", desc: "Win a game of Chess960.", variants: ["chess960"] },
    { id: "three_check_win", icon: "3️⃣", name: "Three-Check-Chess", difficulty: "Easy", desc: "Win a game of Three-Check-Chess.", variants: ["three_check"] },
    { id: "five_check", icon: "5️⃣", name: "Five-Check-Chess", difficulty: "Mild", desc: "Win Three-Check while you are on your last check.", variants: ["three_check"] },
    { id: "atomic_win", icon: "☢️", name: "Atomic Chess", difficulty: "Easy", desc: "Win a game of Atomic Chess.", variants: ["atomic"] },
    { id: "nuclear_explosion", icon: "💥", name: "Nuclear Explosion!", difficulty: "Hard", desc: "Capture 4 pieces with one explosion.", variants: ["atomic"] },
    { id: "hill_win", icon: "⛰️", name: "King of the Hill", difficulty: "Easy", desc: "Win a game of King of the Hill.", variants: ["king_of_the_hill"] },
    { id: "fog_win", icon: "🌫️", name: "Fog of War Chess", difficulty: "Mild", desc: "Win a game of Fog of War Chess.", variants: ["fog_of_war"] },
    { id: "antichess_win", icon: "🙃", name: "Antichess", difficulty: "Easy", desc: "Win a game of Antichess.", variants: ["antichess"] },
    { id: "crazyhouse_win", icon: "🏚️", name: "Crazyhouse", difficulty: "Mild", desc: "Win a game of Crazyhouse.", variants: ["crazyhouse"] },
    { id: "crazycheck", icon: "🧩", name: "Crazycheck!", difficulty: "Hard", desc: "Checkmate by dropping a piece in Crazyhouse.", variants: ["crazyhouse"] },
    { id: "jokers_gambit_win", icon: "🃏", name: "Joker's Gambit", difficulty: "Easy", desc: "Win a game of Joker's Gambit.", edition: "balatro" },
    { id: "legendary_card", icon: "🌟", name: "Legendary", difficulty: "Hard", desc: "Obtain a legendary card.", edition: "balatro" },
    { id: "ultra_card", icon: "💎", name: "Ultra-rare", difficulty: "Hard", desc: "Obtain an ultra-rare card.", edition: "balatro" },
    { id: "we_are_chess", icon: "♟️", name: "We are Chess", difficulty: "Insane", desc: "Collect every achievement for Chess Ultimate." }
  ];

  const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
  const META_ACHIEVEMENTS = new Set(["we_are_chess"]);
  const PIECE_NAMES = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function defaultData() {
    return {
      achievements: {},
      counters: {
        checksByPlayer: 0,
        winsByPlayer: 0,
        losslessMoves: 0,
        playerBlundered: false
      },
      stats: {}
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? { ...defaultData(), ...JSON.parse(raw) } : defaultData();
    } catch (_) {
      return defaultData();
    }
  }

  let data = load();

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function importData(next) {
    if (!next || typeof next !== "object") return;
    data = {
      ...defaultData(),
      ...clone(next),
      achievements: { ...(next.achievements || {}) },
      counters: { ...defaultData().counters, ...(next.counters || {}) },
      stats: { ...(next.stats || {}) }
    };
    save();
  }

  function exportData() {
    return clone(data);
  }

  function qualifies(ctx) {
    return Boolean(ctx
      && ctx.gameMode === "bot"
      && Number(ctx.elo || 0) > QUALIFYING_ELO
      && ctx.actor === "human"
      && ctx.color === ctx.playerColor);
  }

  function baseVariantApplies(variant) {
    return variant === "standard" || variant === "chess960";
  }

  function fullTurns(ctx) {
    const len = Number(ctx && ctx.historyLength);
    return Number.isFinite(len) ? Math.floor(len / 2) : 0;
  }

  function showToast(achievement) {
    if (!achievement || !document.body) return;
    const toast = document.createElement("div");
    toast.className = "cu-progress-toast";
    toast.innerHTML = `<span>${achievement.icon}</span><strong>${achievement.name}</strong><small>${achievement.difficulty}</small>`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("show"), 20);
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 260);
    }, 3200);

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      window.setTimeout(() => ctx.close && ctx.close(), 700);
    } catch (_) {}
  }

  function unlock(id) {
    if (!ACH_BY_ID[id] || data.achievements[id]) return false;
    data.achievements[id] = { unlockedAt: new Date().toISOString() };
    save();
    showToast(ACH_BY_ID[id]);
    maybeUnlockMeta();
    renderOpenModal();
    return true;
  }

  function maybeUnlockMeta() {
    if (data.achievements.we_are_chess) return;
    const required = ACHIEVEMENTS.filter((achievement) => !META_ACHIEVEMENTS.has(achievement.id));
    if (required.every((achievement) => data.achievements[achievement.id])) {
      data.achievements.we_are_chess = { unlockedAt: new Date().toISOString() };
      save();
      showToast(ACH_BY_ID.we_are_chess);
    }
  }

  function statEdition(edition) {
    const key = edition || "unknown";
    if (!data.stats[key]) data.stats[key] = {};
    return data.stats[key];
  }

  function statBucket(edition, relation) {
    const stats = statEdition(edition);
    if (!stats[relation]) stats[relation] = {};
    return stats[relation];
  }

  function addStat(edition, relation, key, amount = 1) {
    if (!relation) return;
    const bucket = statBucket(edition, relation);
    bucket[key] = Number(bucket[key] || 0) + amount;
  }

  function relationFor(ctx) {
    if (!ctx || ctx.gameMode === "local_multiplayer") return "";
    const actorIsPlayer = ctx.actor === "human" && ctx.color === ctx.playerColor;
    const actorIsBot = ctx.gameMode === "bot" && ctx.actor === "bot";
    if (ctx.gameMode === "bot") return actorIsPlayer ? "you_vs_bot" : actorIsBot ? "bot_against_you" : "";
    if (ctx.gameMode === "p2p_multiplayer") return actorIsPlayer ? "you_vs_player" : "player_against_you";
    return "";
  }

  function recordMove(ctx) {
    if (!ctx || !ctx.move) return;
    const relation = relationFor(ctx);
    const move = ctx.move;
    const pieceType = String(move.piece || "").toLowerCase();
    const capturedType = String(move.captured || ctx.capturedPiece || "").toLowerCase();
    const moverIsPlayer = ctx.actor === "human" && ctx.color === ctx.playerColor;
    const playerLostPiece = ctx.gameMode === "bot" && ctx.actor === "bot" && capturedType && ctx.color !== ctx.playerColor;

    if (relation) {
      if (move.captured || ctx.capturedPiece) {
        addStat(ctx.edition, relation, `captures_by_${PIECE_NAMES[pieceType] || pieceType || "Piece"}`);
        addStat(ctx.edition, relation, `${PIECE_NAMES[capturedType] || capturedType || "Piece"}s_taken`);
      }
      if (move.enPassant || (move.flags && String(move.flags).includes("e"))) {
        addStat(ctx.edition, relation, "en_passants");
      }
      if (ctx.checkNow) addStat(ctx.edition, relation, "checks");
      if (ctx.status && ctx.status.over && /checkmate|wins/i.test(ctx.status.result || "")) {
        addStat(ctx.edition, relation, "checkmates");
      }
      save();
    }

    if (playerLostPiece) {
      data.counters.losslessMoves = 0;
      save();
    }

    if (!qualifies(ctx)) return;

    if (baseVariantApplies(ctx.variant)) {
      if (move.captured || ctx.capturedPiece) unlock("first_blood");
      if (move.castleKing) unlock("castle_king");
      if (move.promotion) unlock("promotion");
      if (move.enPassant || (move.flags && String(move.flags).includes("e"))) unlock("en_passant");
      if (ctx.annotation && (ctx.annotation.symbol === "!!" || ctx.annotation === "!!")) unlock("brilliant");
      if (ctx.annotation && (ctx.annotation.symbol === "??" || ctx.annotation === "??")) data.counters.playerBlundered = true;
      if (move.captured && String(move.captured).toLowerCase() === "q" && pieceType !== "q" && pieceType !== "k") unlock("sacrifice");
      if (ctx.checkNow) {
        data.counters.checksByPlayer = Number(data.counters.checksByPlayer || 0) + 1;
        if (data.counters.checksByPlayer >= 10) unlock("check10");
        if (fullTurns(ctx) <= 10) unlock("quick_check");
      }
      if (moverIsPlayer) {
        data.counters.losslessMoves = Number(data.counters.losslessMoves || 0) + 1;
        if (data.counters.losslessMoves >= 10) unlock("resourceful");
      }
      save();
    }

    if (ctx.variant === "atomic" && Number(ctx.explodedCount || 0) >= 4) unlock("nuclear_explosion");
  }

  function playerWon(ctx) {
    const result = String(ctx && ctx.result || "");
    if (!ctx || !result) return false;
    const playerName = ctx.playerColor === "b" ? "Black" : "White";
    return result.includes(`${playerName} wins`) || result.includes(`${playerName} win`);
  }

  function recordGameOver(ctx) {
    if (!ctx || !ctx.status || !ctx.status.over) return;
    const result = String(ctx.status.result || "");
    const relation = ctx.gameMode === "bot" ? "you_vs_bot" : ctx.gameMode === "p2p_multiplayer" ? "you_vs_player" : "";
    if (relation && /stalemate/i.test(result)) addStat(ctx.edition, relation, "stalemates");
    if (relation && /threefold/i.test(result)) addStat(ctx.edition, relation, "threefold_repetitions");
    if (relation && /fivefold/i.test(result)) addStat(ctx.edition, relation, "fivefold_repetitions");
    if (relation && /50-move|fifty/i.test(result)) addStat(ctx.edition, relation, "fifty_move_rule");
    save();

    if (!(ctx.gameMode === "bot" && Number(ctx.elo || 0) > QUALIFYING_ELO)) return;
    if (playerWon({ ...ctx, result })) {
      data.counters.winsByPlayer = Number(data.counters.winsByPlayer || 0) + 1;
      if (baseVariantApplies(ctx.variant)) {
        unlock("checkmate");
        if (data.counters.winsByPlayer >= 5) unlock("win5");
        if (data.counters.winsByPlayer >= 50) unlock("win50");
        if (Number(ctx.historyLength || 0) >= 80) unlock("long_game");
        if (Number(ctx.historyLength || 0) < 30) unlock("speedrun");
      }
      if (ctx.variant === "chess960") unlock("chess960_win");
      if (ctx.variant === "three_check") {
        unlock("three_check_win");
        if (ctx.playerChecksAgainst >= 2) unlock("five_check");
      }
      if (ctx.variant === "atomic") unlock("atomic_win");
      if (ctx.variant === "king_of_the_hill") unlock("hill_win");
      if (ctx.variant === "fog_of_war") unlock("fog_win");
      if (ctx.variant === "antichess") unlock("antichess_win");
      if (ctx.variant === "crazyhouse") {
        unlock("crazyhouse_win");
        if (ctx.lastMoveWasDrop) unlock("crazycheck");
      }
      if (ctx.edition === "balatro") unlock("jokers_gambit_win");
      if (ctx.edition === "wilderness") {
        try { localStorage.setItem("chessUltimate_dontstarve_jokers_unlocked", "1"); } catch (_) {}
      }
    } else if (baseVariantApplies(ctx.variant) && data.counters.playerBlundered) {
      unlock("blunder_lose");
    }
    data.counters.losslessMoves = 0;
    data.counters.playerBlundered = false;
    save();
  }

  function recordCard(ctx) {
    if (!ctx) return;
    const relation = ctx.gameMode === "bot"
      ? (ctx.color === ctx.playerColor ? "you_vs_bot" : "bot_against_you")
      : ctx.gameMode === "p2p_multiplayer"
        ? (ctx.color === ctx.playerColor ? "you_vs_player" : "player_against_you")
        : "";
    if (relation) {
      if (ctx.kind === "joker") {
        addStat(ctx.edition || "balatro", relation, "jokers_gained");
        addStat(ctx.edition || "balatro", relation, `${ctx.rarity || "common"}_jokers_obtained`);
      }
      if (ctx.kind === "luck") addStat(ctx.edition || "balatro", relation, "luck_cards_gained");
      if (ctx.action === "discard_joker") addStat(ctx.edition || "balatro", relation, "jokers_discarded");
      save();
    }
    if (ctx.gameMode === "bot" && ctx.color === ctx.playerColor && Number(ctx.elo || 0) > QUALIFYING_ELO) {
      if (ctx.kind === "joker" && ctx.rarity === "legendary") unlock("legendary_card");
      if (ctx.kind === "joker" && ctx.rarity === "ultra") unlock("ultra_card");
    }
  }

  function formatRelation(key) {
    return {
      you_vs_bot: "You vs bot",
      bot_against_you: "Bot against you",
      you_vs_player: "You vs player",
      player_against_you: "Player against you"
    }[key] || key;
  }

  function formatStatKey(key) {
    return String(key).replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function ensureModal() {
    if (document.getElementById("cuProgressModal")) return;
    const style = document.createElement("style");
    style.textContent = `
      .cu-progress-open { margin-left: 8px; border: 1px solid rgba(255,255,255,0.16); border-radius: 9px; background: rgba(15,23,42,0.72); color: #fff; padding: 8px 10px; cursor: pointer; font-weight: 800; }
      .cu-progress-modal { position: fixed; inset: 0; z-index: 9999; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.72); }
      .cu-progress-modal.open { display: flex; }
      .cu-progress-panel { width: min(980px, calc(100vw - 32px)); max-height: calc(100vh - 34px); overflow: hidden; border: 1px solid rgba(148,163,184,0.28); border-radius: 12px; background: #08111f; box-shadow: 0 28px 90px rgba(0,0,0,0.62); color: #e5edf8; }
      .cu-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(148,163,184,0.18); }
      .cu-progress-head h2 { margin: 0; font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase; }
      .cu-progress-body { padding: 16px 18px 18px; display: grid; gap: 12px; }
      .cu-progress-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .cu-progress-tools input { min-width: 240px; flex: 1; border: 1px solid rgba(148,163,184,0.25); border-radius: 8px; background: rgba(15,23,42,0.86); color: #fff; padding: 10px 12px; }
      .cu-progress-tabs { display: flex; gap: 8px; }
      .cu-progress-tab, .cu-progress-close { border: 1px solid rgba(148,163,184,0.25); border-radius: 8px; background: rgba(148,163,184,0.12); color: #fff; padding: 9px 12px; cursor: pointer; font-weight: 800; }
      .cu-progress-tab.active { background: #38bdf8; color: #04111c; }
      .cu-progress-list { max-height: min(580px, calc(100vh - 210px)); overflow: auto; display: grid; gap: 10px; }
      .cu-ach-row, .cu-stat-row { border: 1px solid rgba(148,163,184,0.18); border-radius: 10px; background: rgba(15,23,42,0.72); padding: 12px; display: grid; gap: 4px; }
      .cu-ach-row.unlocked { border-color: rgba(56,189,248,0.38); background: rgba(14,165,233,0.12); }
      .cu-ach-title { display: flex; align-items: center; gap: 10px; font-weight: 900; }
      .cu-ach-meta, .cu-stat-meta { color: rgba(226,232,240,0.62); font-size: 0.78rem; }
      .cu-progress-toast { position: fixed; right: 22px; bottom: 22px; z-index: 10000; display: grid; grid-template-columns: auto 1fr; gap: 0 10px; min-width: 250px; padding: 13px 15px; border: 1px solid rgba(56,189,248,0.45); border-radius: 12px; background: rgba(8,17,31,0.96); color: #fff; box-shadow: 0 16px 48px rgba(0,0,0,0.48); transform: translateY(16px); opacity: 0; transition: 180ms ease; }
      .cu-progress-toast.show { transform: translateY(0); opacity: 1; }
      .cu-progress-toast span { font-size: 1.45rem; grid-row: span 2; }
      .cu-progress-toast strong { font-size: 0.92rem; }
      .cu-progress-toast small { color: rgba(226,232,240,0.62); }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "cuProgressModal";
    modal.className = "cu-progress-modal";
    modal.innerHTML = `
      <div class="cu-progress-panel">
        <div class="cu-progress-head">
          <h2>Global Progress</h2>
          <button class="cu-progress-close" type="button">Close</button>
        </div>
        <div class="cu-progress-body">
          <div class="cu-progress-tools">
            <input id="cuProgressSearch" type="search" placeholder="Search achievements or stats">
            <div class="cu-progress-tabs">
              <button class="cu-progress-tab active" type="button" data-tab="achievements">Achievements</button>
              <button class="cu-progress-tab" type="button" data-tab="stats">Stats</button>
            </div>
          </div>
          <div class="cu-progress-list" id="cuProgressList"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector(".cu-progress-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    modal.querySelector("#cuProgressSearch").addEventListener("input", renderOpenModal);
    modal.querySelectorAll(".cu-progress-tab").forEach((button) => {
      button.addEventListener("click", () => {
        modal.querySelectorAll(".cu-progress-tab").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        renderOpenModal();
      });
    });
  }

  function attachButton() {
    ensureModal();
    if (document.getElementById("cuProgressOpen")) return;
    const anchor = document.getElementById("achOpenBtn") || document.getElementById("newGameBtn");
    if (!anchor || !anchor.parentElement) return;
    const button = document.createElement("button");
    button.id = "cuProgressOpen";
    button.className = "cu-progress-open";
    button.type = "button";
    button.title = "Global achievements and stats";
    button.textContent = "📊";
    button.addEventListener("click", openModal);
    anchor.insertAdjacentElement("afterend", button);
  }

  function openModal() {
    ensureModal();
    const modal = document.getElementById("cuProgressModal");
    modal.classList.add("open");
    renderOpenModal();
  }

  function closeModal() {
    const modal = document.getElementById("cuProgressModal");
    if (modal) modal.classList.remove("open");
  }

  function renderOpenModal() {
    const modal = document.getElementById("cuProgressModal");
    if (!modal || !modal.classList.contains("open")) return;
    const list = modal.querySelector("#cuProgressList");
    const search = String(modal.querySelector("#cuProgressSearch").value || "").trim().toLowerCase();
    const activeTab = modal.querySelector(".cu-progress-tab.active")?.dataset.tab || "achievements";
    if (activeTab === "achievements") {
      const rows = ACHIEVEMENTS.filter((achievement) => {
        const haystack = `${achievement.name} ${achievement.desc} ${achievement.difficulty}`.toLowerCase();
        return !search || haystack.includes(search);
      }).map((achievement) => {
        const unlocked = Boolean(data.achievements[achievement.id]);
        const when = unlocked ? new Date(data.achievements[achievement.id].unlockedAt).toLocaleString() : "Locked";
        return `<div class="cu-ach-row ${unlocked ? "unlocked" : "locked"}">
          <div class="cu-ach-title"><span>${achievement.icon}</span><span>${achievement.name}</span></div>
          <div>${achievement.desc}</div>
          <div class="cu-ach-meta">${achievement.difficulty} • ${when}</div>
        </div>`;
      });
      list.innerHTML = rows.join("") || `<div class="cu-stat-row">No achievements match that search.</div>`;
      return;
    }

    const rows = [];
    for (const [edition, editionStats] of Object.entries(data.stats || {})) {
      for (const [relation, bucket] of Object.entries(editionStats || {})) {
        for (const [key, value] of Object.entries(bucket || {})) {
          const label = `${edition} ${formatRelation(relation)} ${formatStatKey(key)}`;
          if (search && !label.toLowerCase().includes(search)) continue;
          rows.push(`<div class="cu-stat-row">
            <strong>${formatStatKey(key)}: ${value}</strong>
            <span class="cu-stat-meta">${edition} • ${formatRelation(relation)}</span>
          </div>`);
        }
      }
    }
    list.innerHTML = rows.join("") || `<div class="cu-stat-row">No stats yet. Stats ignore local multiplayer.</div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(attachButton, 100);
  });

  window.ChessUltimateProgress = {
    achievements: ACHIEVEMENTS,
    exportData,
    importData,
    unlock,
    recordMove,
    recordGameOver,
    recordCard,
    openModal
  };
})();
