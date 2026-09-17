require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function extractMemory(message) {
  try {
    const prompt = `
You are the memory extraction module of a personal AI assistant.

Your job is to identify ONLY information from the user's message
that is useful for remembering in future conversations.

IMPORTANT RULES:

1. Do NOT save normal questions.
2. Do NOT save temporary or casual statements.
3. Do NOT save greetings.
4. Do NOT treat questions as facts.
5. Only extract information that is reasonably useful long-term.
6. If there is nothing worth remembering, return shouldRemember=false.
7. Never invent information.
8. Return ONLY valid JSON.
9. Do not use markdown.
10. Keep memory concise.

NAME EXTRACTION RULES:

11. ONLY extract a user's name when the user clearly states their name
as a fact.

Valid examples:
- "My name is Nishant."
- "Mera naam Nishant hai."
- "I am Nishant."
- "You can call me Nishant."

Invalid examples:
- "Mera naam kya hai?"
- "What is my name?"
- "Naam kya hai?"
- "Mera naam kya h?"
- Any question containing "kya", "what", "which", etc.

IMPORTANT:
Never use words such as "kya", "hai", "naam", "what", "my", "is"
as a person's name.

If the message is asking what the user's name is,
name MUST be null.

Memory categories:

- name
- preferences
- projects
- importantFacts

Examples:

User:
"My name is Nishant."

Return:
{
  "shouldRemember": true,
  "memory": {
    "user": {
      "name": "Nishant",
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}

User:
"Mera naam Nishant hai."

Return:
{
  "shouldRemember": true,
  "memory": {
    "user": {
      "name": "Nishant",
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}

User:
"Mera naam kya hai?"

Return:
{
  "shouldRemember": false,
  "memory": {
    "user": {
      "name": null,
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}

User:
"What is my name?"

Return:
{
  "shouldRemember": false,
  "memory": {
    "user": {
      "name": null,
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}

User:
"I prefer answers in Hindi."

Return:
{
  "shouldRemember": true,
  "memory": {
    "user": {
      "name": null,
      "preferences": ["Hindi responses"],
      "projects": [],
      "importantFacts": []
    }
  }
}

User:
"I am working on a project called BOM Master Pro."

Return:
{
  "shouldRemember": true,
  "memory": {
    "user": {
      "name": null,
      "preferences": [],
      "projects": ["BOM Master Pro"],
      "importantFacts": []
    }
  }
}

User:
"What is an IPM?"

Return:
{
  "shouldRemember": false,
  "memory": {
    "user": {
      "name": null,
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}

User message:
${message}

Return ONLY this JSON structure:

{
  "shouldRemember": true or false,
  "memory": {
    "user": {
      "name": null,
      "preferences": [],
      "projects": [],
      "importantFacts": []
    }
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    let text = response.text.trim();

    // Remove accidental markdown code fences
    text = text
      .replace(/^```json\\s*/i, "")
      .replace(/^```\\s*/i, "")
      .replace(/\\s*```$/i, "")
      .trim();

    const result = JSON.parse(text);

    // Final safety check:
    // Never allow obvious question words to become a user's name.
    if (result?.memory?.user?.name) {
      const invalidNames = [
        "kya",
        "hai",
        "naam",
        "what",
        "my",
        "is",
        "h",
      ];

      const extractedName = String(
        result.memory.user.name
      )
        .trim()
        .toLowerCase();

      if (invalidNames.includes(extractedName)) {
        result.shouldRemember = false;
        result.memory.user.name = null;
      }
    }

    return result;
  } catch (error) {
    console.error("❌ Memory extraction error:", error);

    return {
      shouldRemember: false,
      memory: {
        user: {
          name: null,
          preferences: [],
          projects: [],
          importantFacts: [],
        },
      },
    };
  }
}

module.exports = {
  extractMemory,
};
