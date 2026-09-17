// =========================================================
// SAP BOM GENERATOR - VALIDATOR
// Single responsibility: validate raw values and
// generated SAP rows, returning structured errors.
// =========================================================

// Accepts 1, 1.0, 2.5, "5". Rejects negative,
// NaN, and non-numeric text.
export function validateQuantity(rawValue) {
  const text = String(rawValue ?? "").trim();

  if (text === "") {
    return {
      valid: false,
      value: null,
      error: "Quantity is empty.",
    };
  }

  const numeric = Number(text);

  if (Number.isNaN(numeric)) {
    return {
      valid: false,
      value: null,
      error: `Quantity "${rawValue}" is not a number.`,
    };
  }

  if (numeric < 0) {
    return {
      valid: false,
      value: null,
      error: `Quantity "${rawValue}" is negative.`,
    };
  }

  return { valid: true, value: numeric, error: null };
}

export function validateComponentCode(rawValue) {
  const text = String(rawValue ?? "").trim();

  if (text === "") {
    return {
      valid: false,
      error: "Component code is empty.",
    };
  }

  return { valid: true, error: null };
}

// Validates one generated SAP row, returning a list
// of error strings (empty when valid).
export function validateSapRow(row) {
  const errors = [];

  if (!row.Material) {
    errors.push("Missing Material (Finished Good).");
  }

  if (!row.Component) {
    errors.push("Missing Component.");
  }

  const qty = validateQuantity(
    row["Component Quantity"]
  );

  if (!qty.valid) {
    errors.push(qty.error);
  }

  if (!row.Plant) {
    errors.push("Missing Plant.");
  }

  return errors;
}

// Validates a full set of generated SAP rows,
// returning { rowIndex, sourceRow, errors }[] for
// rows that have at least one error.
export function validateSapRows(rows) {
  const problems = [];

  rows.forEach((row, index) => {
    const errors = validateSapRow(row);

    if (errors.length) {
      problems.push({
        rowIndex: index,
        sourceRow: row["Source Row"],
        errors,
      });
    }
  });

  return problems;
}
