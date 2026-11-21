export type AccountApiErrorCode =
  | "network"
  | "timeout"
  | "invalid-code"
  | "expired-code"
  | "rate-limited"
  | "too-many-attempts"
  | "validation"
  | "not-found"
  | "service";

export class AccountApiError extends Error {
  code: AccountApiErrorCode;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(code: AccountApiErrorCode, message: string, options?: { requestId?: string; retryAfterSeconds?: number }) {
    super(message);
    this.name = "AccountApiError";
    this.code = code;
    this.requestId = options?.requestId;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export type PasswordCodeChallenge = {
  challengeId: string;
  maskedEmail?: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export type PasswordResetAuthorization = {
  resetToken: string;
  expiresInSeconds: number;
};

type ApiErrorPayload = {
  code?: unknown;
  message?: unknown;
  requestId?: unknown;
  retryAfterSeconds?: unknown;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

function getRequestUrl(path: string) {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(path, base);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) || url.username || url.password) {
    throw new AccountApiError("service", "A conexão de conta precisa usar um endereço HTTPS seguro.");
  }
  return url.toString();
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new AccountApiError("service", "A resposta do serviço excedeu o limite permitido.");
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new AccountApiError("service", "A resposta do serviço excedeu o limite permitido.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
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

function mapApiError(status: number, payload: ApiErrorPayload): AccountApiError {
  const serverCode = typeof payload.code === "string" ? payload.code.toUpperCase() : "";
  const retryAfterSeconds = typeof payload.retryAfterSeconds === "number" && Number.isFinite(payload.retryAfterSeconds)
    ? Math.min(3600, Math.max(0, payload.retryAfterSeconds))
    : undefined;
  const requestId = typeof payload.requestId === "string" && payload.requestId.length <= 160 ? payload.requestId : undefined;

  if (serverCode === "INVALID_CODE") return new AccountApiError("invalid-code", "O código não confere. Revise e tente novamente.", { requestId });
  if (serverCode === "CODE_EXPIRED" || serverCode === "RESET_TOKEN_EXPIRED") return new AccountApiError("expired-code", "A confirmação expirou. Solicite um novo código.", { requestId });
  if (serverCode === "TOO_MANY_ATTEMPTS") return new AccountApiError("too-many-attempts", "O limite de tentativas foi atingido. Solicite um novo código.", { requestId });
  if (status === 429 || serverCode === "RATE_LIMITED") return new AccountApiError("rate-limited", "Aguarde um pouco antes de tentar novamente.", { requestId, retryAfterSeconds });
  if (status === 404 || serverCode === "USER_NOT_FOUND") return new AccountApiError("not-found", "Não foi possível iniciar a confirmação. Confira o endereço e tente novamente.", { requestId });
  if (status === 400 || serverCode === "VALIDATION_ERROR") return new AccountApiError("validation", "Confira os dados informados e tente novamente.", { requestId });
  return new AccountApiError("service", "Não foi possível concluir esta etapa agora. Tente novamente.", { requestId, retryAfterSeconds });
}

async function post<T>(path: string, payload: unknown, validate: (value: unknown) => value is T): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getRequestUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const body: unknown = response.status === 204 ? {} : await readLimitedJson(response);
    if (!response.ok) {
      const payloadError = body && typeof body === "object" ? body as ApiErrorPayload : {};
      const retryAfterHeader = Number(response.headers.get("Retry-After"));
      throw mapApiError(response.status, {
        ...payloadError,
        retryAfterSeconds: payloadError.retryAfterSeconds ?? (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : undefined),
      });
    }
    if (!validate(body)) throw new AccountApiError("service", "Recebemos uma resposta inesperada. Tente novamente.");
    return body;
  } catch (error) {
    if (error instanceof AccountApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AccountApiError("timeout", "A solicitação demorou mais que o esperado. Tente novamente.");
    }
    throw new AccountApiError("network", "Não foi possível conectar agora. Verifique sua conexão e tente novamente.");
  } finally {
    window.clearTimeout(timeout);
  }
}

function isPasswordCodeChallenge(value: unknown): value is PasswordCodeChallenge {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PasswordCodeChallenge>;
  return typeof result.challengeId === "string" && result.challengeId.length > 0 && result.challengeId.length <= 512 &&
    typeof result.expiresInSeconds === "number" && Number.isFinite(result.expiresInSeconds) && result.expiresInSeconds > 0 && result.expiresInSeconds <= 86_400 &&
    typeof result.resendAfterSeconds === "number" && Number.isFinite(result.resendAfterSeconds) && result.resendAfterSeconds >= 0 && result.resendAfterSeconds <= 3600 &&
    (result.maskedEmail === undefined || (typeof result.maskedEmail === "string" && result.maskedEmail.length <= 254));
}

function isPasswordResetAuthorization(value: unknown): value is PasswordResetAuthorization {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PasswordResetAuthorization>;
  return typeof result.resetToken === "string" && result.resetToken.length > 0 && result.resetToken.length <= 4096 &&
    typeof result.expiresInSeconds === "number" && Number.isFinite(result.expiresInSeconds) && result.expiresInSeconds > 0 && result.expiresInSeconds <= 3600;
}

export function requestPasswordCode(email: string) {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Promise.reject(new AccountApiError("validation", "Confira o endereço de e-mail e tente novamente."));
  }
  return post("/api/auth/password-reset/request", { email }, isPasswordCodeChallenge);
}

export function verifyPasswordCode(input: { email: string; challengeId: string; code: string }) {
  if (!input || typeof input.email !== "string" || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
    typeof input.challengeId !== "string" || input.challengeId.length > 512 ||
    typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    return Promise.reject(new AccountApiError("validation", "Confira o código e tente novamente."));
  }
  return post("/api/auth/password-reset/verify", input, isPasswordResetAuthorization);
}

export function confirmPasswordReset(input: { email: string; resetToken: string; newPassword: string }) {
  if (!input || typeof input.email !== "string" || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
    typeof input.resetToken !== "string" || input.resetToken.length > 4096 ||
    typeof input.newPassword !== "string" || input.newPassword.length < 8 || input.newPassword.length > 128) {
    return Promise.reject(new AccountApiError("validation", "Confira os dados da nova senha e tente novamente."));
  }
  return post("/api/auth/password-reset/confirm", input, (value): value is { updatedAt?: string } =>
    Boolean(value && typeof value === "object" && (!((value as { updatedAt?: unknown }).updatedAt) || typeof (value as { updatedAt?: unknown }).updatedAt === "string"))
  );
}
