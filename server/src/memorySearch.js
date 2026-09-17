const {
  loadMemory,
  normalizeText,
} = require("./memoryEngine");

// ========================================
// GET ALL MEMORY ITEMS
// ========================================

function getAllMemories(memory) {
  const results = [];

  const user = memory.user || {};

  // Name
  if (user.name) {
    results.push({
      type: "name",
      text: user.name,
    });
  }

  // Preferences
  if (Array.isArray(user.preferences)) {
    user.preferences.forEach((item) => {
      results.push({
        type: "preference",
        text: item,
      });
    });
  }

  // Projects
  if (Array.isArray(user.projects)) {
    user.projects.forEach((item) => {
      results.push({
        type: "project",
        text: item,
      });
    });
  }

  // Important facts
  if (Array.isArray(user.importantFacts)) {
    user.importantFacts.forEach((item) => {
      results.push({
        type: "importantFact",
        text: item,
      });
    });
  }

  return results;
}

// ========================================
// GET QUERY KEYWORDS
// ========================================

function getKeywords(text) {
  const normalized = normalizeText(text);

  const stopWords = new Set([
    "the",
    "is",
    "am",
    "are",
    "was",
    "were",
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "which",
    "can",
    "could",
    "would",
    "should",
    "about",
    "tell",
    "me",
    "my",
    "your",
    "you",
    "hai",
    "ho",
    "ka",
    "ke",
    "ki",
    "ko",
    "mein",
    "mai",
    "mera",
    "meri",
    "mere",
    "mujhe",
    "batao",
    "bata",
    "kya",
    "par",
    "pe",
    "se",
    "and",
    "or",
    "for",
    "with",
    "from",
    "please",
    "do",
    "dena",
    "deni",
  ]);

  return normalized
    .split(" ")
    .filter(
      (word) =>
        word.length > 2 &&
        !stopWords.has(word)
    );
}

// ========================================
// CALCULATE MEMORY SCORE
// ========================================

function calculateScore(query, memoryText) {
  const queryWords = getKeywords(query);
  const memoryWords = getKeywords(memoryText);

  if (
    queryWords.length === 0 ||
    memoryWords.length === 0
  ) {
    return 0;
  }

  let score = 0;

  queryWords.forEach((queryWord) => {
    memoryWords.forEach((memoryWord) => {
      // Exact match
      if (queryWord === memoryWord) {
        score += 3;
      }

      // Partial match
      else if (
        queryWord.includes(memoryWord) ||
        memoryWord.includes(queryWord)
      ) {
        score += 1;
      }
    });
  });

  return score;
}

// ========================================
// SEARCH MEMORY
// ========================================

function searchMemory(query, limit = 5) {
  if (
    !query ||
    typeof query !== "string" ||
    !query.trim()
  ) {
    return [];
  }

  const memory = loadMemory();
  const normalizedQuery = normalizeText(query);

  const memories = getAllMemories(memory);

  // ========================================
  // QUERY INTENT
  // ========================================

  const intent = {
    name:
      normalizedQuery.includes("name") ||
      normalizedQuery.includes("naam"),

    preference:
      normalizedQuery.includes("language") ||
      normalizedQuery.includes("answer") ||
      normalizedQuery.includes("response") ||
      normalizedQuery.includes("preference") ||
      normalizedQuery.includes("pasand"),

    project:
      normalizedQuery.includes("project") ||
      normalizedQuery.includes("kaam") ||
      normalizedQuery.includes("work"),
  };

  const results = memories
    .map((item) => {
      let score = calculateScore(
        query,
        item.text
      );

      // Name intent
      if (
        intent.name &&
        item.type === "name"
      ) {
        score += 10;
      }

      // Preference intent
      if (
        intent.preference &&
        item.type === "preference"
      ) {
        score += 10;
      }

      // Project intent
      if (
        intent.project &&
        item.type === "project"
      ) {
        score += 10;
      }

      return {
        ...item,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

// ========================================
// FORMAT MEMORY CONTEXT
// ========================================

function formatMemoryContext(results) {
  if (
    !results ||
    results.length === 0
  ) {
    return "";
  }

  const lines = results.map(
    (item) =>
      `- ${item.type}: ${item.text}`
  );

  return `Relevant user memory:\n${lines.join(
    "\n"
  )}`;
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  getAllMemories,
  getKeywords,
  calculateScore,
  searchMemory,
  formatMemoryContext,
};