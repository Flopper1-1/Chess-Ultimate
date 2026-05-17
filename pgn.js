(function () {
  function cleanMoveText(text) {
    return String(text || "")
      .replace(/[!?]+/g, "")
      .replace(/[+#]+/g, "")
      .replace(/[=]/g, "")
      .trim();
  }

  function moveToCoord(move, indexToCoord) {
    if (!move || move.from == null || move.from < 0 || !indexToCoord) return "";
    return `${indexToCoord(move.from)}${indexToCoord(move.to)}${move.promotion || ""}`.toLowerCase();
  }

  function tokenize(pgn) {
    return String(pgn || "")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !/^\d+\.(\.\.)?$/.test(token))
      .filter((token) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token));
  }

  function resultToken(result) {
    const text = String(result || "");
    if (/white wins|white win/i.test(text)) return "1-0";
    if (/black wins|black win/i.test(text)) return "0-1";
    if (/draw|stalemate|repetition|50-move/i.test(text)) return "1/2-1/2";
    return "*";
  }

  function exportHistory({ history, formatMove, result, variant, edition }) {
    const headers = [
      `[Event "Chess Ultimate ${edition || ""}"]`,
      `[Variant "${variant || "standard"}"]`,
      `[Result "${resultToken(result)}"]`
    ];
    const body = [];
    for (let i = 0; i < (history || []).length; i += 2) {
      const white = history[i] && history[i].move ? cleanMoveText(formatMove(history[i].move)) : "";
      const black = history[i + 1] && history[i + 1].move ? cleanMoveText(formatMove(history[i + 1].move)) : "";
      body.push(`${Math.floor(i / 2) + 1}. ${white}${black ? ` ${black}` : ""}`);
    }
    body.push(resultToken(result));
    return `${headers.join("\n")}\n\n${body.join(" ")}`.trim();
  }

  function findMatchingMove(legalMoves, token, helpers) {
    const cleanToken = cleanMoveText(token).replace(/^0/g, "O");
    const normalizedToken = cleanToken.toLowerCase();
    const coordToken = normalizedToken.replace(/[^a-h1-8qrbn]/g, "");
    for (const move of legalMoves || []) {
      const formatted = cleanMoveText(helpers.formatMove(move)).replace(/^0/g, "O").toLowerCase();
      const coord = moveToCoord(move, helpers.indexToCoord);
      if (formatted === normalizedToken || coord === coordToken) return move;
      if (move.promotion && formatted === normalizedToken.replace(/[qrbn]$/, "")) return move;
    }
    return null;
  }

  window.ChessUltimatePGN = {
    tokenize,
    exportHistory,
    findMatchingMove
  };
})();
