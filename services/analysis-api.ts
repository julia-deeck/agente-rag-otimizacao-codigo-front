export type AnalysisRequest = {
  question: string;
  code: string;
  backend: string;
  top_k?: number;
};

export type AnalysisMetrics = {
  depth_before?: number;
  depth_after?: number;
};

export type AnalysisSource = {
  title: string;
  url?: string;
};

export type AnalysisResponse = {
  request_id: string;
  status: string;
  answer: string;
  metrics?: AnalysisMetrics;
  sources?: AnalysisSource[];
  warnings?: string[];
};

export class AnalysisApiError extends Error {
  requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = "AnalysisApiError";
    this.requestId = requestId;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    return (url.protocol === "https:" || (url.protocol === "http:" && isLoopback)) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateResponse(value: unknown): value is AnalysisResponse {
  if (!isObject(value) || typeof value.request_id !== "string" || value.request_id.length > 160 ||
    typeof value.status !== "string" || value.status.length > 80 ||
    typeof value.answer !== "string" || value.answer.length > MAX_RESPONSE_BYTES) return false;
  if (value.metrics !== undefined) {
    if (!isObject(value.metrics)) return false;
    for (const key of ["depth_before", "depth_after"] as const) {
      const metric = value.metrics[key];
      if (metric !== undefined && (typeof metric !== "number" || !Number.isFinite(metric) || metric < 0)) return false;
    }
  }
  if (value.sources !== undefined && (!Array.isArray(value.sources) || value.sources.length > 100 ||
    !value.sources.every((source) => isObject(source) && typeof source.title === "string" && source.title.length <= 500 &&
      (source.url === undefined || isSafeExternalUrl(source.url))))) return false;
  if (value.warnings !== undefined && (!Array.isArray(value.warnings) || value.warnings.length > 100 ||
    !value.warnings.every((warning) => typeof warning === "string" && warning.length <= 2_000))) return false;
  return true;
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new AnalysisApiError("A resposta da análise ultrapassou o tamanho permitido.");
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new AnalysisApiError("A resposta da análise ultrapassou o tamanho permitido.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

export async function submitAnalysis(payload: AnalysisRequest): Promise<AnalysisResponse> {
  if (!API_BASE_URL) throw new AnalysisApiError("O serviço de análise não está disponível agora.");
  if (typeof payload.question !== "string" || payload.question.length > 20_000 ||
    typeof payload.code !== "string" || payload.code.length > 1_000_000 ||
    typeof payload.backend !== "string" || payload.backend.length > 120 ||
    (payload.top_k !== undefined && ![3, 5, 8, 10].includes(payload.top_k))) {
    throw new AnalysisApiError("Os dados enviados para análise são inválidos ou excedem o limite permitido.");
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/api/v1/analyses", API_BASE_URL);
  } catch {
    throw new AnalysisApiError("O endereço do serviço de análise está inválido.");
  }
  const isLoopback = endpoint.hostname === "localhost" || endpoint.hostname === "127.0.0.1" || endpoint.hostname === "[::1]";
  if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && isLoopback)) || endpoint.username || endpoint.password) {
    throw new AnalysisApiError("A conexão com o serviço precisa usar um endereço HTTPS seguro.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await readLimitedJson(response);
    if (!response.ok) {
      const errorData = isObject(data) ? data : {};
      const requestId = typeof errorData.request_id === "string" && errorData.request_id.length <= 160
        ? errorData.request_id
        : undefined;
      throw new AnalysisApiError("Não foi possível concluir a análise. Revise os dados e tente novamente.", requestId);
    }
    if (!validateResponse(data)) throw new AnalysisApiError("O serviço retornou uma resposta inválida. Tente novamente.");
    return data;
  } catch (error) {
    if (error instanceof AnalysisApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AnalysisApiError("A análise demorou mais que o esperado. Tente novamente.");
    }
    throw new AnalysisApiError("Não foi possível conectar ao serviço de análise. Verifique a conexão e tente novamente.");
  } finally {
    window.clearTimeout(timeout);
  }
}
