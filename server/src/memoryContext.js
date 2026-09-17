const {
  searchMemory,
} = require("./memorySearch");

// ========================================
// BUILD MEMORY CONTEXT
// ========================================

function buildMemoryContext(query, limit = 5) {
  const results = searchMemory(query, limit);

  if (!results || results.length === 0) {
    return {
      hasMemory: false,
      context: "",
      memories: [],
    };
  }

  const grouped = {
    name: [],
    preference: [],
    project: [],
    importantFact: [],
  };

  results.forEach((item) => {
    if (grouped[item.type]) {
      grouped[item.type].push(item.text);
    }
  });

  const sections = [];

  // ========================================
  // NAME
  // ========================================

  if (grouped.name.length > 0) {
    sections.push(
      `Name: ${grouped.name.join(", ")}`
    );
  }

  // ========================================
  // PREFERENCES
  // ========================================

  if (grouped.preference.length > 0) {
    sections.push(
      `Preferences:\n${grouped.preference
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  // ========================================
  // PROJECTS
  // ========================================

  if (grouped.project.length > 0) {
    sections.push(
      `Projects:\n${grouped.project
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  // ========================================
  // IMPORTANT FACTS
  // ========================================

  if (grouped.importantFact.length > 0) {
    sections.push(
      `Important facts:\n${grouped.importantFact
        .map((item) => `- ${item}`)
        .join("\n")}`
    );
  }

  const context = [
    "USER MEMORY",
    "============",
    sections.join("\n\n"),
  ].join("\n");

  return {
    hasMemory: true,
    context,
    memories: results,
  };
}

module.exports = {
  buildMemoryContext,
};