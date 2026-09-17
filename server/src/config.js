const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");
const DEFAULT_DATA_DIR = __dirname;

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { dataDir: DEFAULT_DATA_DIR, storageMode: "local" };
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  return {
    dataDir: raw.dataDir && raw.dataDir.trim() !== "" ? raw.dataDir : DEFAULT_DATA_DIR,
    storageMode: raw.storageMode || "local"
  };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function getDataDir() {
  return loadConfig().dataDir;
}

function getStorageMode() {
  return loadConfig().storageMode;
}

function setDataDir(newDir) {
  const config = loadConfig();
  config.dataDir = newDir;
  saveConfig(config);
}

function setStorageMode(mode) {
  const config = loadConfig();
  config.storageMode = mode;
  saveConfig(config);
}

module.exports = { getDataDir, getStorageMode, setDataDir, setStorageMode };