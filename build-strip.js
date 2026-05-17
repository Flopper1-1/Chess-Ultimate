const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Support build-out or build-fresh (used when build-out is locked by old instances).
// CHESS_ULTIMATE_BUILD_DIR lets the release script point at a known-good build.
let buildDir = process.env.CHESS_ULTIMATE_BUILD_DIR
  ? path.resolve(__dirname, process.env.CHESS_ULTIMATE_BUILD_DIR)
  : path.join(__dirname, "build-out", "ChessUltimate-win32-x64");
if (!fs.existsSync(buildDir)) {
  buildDir = path.join(__dirname, "build-fresh", "ChessUltimate-win32-x64");
}
if (!fs.existsSync(buildDir)) {
  console.error("No build output found in build-out or build-fresh"); process.exit(1);
}

// Strip all locales except en-US
const localesDir = path.join(buildDir, "locales");
if (fs.existsSync(localesDir)) {
  for (const f of fs.readdirSync(localesDir)) {
    if (f !== "en-US.pak") fs.rmSync(path.join(localesDir, f), { force: true });
  }
  console.log("Stripped locales");
}

// Remove 40MB license HTML
const license = path.join(buildDir, "LICENSES.chromium.html");
if (fs.existsSync(license)) { fs.rmSync(license); console.log("Removed LICENSES.chromium.html"); }

// Ensure dist-pkg exists
const distDir = path.join(__dirname, "dist-pkg");
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

const pkg  = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
const v    = pkg.version;
const zip  = path.join(distDir, `ChessUltimate-v${v}-win64.zip`);

// Delete stale zip if present
if (fs.existsSync(zip)) fs.rmSync(zip);

// Zip using 7z — fall back to PowerShell Compress-Archive
console.log(`Zipping → dist-pkg/ChessUltimate-v${v}-win64.zip …`);
try {
  execSync(`7z a -tzip "${zip}" "${buildDir}\\*" -mx=3`, { stdio: "inherit" });
} catch (_) {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${buildDir}\\*' -DestinationPath '${zip}'"`,
    { stdio: "inherit" }
  );
}

console.log(`\nBuild complete: dist-pkg/ChessUltimate-v${v}-win64.zip`);
console.log(`\nRelease:\n  gh release create v${v} "${zip}" --repo Flopper1-1/Chess-Ultimate --title "Chess Ultimate v${v}" --notes ""`);
