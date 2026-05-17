const fs = require("fs");
const path = require("path");
const RPC = require("discord-rpc");

function clientIdFromConfig() {
  const fromEnv = process.env.CHESS_ULTIMATE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  if (fromEnv) return String(fromEnv).trim();

  const files = [
    path.join(process.cwd(), "discord-client-id.txt"),
    path.join(__dirname, "..", "discord-client-id.txt"),
  ];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const id = fs.readFileSync(file, "utf8").trim();
      if (id) return id;
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  return String(pkg.config && pkg.config.discordClientId ? pkg.config.discordClientId : "").trim();
}

async function main() {
  const clientId = clientIdFromConfig();
  if (!clientId) throw new Error("No Discord Client ID configured.");

  RPC.register(clientId);
  const client = new RPC.Client({ transport: "ipc" });

  const timeout = setTimeout(() => {
    console.error("Timed out waiting for Discord RPC. Make sure the Discord desktop app is open.");
    process.exit(2);
  }, 10000);

  client.on("ready", async () => {
    console.log(`Discord RPC ready for client ${clientId}`);
    try {
      await client.setActivity({
        details: "Chess Ultimate DRP test",
        state: "If you see this, Rich Presence works",
        startTimestamp: Date.now(),
        buttons: [
          { label: "GitHub", url: "https://github.com/Flopper1-1/Chess-Ultimate" },
        ],
      });
      console.log("Activity set. Check your Discord profile/status now.");
      console.log("Leaving the test presence up for 15 seconds...");
      clearTimeout(timeout);
      setTimeout(() => {
        try {
          client.clearActivity();
          client.destroy();
        } catch (_) {}
        process.exit(0);
      }, 15000);
    } catch (err) {
      clearTimeout(timeout);
      console.error("setActivity failed:", err && (err.stack || err.message || err));
      process.exit(3);
    }
  });

  client.login({ clientId }).catch((err) => {
    clearTimeout(timeout);
    console.error("Discord RPC login failed:", err && (err.stack || err.message || err));
    console.error("Make sure Discord desktop is open and User Settings > Activity Privacy > Share your detected activities is enabled.");
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
