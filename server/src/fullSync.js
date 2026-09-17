require("dotenv").config();

async function main() {
  const { runSync } = require("./driveSync");
  await runSync();

  const { buildIndex } = require("./ragEngine");
  await buildIndex();

  const { loadBomFiles } = require("./bomEngine");
  loadBomFiles();

  console.log("✅ Full sync + reindex complete.");
}

main();