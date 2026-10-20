export const WORKS_STORAGE_KEY = "obracontrol.obras.v1";

const validStatuses = new Set([
  "planejada",
  "em-andamento",
  "pausada",
  "concluida",
]);

export function readStoredArray(key) {
  let rawValue;
  try {
    rawValue = localStorage.getItem(key);
  } catch {
    return {
      ok: false,
      key,
      rawValue: null,
      records: [],
      error: "O armazenamento local não pôde ser acessado.",
    };
  }

  if (rawValue === null) {
    return { ok: true, key, rawValue, records: [], present: false };
  }

  try {
    const records = JSON.parse(rawValue);
    if (!Array.isArray(records)) {
      return {
        ok: false,
        key,
        rawValue,
        records: [],
        error: "O conteúdo salvo não é uma lista válida.",
      };
    }
    return { ok: true, key, rawValue, records, present: true };
  } catch {
    return {
      ok: false,
      key,
      rawValue,
      records: [],
      error: "O conteúdo salvo não pôde ser interpretado.",
    };
  }
}

export function writeStoredArray(snapshot, records) {
  if (!snapshot?.ok || !Array.isArray(records)) return false;

  try {
    // Do not overwrite a value changed by another tab since it was read.
    if (localStorage.getItem(snapshot.key) !== snapshot.rawValue) return false;
    localStorage.setItem(snapshot.key, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function isValidWorkRecord(work) {
  if (!work || typeof work !== "object" || Array.isArray(work)) return false;
  if (typeof work.id !== "string" || !work.id.trim()) return false;
  if (typeof work.name !== "string" || !work.name.trim()) return false;
  if (!validStatuses.has(work.status)) return false;

  const contractValue = Number(work.contractValue);
  if (!Number.isFinite(contractValue) || contractValue <= 0) return false;

  for (const field of ["received", "spent"]) {
    if (
      work[field] === undefined ||
      work[field] === null ||
      work[field] === ""
    ) {
      continue;
    }
    const amount = Number(work[field]);
    if (!Number.isFinite(amount) || amount < 0) return false;
  }

  return true;
}

export function readWorksSnapshot() {
  const snapshot = readStoredArray(WORKS_STORAGE_KEY);
  if (!snapshot.ok) {
    return { ...snapshot, works: [], invalidRecords: [] };
  }

  const idCounts = new Map();
  for (const record of snapshot.records) {
    if (typeof record?.id === "string" && record.id.trim()) {
      idCounts.set(record.id, (idCounts.get(record.id) || 0) + 1);
    }
  }

  const works = [];
  const invalidRecords = [];
  snapshot.records.forEach((record, index) => {
    const duplicateId =
      typeof record?.id === "string" && idCounts.get(record.id) > 1;
    if (!isValidWorkRecord(record) || duplicateId) {
      invalidRecords.push({ index, record });
      return;
    }
    works.push(record);
  });

  return { ...snapshot, works, invalidRecords };
}
