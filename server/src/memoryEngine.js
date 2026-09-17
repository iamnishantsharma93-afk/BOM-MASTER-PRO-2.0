const fs = require("fs");
const path = require("path");

const { getDataDir } = require("./config");
function getMemoryPath() {
  return path.join(getDataDir(), "memory.json");
}

function getDefaultMemory() {
  return {
    user: {
      name: null,
      preferences: [],
      projects: [],
      importantFacts: [],
    },
  };
}

function loadMemory() {
  try {
    if (!fs.existsSync(getMemoryPath())) {
      const memory = getDefaultMemory();

      fs.writeFileSync(
        getMemoryPath(),
        JSON.stringify(memory, null, 2)
      );

      return memory;
    }

    const data = fs.readFileSync(getMemoryPath(), "utf8");

    const memory = JSON.parse(data);

    if (!memory.user) {
      memory.user = {};
    }

    if (!Array.isArray(memory.user.preferences)) {
      memory.user.preferences = [];
    }

    if (!Array.isArray(memory.user.projects)) {
      memory.user.projects = [];
    }

    if (!Array.isArray(memory.user.importantFacts)) {
      memory.user.importantFacts = [];
    }

    if (!("name" in memory.user)) {
      memory.user.name = null;
    }

    return memory;
  } catch (error) {
    console.error("❌ Memory load error:", error);

    return getDefaultMemory();
  }
}

function saveMemory(memory) {
  try {
    fs.writeFileSync(
      getMemoryPath(),
      JSON.stringify(memory, null, 2)
    );

    console.log("🧠 Memory saved successfully.");

    return true;
  } catch (error) {
    console.error("❌ Memory save error:", error);

    return false;
  }
}

// ========================================
// NORMALIZE TEXT
// ========================================

function normalizeText(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.!?,/\\-_:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ========================================
// SMART SIMILARITY CHECK
// ========================================

function areSimilar(a, b) {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) {
    return false;
  }

  // Exact match
  if (first === second) {
    return true;
  }

  // One contains the other
  if (
    first.includes(second) ||
    second.includes(first)
  ) {
    return true;
  }

  // Compare words
  const wordsA = new Set(first.split(" "));
  const wordsB = new Set(second.split(" "));

  const commonWords = [...wordsA].filter((word) =>
    wordsB.has(word)
  );

  const smallerLength = Math.min(
    wordsA.size,
    wordsB.size
  );

  if (smallerLength === 0) {
    return false;
  }

  const similarity =
    commonWords.length / smallerLength;

  return similarity >= 0.7;
}

// ========================================
// ADD UNIQUE SMART ITEM
// ========================================

function addSmartItem(list, value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  const cleanValue = value.trim();

  if (!cleanValue) {
    return false;
  }

  const alreadyExists = list.some((existingItem) =>
    areSimilar(existingItem, cleanValue)
  );

  if (alreadyExists) {
    console.log(
      `🧠 Similar memory already exists: "${cleanValue}"`
    );

    return false;
  }

  list.push(cleanValue);

  console.log(
    `🧠 New memory added: "${cleanValue}"`
  );

  return true;
}

// ========================================
// UPDATE MEMORY
// ========================================

function updateMemory(extractedMemory) {
  const memory = loadMemory();

  if (
    !extractedMemory ||
    typeof extractedMemory !== "object"
  ) {
    return memory;
  }

  const user = extractedMemory.user || {};

  let changed = false;

  // ========================================
  // NAME
  // ========================================

  if (
    typeof user.name === "string" &&
    user.name.trim()
  ) {
    const newName = user.name.trim();

    if (
      !memory.user.name ||
      normalizeText(memory.user.name) !==
        normalizeText(newName)
    ) {
      memory.user.name = newName;

      console.log(
        `🧠 Name updated: ${newName}`
      );

      changed = true;
    }
  }

  // ========================================
  // PREFERENCES
  // ========================================

  if (Array.isArray(user.preferences)) {
    user.preferences.forEach((item) => {
      if (
        addSmartItem(
          memory.user.preferences,
          item
        )
      ) {
        changed = true;
      }
    });
  }

  // ========================================
  // PROJECTS
  // ========================================

  if (Array.isArray(user.projects)) {
    user.projects.forEach((item) => {
      if (
        addSmartItem(
          memory.user.projects,
          item
        )
      ) {
        changed = true;
      }
    });
  }

  // ========================================
  // IMPORTANT FACTS
  // ========================================

  if (Array.isArray(user.importantFacts)) {
    user.importantFacts.forEach((item) => {
      if (
        addSmartItem(
          memory.user.importantFacts,
          item
        )
      ) {
        changed = true;
      }
    });
  }

  // ========================================
  // SAVE ONLY IF CHANGED
  // ========================================

  if (changed) {
    saveMemory(memory);
  } else {
    console.log("🧠 No new memory to save.");
  }

  return memory;
}
// ========================================
// CLEAN DUPLICATE MEMORIES
// ========================================

function cleanDuplicateList(list) {
  const cleaned = [];

  for (const item of list) {
    const exists = cleaned.some((existingItem) =>
      areSimilar(existingItem, item)
    );

    if (!exists) {
      cleaned.push(item);
    } else {
      console.log(
        `🧹 Duplicate removed: "${item}"`
      );
    }
  }

  return cleaned;
}

function cleanMemory() {
  const memory = loadMemory();

  let changed = false;

  const originalPreferences =
    memory.user.preferences.length;

  memory.user.preferences = cleanDuplicateList(
    memory.user.preferences
  );

  if (
    memory.user.preferences.length !==
    originalPreferences
  ) {
    changed = true;
  }

  const originalProjects =
    memory.user.projects.length;

  memory.user.projects = cleanDuplicateList(
    memory.user.projects
  );

  if (
    memory.user.projects.length !==
    originalProjects
  ) {
    changed = true;
  }

  const originalFacts =
    memory.user.importantFacts.length;

  memory.user.importantFacts =
    cleanDuplicateList(
      memory.user.importantFacts
    );

  if (
    memory.user.importantFacts.length !==
    originalFacts
  ) {
    changed = true;
  }

  if (changed) {
    saveMemory(memory);
    console.log("🧹 Memory cleanup completed.");
  } else {
    console.log("🧹 No duplicate memories found.");
  }

  return memory;
}
module.exports = {
  loadMemory,
  saveMemory,
  updateMemory,
  normalizeText,
  areSimilar,
  cleanMemory,
};