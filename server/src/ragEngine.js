const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { getDataDir } = require("./config");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getDocsDir() {
  return path.join(getDataDir(), "documents");
}
function getIndexPath() {
  return path.join(getDataDir(), "ragIndex.json");
}

function chunkText(text, size = 500) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedText(text, retries = 3) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [text],
    });
    return response.embeddings[0].values;
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      console.log("Rate limited, waiting 15s...");
      await sleep(15000);
      return embedText(text, retries - 1);
    }
    throw error;
  }
}

async function buildIndex() {
  if (!fs.existsSync(getDocsDir())) {
    fs.mkdirSync(getDocsDir());
  }

  const files = fs.readdirSync(getDocsDir()).filter(
    (f) => f.endsWith(".txt") || f.endsWith(".md")
  );

  const allChunks = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(getDocsDir(), file), "utf8");
    const chunks = chunkText(content);

    for (const chunk of chunks) {
      const vector = await embedText(chunk);
      allChunks.push({ text: chunk, source: file, vector });
      console.log(`Embedded chunk from ${file}`);
      await sleep(2000);
    }
  }

  fs.writeFileSync(getIndexPath(), JSON.stringify(allChunks, null, 2));
  console.log(`Index built: ${allChunks.length} chunks.`);
}

async function searchRag(query, topK = 3) {
  if (!fs.existsSync(getIndexPath())) {
    return [];
  }

  const index = JSON.parse(fs.readFileSync(getIndexPath(), "utf8"));
  if (index.length === 0) {
    return [];
  }

  const queryVector = await embedText(query);

  const scored = index.map((item) => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

module.exports = { buildIndex, searchRag };