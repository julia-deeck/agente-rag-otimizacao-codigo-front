import type { AnalysisResultRecord, ConversationRecord, EditorFileRecord, ProjectRecord } from "../layout/conversationTypes";

export const MAX_WORKSPACE_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_CONVERSATIONS = 500;
export const MAX_PROJECTS = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function isProjectRecord(value: unknown): value is ProjectRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 80 &&
    typeof value.description === "string" && value.description.length <= 500 &&
    (value.language === "OpenQASM 2" || value.language === "Python / Qiskit") &&
    typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) &&
    (value.isPinned === undefined || typeof value.isPinned === "boolean");
}

function isEditorFile(value: unknown): value is EditorFileRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 120 &&
    (value.language === "qasm" || value.language === "python") &&
    typeof value.content === "string" && value.content.length <= 500_000 &&
    (value.isDirty === undefined || typeof value.isDirty === "boolean");
}

function isAttachment(value: unknown) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.name === "string" && value.name.length > 0 && value.name.length <= 255 &&
    typeof value.size === "number" && Number.isSafeInteger(value.size) && value.size >= 0 && value.size <= 25 * 1024 * 1024 &&
    typeof value.type === "string" && value.type.length <= 120;
}

function isAnalysisResult(value: unknown): value is AnalysisResultRecord {
  if (!isRecord(value) || typeof value.summary !== "string" || value.summary.length > 100_000) return false;
  if (!Array.isArray(value.suggestions) || value.suggestions.length > 30 || !value.suggestions.every((item) =>
    isRecord(item) && typeof item.title === "string" && item.title.length <= 300 &&
    typeof item.description === "string" && item.description.length <= 20_000 &&
    typeof item.rationale === "string" && item.rationale.length <= 20_000 &&
    (item.code === undefined || (typeof item.code === "string" && item.code.length <= 500_000)))) return false;
  if (!Array.isArray(value.sources) || value.sources.length > 100 || !value.sources.every((item) =>
    isRecord(item) && typeof item.title === "string" && item.title.length <= 500 &&
    (item.origin === undefined || (typeof item.origin === "string" && item.origin.length <= 500)) &&
    (item.excerpt === undefined || (typeof item.excerpt === "string" && item.excerpt.length <= 20_000)) &&
    (item.url === undefined || (typeof item.url === "string" && item.url.length <= 2_000)))) return false;
  if (value.warnings !== undefined && (!Array.isArray(value.warnings) || value.warnings.length > 100 ||
    !value.warnings.every((warning) => typeof warning === "string" && warning.length <= 2_000))) return false;
  if (value.requestId !== undefined && (typeof value.requestId !== "string" || value.requestId.length > 160)) return false;
  if (value.metrics !== undefined) {
    if (!isRecord(value.metrics)) return false;
    const numbers = [value.metrics.depthBefore, value.metrics.depthAfter, value.metrics.gatesBefore, value.metrics.gatesAfter];
    if (numbers.some((number) => number !== undefined && (typeof number !== "number" || !Number.isFinite(number) || number < 0))) return false;
  }
  return true;
}

export function isConversationRecord(value: unknown): value is ConversationRecord {
  if (!isRecord(value)) return false;
  const attachmentsValid = value.attachments === undefined ||
    (Array.isArray(value.attachments) && value.attachments.length <= 10 && value.attachments.every(isAttachment));
  const codeFilesValid = value.codeFiles === undefined ||
    (Array.isArray(value.codeFiles) && value.codeFiles.length <= 30 && value.codeFiles.every(isEditorFile));
  const analysisResultValid = value.analysisResult === undefined || isAnalysisResult(value.analysisResult);
  return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 160 &&
    typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 200 &&
    typeof value.prompt === "string" && value.prompt.length <= 20_000 &&
    typeof value.qasmCode === "string" && value.qasmCode.length <= 500_000 &&
    typeof value.pythonCode === "string" && value.pythonCode.length <= 500_000 &&
    (value.activeLanguage === "qasm" || value.activeLanguage === "python") &&
    (value.backend === undefined || (typeof value.backend === "string" && value.backend.length <= 120)) &&
    (value.topK === undefined || ["3", "5", "8", "10"].includes(String(value.topK))) &&
    (value.createdAt === undefined || (typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)))) &&
    (value.isPinned === undefined || typeof value.isPinned === "boolean") &&
    (value.projectId === undefined || (typeof value.projectId === "string" && value.projectId.length <= 160)) &&
    attachmentsValid && codeFilesValid && analysisResultValid;
}

export function parseUniqueRecords<T extends { id: string }>(
  values: unknown[], isValid: (value: unknown) => value is T, limit: number,
) {
  const records: T[] = [];
  const ids = new Set<string>();
  let invalid = values.length > limit;
  for (const value of values.slice(0, limit)) {
    if (!isValid(value) || ids.has(value.id)) {
      invalid = true;
      continue;
    }
    ids.add(value.id);
    records.push(value);
  }
  return { records, invalid };
}
