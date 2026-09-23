require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { buildMemoryContext } = require("./memoryContext");
const { extractMemory } = require("./memoryExtractor");
const { updateMemory } = require("./memoryEngine");
const { searchBomList, loadBomFiles, searchModels, getRowsByModel, getLibrarySummary, deleteModel, searchItemOccurrences, getItemSuggestions, getDistinctValues, filterItems, addAlternateItem, getAlternateReport} = require("./bomEngine");

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

const { getDataDir, getStorageMode, setDataDir, setStorageMode } = require("./config");
function getMemoryPath() {
  return path.join(getDataDir(), "memory.json");
}

function loadMemory() {
  try {
    if (!fs.existsSync(getMemoryPath())) {
      const defaultMemory = {
        user: {
          name: null,
        },
      };

      fs.writeFileSync(
        getMemoryPath(),
        JSON.stringify(defaultMemory, null, 2)
      );

      return defaultMemory;
    }

    const data = fs.readFileSync(getMemoryPath(), "utf8");
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
      getMemoryPath(),
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

app.get("/api/settings", (req, res) => {
  res.json({
    success: true,
    dataDir: getDataDir(),
    storageMode: getStorageMode(),
  });
});

app.post("/api/settings", (req, res) => {
  const { dataDir, storageMode } = req.body;

  if (dataDir && typeof dataDir === "string") {
    setDataDir(dataDir);
  }

  if (storageMode && (storageMode === "local" || storageMode === "drive")) {
    setStorageMode(storageMode);
  }

  res.json({
    success: true,
    dataDir: getDataDir(),
    storageMode: getStorageMode(),
  });
});

app.get("/api/memory", (req, res) => {
  const memory = loadMemory();

  res.json({
    success: true,
    memory,
  });
});
app.get("/api/bom/search", (req, res) => {
  const query = req.query.q || "";
  const results = searchBomList(query, 15);

  res.json({
    success: true,
    results,
  });
});
app.get("/api/bom/models", (req, res) => {
  const query = req.query.q || "";
  const models = searchModels(query, 50);

  res.json({
    success: true,
    models,
  });
});

app.get("/api/bom/rows", (req, res) => {
  const model = req.query.model || "";
  const rows = getRowsByModel(model);

  res.json({
    success: true,
    rows,
  });
});

app.get("/api/bom/library", (req, res) => {
  res.json({ success: true, library: getLibrarySummary() });
});

app.post("/api/bom/upload", (req, res) => {
  try {
    const { files } = req.body;

    if (!Array.isArray(files) || !files.length) {
      return res.status(400).json({ success: false, error: "No files provided." });
    }

    const dir = path.join(getDataDir(), "documents", "bom");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    files.forEach((f) => {
      const safeName = path.basename(f.name);

      if (!/\.(xlsx|xls)$/i.test(safeName)) {
        throw new Error(`Invalid file type: ${safeName}`);
      }

      fs.writeFileSync(path.join(dir, safeName), Buffer.from(f.base64, "base64"));
    });

    const rows = loadBomFiles();

    res.json({ success: true, count: files.length, totalRows: rows.length });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/bom/file", (req, res) => {
  try {
    const safeName = path.basename(req.query.fileName || "");
    const filePath = path.join(getDataDir(), "documents", "bom", safeName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const rows = loadBomFiles();

    res.json({ success: true, totalRows: rows.length });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/bom/model", (req, res) => {
  try {
    const result = deleteModel(req.query.model);
    res.json({ success: result.ok, ...result });
  } catch (error) {
    console.error("❌ Delete model error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/item/suggestions", (req, res) => {
  const suggestions = getItemSuggestions(req.query.q);
  res.json({ success: true, suggestions });
});

app.get("/api/item/occurrences", (req, res) => {
  const rows = searchItemOccurrences(req.query.q);
  res.json({ success: true, rows });
});

app.get("/api/item/fields", (req, res) => {
  res.json({
    success: true,
    obu: getDistinctValues("OBU"),
    process: getDistinctValues("Process"),
    maker: getDistinctValues("Maker"),
  });
});

app.get("/api/item/filter", (req, res) => {
  const rows = filterItems({
    obu: req.query.obu,
    process: req.query.process,
    maker: req.query.maker,
    partName: req.query.partName,
    itemCode: req.query.itemCode,
    spec: req.query.spec,
  });

  res.json({ success: true, rows });
});

app.post("/api/item/add-alternate", (req, res) => {
  try {
    const results = addAlternateItem(req.body);
    res.json({ success: true, results });
  } catch (error) {
    console.error("❌ Add alternate error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/report/alternates", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const all = getAlternateReport();

  const filtered = q
    ? all.filter((r) => r.mainItemCode.toLowerCase().includes(q))
    : all;

  res.json({ success: true, rows: filtered });
});

app.post("/api/bom/reindex", (req, res) => {
  try {
    const rows = loadBomFiles();

    res.json({
      success: true,
      count: rows.length,
    });
  } catch (error) {
    console.error("❌ Reindex error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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

const lowerMessage = cleanMessage.toLowerCase();

const isNameQuestion = /(mera\s*naam\s*kya|naam\s*kya|what'?s\s*my\s*name|what\s*is\s*my\s*name)/i.test(
  lowerMessage
);

const isGeneralQuestion = /\?\s*$|\b(kya|kaun|kaunsi|kaunsa|kab|kahan|kyu|kyun|how|what|where|when|why|who|which)\b/i.test(
  lowerMessage
);

const nameMatch = !isNameQuestion
  ? cleanMessage.match(
      /(?:my name is|mera naam hai|mera naam)\s+([a-zA-Z]+)/i
    )
  : null;

if (isNameQuestion && memory.user.name) {
  console.log(
    `🧠 Direct name answer: ${memory.user.name}`
  );

  return res.json({
    success: true,
    reply: `Aapka naam ${memory.user.name} hai.`,
  });
}

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
  const { searchRag } = require("./ragEngine");
  const ragResults = await searchRag(cleanMessage);
  const ragContext = ragResults.length
    ? "RELEVANT DOCUMENTS:\n" + ragResults.map((r) => r.text).join("\n---\n")
    : "";

  const { searchBom } = require("./bomEngine");
  const bomResults = searchBom(cleanMessage);
  const bomContext = bomResults.length
    ? "BOM DATA (exact rows, use these numbers as-is, do not guess):\n" +
      bomResults.map((r) => JSON.stringify(r)).join("\n")
    : "";

  const memoryResult = buildMemoryContext(message);

console.log("🧠 Memory context:");

if (memoryResult.hasMemory) {
  console.log(memoryResult.context);
} else {
  console.log("No relevant memory found.");
}

userPrompt =
  bomContext + "\n\n" +
  ragContext + "\n\n" +
  memoryResult.context +
  "\n\nUSER QUESTION:\n" +
  cleanMessage +
  "\n\nUse the memory above only when it is relevant to the user's question." +
  "\nDo not mention the memory system itself." +
  "\nDo not invent or assume personal information that is not present in the memory." +
  "\n\nIMPORTANT LANGUAGE RULE: Reply in the SAME language/style the user used in their question. If the question is in plain English, reply in plain English. If the question is in Hindi/Hinglish, reply in Hinglish. Do not mix languages unless the user did.";

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
      model: "gemini-3.6-flash",
      contents,
    });
// ===============================
// AUTOMATIC MEMORY EXTRACTION
// ===============================

if (isNameQuestion || isGeneralQuestion) {
  console.log("🧠 Skipping Gemini memory extraction (local name-question detected).");
} else {
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