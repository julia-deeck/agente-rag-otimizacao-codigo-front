export type UserProfile = {
  name: string;
  email: string;
  joinedAt: string;
  avatarDataUrl?: string;
  emailUpdates?: boolean;
  productUpdates?: boolean;
  passwordChangedAt?: string;
};

const PROFILE_KEY = "quantumone.profile.v1";
const EMAIL_PATTERN = /^[^\s@]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/;
const MAX_AVATAR_DATA_URL_LENGTH = 4_200_000;

export function parseUserProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Partial<UserProfile>;
  if (typeof profile.name !== "string" || profile.name.trim().length < 2 || profile.name.length > 80 ||
    typeof profile.email !== "string" || profile.email.length > 254 || !EMAIL_PATTERN.test(profile.email) ||
    typeof profile.joinedAt !== "string" || Number.isNaN(Date.parse(profile.joinedAt))) return null;
  const avatarDataUrl = typeof profile.avatarDataUrl === "string" &&
    profile.avatarDataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(profile.avatarDataUrl)
    ? profile.avatarDataUrl
    : undefined;
  return {
    name: profile.name.trim(),
    email: profile.email.trim().toLowerCase(),
    joinedAt: profile.joinedAt,
    avatarDataUrl,
    emailUpdates: profile.emailUpdates !== false,
    productUpdates: profile.productUpdates === true,
    passwordChangedAt: typeof profile.passwordChangedAt === "string" && !Number.isNaN(Date.parse(profile.passwordChangedAt))
      ? profile.passwordChangedAt
      : undefined,
  };
}

export function readUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    return parseUserProfile(JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile) {
  const normalized = parseUserProfile(profile);
  if (!normalized) throw new Error("Perfil inválido.");
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("quantumone:profile-changed"));
}
