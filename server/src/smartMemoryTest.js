const {
  loadMemory,
  updateMemory,
} = require("./memoryEngine");

console.log("🧠 SMART MEMORY TEST\n");

console.log("Current memory:");
console.log(
  JSON.stringify(loadMemory(), null, 2)
);

console.log("\n================================");
console.log("TEST 1: Exact duplicate");
console.log("================================\n");

updateMemory({
  user: {
    preferences: [
      "Hindi/Hinglish responses",
    ],
  },
});

console.log("\n================================");
console.log("TEST 2: Similar preference");
console.log("================================\n");

updateMemory({
  user: {
    preferences: [
      "Hindi and Hinglish responses",
    ],
  },
});

console.log("\n================================");
console.log("TEST 3: New preference");
console.log("================================\n");

updateMemory({
  user: {
    preferences: [
      "Give simple explanations",
    ],
  },
});

console.log("\n================================");
console.log("TEST 4: Duplicate project");
console.log("================================\n");

updateMemory({
  user: {
    projects: [
      "BOM Master Pro",
    ],
  },
});

console.log("\n================================");
console.log("FINAL MEMORY");
console.log("================================\n");

console.log(
  JSON.stringify(loadMemory(), null, 2)
);