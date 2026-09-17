require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { buildMemoryContext } = require("./memoryContext");
const { extractMemory } = require("./memoryExtractor");
const { updateMemory } = require("./memoryEngine");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ===============================
// MEMORY SYSTEM
// ===============================

const memoryPath = path.join(__dirname, "memory.json");

function loadMemory() {
  try {
    if (!fs.existsSync(memoryPath)) {
      const defaultMemory = {
        user: {
          name: null,
        },
      };

      fs.writeFileSync(
        memoryPath,
        JSON.stringify(defaultMemory, null, 2)
      );

      return defaultMemory;
    }

    const data = fs.readFileSync(memoryPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Memory load error:", error);

    return {
      user: {
        name: null,
      },
    };
  }
}

function saveMemory(memory) {
  try {
    fs.writeFileSync(
      memoryPath,
      JSON.stringify(memory, null, 2)
    );

    console.log("🧠 Memory saved.");
  } catch (error) {
    console.error("❌ Memory save error:", error);
  }
}

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "MY-PERSONAL-AI backend is running.",
  });
});

// ===============================
// MEMORY API
// ===============================

app.get("/api/memory", (req, res) => {
  const memory = loadMemory();

  res.json({
    success: true,
    memory,
  });
});

// ===============================
// CHAT API
// ===============================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    // Load existing memory
    const memory = loadMemory();

    // ===============================
    // SIMPLE NAME MEMORY
    // ===============================

    const cleanMessage = message.trim();

const isNameQuestion =
  /^(what is my name|what's my name|mera naam kya hai|mera naam kya h|naam kya hai)\??$/i.test(
    cleanMessage
  );

const nameMatch = !isNameQuestion
  ? cleanMessage.match(
      /(?:my name is|mera naam hai|mera naam)\s+([a-zA-Z]+)/i
    )
  : null;

if (nameMatch) {
  const detectedName = nameMatch[1].trim();

  memory.user.name = detectedName;
  saveMemory(memory);

  console.log(`🧠 Name remembered: ${memory.user.name}`);
}

    // ===============================
    // MEMORY CONTEXT FOR AI
    // ===============================

    let memoryContext = "";

    if (memory.user.name) {
      memoryContext += `
User's name is ${memory.user.name}.
`;
    }

    const contents = history
      .filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.text === "string" &&
          item.text.trim()
      )
      .map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: item.text,
          },
        ],
      }));

    // Add memory instructions before latest message
    if (memoryContext.trim()) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `
SYSTEM MEMORY:
${memoryContext}

Use this memory when answering the user.
Do not say that you are reading a memory file.
`,
          },
        ],
      });
    }

    // Latest user message
  const memoryResult = buildMemoryContext(message);

console.log("🧠 Memory context:");

if (memoryResult.hasMemory) {
  console.log(memoryResult.context);
} else {
  console.log("No relevant memory found.");
}

userPrompt =
  memoryResult.context +
  "\n\nUSER QUESTION:\n" +
  cleanMessage +
  "\n\nUse the memory above only when it is relevant to the user's question." +
  "\nDo not mention the memory system itself." +
  "\nDo not invent or assume personal information that is not present in the memory.";

contents.push({
  role: "user",
  parts: [
    {
      text: userPrompt,
    },
  ],
});

    // ===============================
    // GEMINI
    // ===============================

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
    });
// ===============================
// AUTOMATIC MEMORY EXTRACTION
// ===============================

try {
  const extractedMemory = await extractMemory(message);

  console.log("🧠 Memory extraction result:");
  console.log(JSON.stringify(extractedMemory, null, 2));

  if (extractedMemory.shouldRemember) {
    updateMemory(extractedMemory.memory);

    console.log("🧠 New information added to memory.");
  }
} catch (memoryError) {
  console.error(
    "❌ Automatic memory error:",
    memoryError
  );
}
    res.json({
      success: true,
      reply: response.text,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);

    res.status(500).json({
      success: false,
      error: "AI request failed.",
      details: error.message,
    });
  }
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(
    `🚀 MY-PERSONAL-AI server running at http://localhost:${PORT}`
  );
});