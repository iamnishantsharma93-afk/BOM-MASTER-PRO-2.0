export function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
    .replace(/\//g, "");
}

export const DEFAULT_FIELD_ALIASES = {
  component: [
    "material",
    "item code",
    "itemcode",
    "item_code",
    "component code",
    "part number",
    "part no",
    "material code",
  ],
  finishedGood: [
    "model",
    "fg",
    "finished good",
    "parent",
    "top level",
    "assembly",
    "finished goods",
  ],
  quantity: [
    "qty",
    "quantity",
    "qps",
    "component quantity",
  ],
  uom: ["uom", "unit", "uom code"],
  process: [
    "process",
    "process name",
    "manufacturing process",
  ],
  location: [
    "location",
    "locations",
    "component location",
    "part location",
  ],
  mainAlt: [
    "main/alt",
    "main alt",
    "mainalt",
    "main or alt",
    "main/alternate",
    "main alternate",
    "alternate",
  ],
};

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from(
    { length: rows },
    (_, i) => [i, ...Array(cols - 1).fill(0)]
  );

  for (let j = 1; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function bestFuzzyMatch(normalizedHeaders, normalizedAliases) {
  let best = null;
  let bestSimilarity = 0;

  normalizedHeaders.forEach(({ original, normalized }) => {
    normalizedAliases.forEach((alias) => {
      if (!normalized || !alias) return;

      const distance = levenshteinDistance(normalized, alias);
      const maxLen = Math.max(normalized.length, alias.length);
      const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;

      if (similarity >= 0.75 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        best = original;
      }
    });
  });

  return best;
}

export function detectColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));
  const normalizedAliases = aliases.map(normalizeHeader);

  const exact = normalizedHeaders.find((header) =>
    normalizedAliases.includes(header.normalized)
  );

  return exact?.original ||
    bestFuzzyMatch(normalizedHeaders, normalizedAliases);
}

export function detectColumns(
  headers,
  fieldAliases = DEFAULT_FIELD_ALIASES
) {
  return Object.fromEntries(
    Object.entries(fieldAliases).map(([field, aliases]) => [
      field,
      detectColumn(headers, aliases),
    ])
  );
}
