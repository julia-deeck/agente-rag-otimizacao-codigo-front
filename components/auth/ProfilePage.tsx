"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { AccountApiError, confirmPasswordReset, requestPasswordCode as requestPasswordResetCode, verifyPasswordCode as verifyPasswordResetCode } from "./accountApi";
import { parseUserProfile, saveUserProfile, type UserProfile } from "./profileStorage";
import FeedbackMessage from "../ui/FeedbackMessage";

function subscribeProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("quantumone:profile-changed", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("quantumone:profile-changed", onChange);
  };
}

function getProfileSnapshot() {
  try {
    return window.localStorage.getItem("quantumone.profile.v1") ?? "";
  } catch {
    return "__storage_unavailable__";
  }
}

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ProfileDetailsForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      setError("Informe seu nome completo.");
      return;
    }
    if (cleanEmail.length > 254 || !/^[^\s@]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/.test(cleanEmail)) {
      setError("Digite um e-mail válido.");
      return;
    }
    try {
      saveUserProfile({ ...profile, name: cleanName, email: cleanEmail });
    } catch {
      setError("Não foi possível salvar as alterações. Tente novamente.");
      return;
    }
    setName(cleanName);
    setEmail(cleanEmail);
    setMessage("Seus dados foram atualizados.");
  }

  return (
    <form className="profile-form" onSubmit={saveProfile}>
      <label className="profile-field">
        <span>Nome completo</span>
        <input autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="profile-field">
        <span>E-mail</span>
        <input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      {error && <FeedbackMessage tone="error" className="profile-feedback is-error" message={error} />}
      {message && <FeedbackMessage tone="success" className="profile-feedback is-success" message={message} />}
      <div className="profile-form-actions">
        <button type="submit" className="profile-primary-button">Salvar alterações</button>
      </div>
    </form>
  );
}

function ProfilePreferences({ profile }: { profile: UserProfile }) {
  const [emailUpdates, setEmailUpdates] = useState(profile.emailUpdates !== false);
  const [productUpdates, setProductUpdates] = useState(profile.productUpdates === true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updatePreferences(nextEmail: boolean, nextProduct: boolean) {
    setError("");
    try {
      saveUserProfile({ ...profile, emailUpdates: nextEmail, productUpdates: nextProduct });
      setEmailUpdates(nextEmail);
      setProductUpdates(nextProduct);
      setMessage("Preferências atualizadas.");
    } catch {
      setError("Não foi possível salvar as preferências.");
    }
  }

  return (
    <div className="profile-preferences">
      <label className="profile-preference-row">
        <span><strong>Atividade da conta</strong><small>Receba novidades importantes sobre sua conta.</small></span>
        <input type="checkbox" checked={emailUpdates} onChange={(event) => updatePreferences(event.target.checked, productUpdates)} />
      </label>
      <label className="profile-preference-row">
        <span><strong>Novidades do QuantumOne</strong><small>Atualizações de recursos e melhorias do produto.</small></span>
        <input type="checkbox" checked={productUpdates} onChange={(event) => updatePreferences(emailUpdates, event.target.checked)} />
      </label>
      {error && <FeedbackMessage tone="error" className="profile-feedback is-error" message={error} />}
      {message && <FeedbackMessage tone="success" className="profile-feedback is-success" message={message} />}
    </div>
  );
}

function PasswordErrorNotice({ message, requestId }: { message: string; requestId: string }) {
  if (!message) return null;
  return (
    <FeedbackMessage tone="error" className="profile-password-error" message={message}>
      {requestId && <small>Referência para suporte: {requestId}</small>}
    </FeedbackMessage>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const profileSnapshot = useSyncExternalStore(subscribeProfile, getProfileSnapshot, () => "");
  const profile = useMemo(() => {
    try {
      return parseUserProfile(JSON.parse(profileSnapshot || "null"));
    } catch {
      return null;
    }
  }, [profileSnapshot]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordRequestId, setPasswordRequestId] = useState("");
  const [passwordStep, setPasswordStep] = useState<"email" | "sending" | "code" | "verifying" | "password" | "updating" | "complete">("email");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [codeSeconds, setCodeSeconds] = useState(0);
  const [resetSeconds, setResetSeconds] = useState(0);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [accountError, setAccountError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile && !profileSnapshot) router.replace("/cadastro");
  }, [profile, profileSnapshot, router]);

  useEffect(() => {
    if (resendSeconds <= 0 && codeSeconds <= 0 && resetSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
      setCodeSeconds((current) => Math.max(0, current - 1));
      setResetSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [passwordStep, resendSeconds, codeSeconds, resetSeconds]);

  const initials = useMemo(() => profile?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "Q", [profile]);

  async function updateAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setAvatarError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarError("Escolha uma imagem PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError("A imagem deve ter até 3 MB.");
      return;
    }
    try {
      const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
      const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
      const isWebp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
      const signatureMatchesType = (file.type === "image/png" && isPng) ||
        (file.type === "image/jpeg" && isJpeg) || (file.type === "image/webp" && isWebp);
      if (!signatureMatchesType) {
        setAvatarError("O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WebP válida.");
        return;
      }
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 4096 || bitmap.height > 4096 || bitmap.width * bitmap.height > 16_000_000) {
        bitmap.close();
        setAvatarError("A imagem tem dimensões muito grandes. Escolha uma imagem com até 4096 × 4096 pixels.");
        return;
      }
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        setAvatarError("Não foi possível processar esta imagem neste dispositivo.");
        return;
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const resizedImage = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image-conversion-failed")), "image/webp", 0.86);
      });
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("image-read-failed"));
        reader.onerror = () => reject(new Error("image-read-failed"));
        reader.readAsDataURL(resizedImage);
      });
      saveUserProfile({ ...profile, avatarDataUrl: dataUrl });
    } catch {
      setAvatarError("Não foi possível processar esta imagem. Escolha outro arquivo e tente novamente.");
    }
  }

  function removeAvatar() {
    if (!profile?.avatarDataUrl) return;
    const profileWithoutAvatar = { ...profile };
    delete profileWithoutAvatar.avatarDataUrl;
    try {
      saveUserProfile(profileWithoutAvatar);
      setAvatarError("");
    } catch {
      setAvatarError("Não foi possível remover a foto. Tente novamente.");
    }
  }

  function apiErrorMessage(error: unknown) {
    setPasswordRequestId(error instanceof AccountApiError ? error.requestId ?? "" : "");
    return error instanceof AccountApiError
      ? error.message
      : "Ocorreu um erro inesperado. Tente novamente.";
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (!resetToken || resetSeconds <= 0) {
      setPasswordError("A confirmação expirou. Solicite um novo código.");
      setPasswordStep("email");
      setResetToken(null);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não correspondem.");
      return;
    }
    if (!profile) return;
    setPasswordStep("updating");
    try {
      const result = await confirmPasswordReset({ email: profile.email, resetToken, newPassword });
      const updatedAt = result.updatedAt && !Number.isNaN(Date.parse(result.updatedAt))
        ? result.updatedAt
        : new Date().toISOString();
      try {
        saveUserProfile({ ...profile, passwordChangedAt: updatedAt });
      } catch {
        // The account service is authoritative; local profile metadata is optional.
      }
      setNewPassword("");
      setConfirmPassword("");
      setResetToken(null);
      setPasswordMessage("Sua senha foi atualizada.");
      setPasswordStep("complete");
    } catch (error) {
      setPasswordError(apiErrorMessage(error));
      if (error instanceof AccountApiError && error.code === "expired-code") {
        setResetToken(null);
        setPasswordStep("email");
      } else {
        setPasswordStep("password");
      }
    }
  }

  async function requestPasswordCode() {
    if (!profile) return;
    setPasswordError("");
    setPasswordMessage("");
    setPasswordRequestId("");
    setConfirmationCode("");
    setPasswordStep("sending");
    try {
      const challenge = await requestPasswordResetCode(profile.email);
      setChallengeId(challenge.challengeId);
      setChallengeEmail(challenge.maskedEmail ?? maskedEmail(profile.email));
      setConfirmationCode("");
      setResendSeconds(challenge.resendAfterSeconds);
      setCodeSeconds(challenge.expiresInSeconds);
      setPasswordMessage("Código de confirmação enviado.");
      setPasswordStep("code");
    } catch (error) {
      setPasswordError(apiErrorMessage(error));
      if (error instanceof AccountApiError && error.retryAfterSeconds) {
        setResendSeconds(error.retryAfterSeconds);
      }
      setPasswordStep("email");
    }
  }

  async function verifyPasswordCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !challengeId || codeSeconds <= 0) {
      setPasswordError("O código expirou. Solicite um novo para continuar.");
      setPasswordStep("email");
      return;
    }
    if (!/^\d{6}$/.test(confirmationCode)) {
      setPasswordError("Digite os 6 dígitos do código enviado para seu e-mail.");
      return;
    }
    setPasswordError("");
    setPasswordRequestId("");
    setPasswordStep("verifying");
    try {
      const authorization = await verifyPasswordResetCode({ email: profile.email, challengeId, code: confirmationCode });
      setResetToken(authorization.resetToken);
      setResetSeconds(authorization.expiresInSeconds);
      setPasswordStep("password");
    } catch (error) {
      setPasswordError(apiErrorMessage(error));
      if (error instanceof AccountApiError && (error.code === "expired-code" || error.code === "too-many-attempts")) {
        setPasswordStep("email");
        setChallengeId(null);
        setConfirmationCode("");
      } else {
        setPasswordStep("code");
      }
    }
  }

  function maskedEmail(email: string) {
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return email;
    return `${localPart.slice(0, 1)}${"•".repeat(Math.min(Math.max(localPart.length - 1, 3), 8))}@${domain}`;
  }

  function deleteProfile() {
    if (!window.confirm("Deseja remover este perfil deste dispositivo?")) return;
    try {
      window.localStorage.removeItem("quantumone.profile.v1");
      window.dispatchEvent(new Event("quantumone:profile-changed"));
      router.replace("/cadastro");
    } catch {
      setAccountError("Não foi possível remover o perfil. Tente novamente.");
    }
  }

  if (!profile && profileSnapshot) {
    return (
      <main className="workspace profile-workspace">
        <section className="profile-recovery-state" role="alert">
          <span aria-hidden="true">!</span>
          <h1>Não foi possível carregar seu perfil</h1>
          <p>Os dados salvos parecem incompletos ou inválidos. Volte ao cadastro para atualizar suas informações.</p>
          <Link href="/cadastro" className="profile-primary-button">Ir para o cadastro</Link>
        </section>
      </main>
    );
  }
  if (!profile) return <main className="profile-loading" role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Carregando perfil…</span></main>;

  return (
    <main className="workspace profile-workspace">
      <header className="page-intro profile-page-intro">
        <div>
          <span className="eyebrow">QUANTUMONE / CONTA</span>
          <h1>Meu perfil</h1>
          <p>Gerencie seus dados pessoais e as opções de acesso à sua conta.</p>
        </div>
        <Link className="profile-back-link" href="/">← Voltar ao workspace</Link>
      </header>

      <section className="profile-identity-card panel" aria-label="Resumo do perfil">
        {profile.avatarDataUrl ? (
          <Image src={profile.avatarDataUrl} alt={`Foto de ${profile.name}`} width={60} height={60} unoptimized className="profile-avatar profile-avatar-image" />
        ) : (
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
        )}
        <div className="profile-identity-copy">
          <span className="profile-overline">SEU PERFIL</span>
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <span className="profile-member-since">Membro desde {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(profile.joinedAt))}</span>
        </div>
        <div className="profile-avatar-actions">
          <input ref={avatarInputRef} className="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={updateAvatar} />
          <button type="button" className="profile-avatar-button" onClick={() => avatarInputRef.current?.click()}>{profile.avatarDataUrl ? "Trocar foto" : "Adicionar foto"}</button>
          {profile.avatarDataUrl && <button type="button" className="profile-avatar-remove" onClick={removeAvatar}>Remover</button>}
        </div>
        {avatarError && <FeedbackMessage tone="error" className="profile-feedback is-error profile-avatar-error" message={avatarError} />}
      </section>

      <div className="profile-sections">
        <section className="profile-card panel" aria-labelledby="profile-details-title">
          <div className="profile-card-heading">
            <span className="profile-card-icon" aria-hidden="true">◉</span>
            <div>
              <h2 id="profile-details-title">Informações pessoais</h2>
              <p>Atualize o nome e o e-mail associados ao seu perfil.</p>
            </div>
          </div>
          <ProfileDetailsForm key={profile.joinedAt} profile={profile} />
        </section>

        <section className="profile-card panel" aria-labelledby="profile-password-title">
          <div className="profile-card-heading">
            <span className="profile-card-icon" aria-hidden="true">⌑</span>
            <div>
              <h2 id="profile-password-title">Senha e segurança</h2>
              <p>Confirme seu e-mail antes de definir uma nova senha.</p>
            </div>
          </div>
          {passwordStep === "email" && (
            <div className="profile-security-step">
              <div className="profile-security-email">
                <span className="profile-security-mail-icon" aria-hidden="true">✉</span>
                <span><small>E-mail de confirmação</small><strong>{maskedEmail(profile.email)}</strong></span>
              </div>
              {profile.passwordChangedAt && (
                <p className="profile-security-last-change">Última atualização: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(profile.passwordChangedAt))}</p>
              )}
              <PasswordErrorNotice message={passwordError} requestId={passwordRequestId} />
              <button type="button" className="profile-secondary-button profile-security-action" onClick={requestPasswordCode} disabled={resendSeconds > 0}>
                {resendSeconds > 0 ? `Tente novamente em ${formatCountdown(resendSeconds)}` : "Enviar código de confirmação"}
                {resendSeconds <= 0 && <span aria-hidden="true">→</span>}
              </button>
            </div>
          )}

          {(passwordStep === "sending" || passwordStep === "verifying" || passwordStep === "updating") && (
            <div className="profile-security-loading" role="status" aria-live="polite" aria-busy="true">
              <span className="profile-security-spinner" aria-hidden="true" />
              <span>{passwordStep === "sending" ? "Solicitando código de confirmação…" : passwordStep === "verifying" ? "Validando código…" : "Atualizando sua senha…"}</span>
            </div>
          )}

          {passwordStep === "code" && (
            <form className="profile-form" onSubmit={verifyPasswordCode}>
              <p className="profile-security-instruction">{passwordMessage || "Informe o código de confirmação enviado para seu e-mail."} <strong>{challengeEmail ?? maskedEmail(profile.email)}</strong></p>
              <label className="profile-field">
                <span>Código de confirmação</span>
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={confirmationCode}
                  disabled={codeSeconds <= 0}
                  onChange={(event) => setConfirmationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  aria-label="Código de confirmação de 6 dígitos"
                />
              </label>
              <p className={`profile-code-expiration ${codeSeconds <= 0 ? "is-expired" : ""}`} role="status" aria-live={codeSeconds <= 0 ? "polite" : "off"} aria-atomic="true">
                {codeSeconds > 0 ? `Este código expira em ${formatCountdown(codeSeconds)}.` : "Este código expirou. Solicite outro para continuar."}
              </p>
              <PasswordErrorNotice message={passwordError} requestId={passwordRequestId} />
              <div className="profile-form-actions profile-security-actions">
                <button type="button" className="profile-text-button" onClick={requestPasswordCode} disabled={resendSeconds > 0}>
                  {resendSeconds > 0 ? `Reenviar código em ${formatCountdown(resendSeconds)}` : "Reenviar código"}
                </button>
                <button type="submit" className="profile-secondary-button" disabled={codeSeconds <= 0}>Confirmar e-mail</button>
              </div>
              <button type="button" className="profile-text-button profile-back-step" onClick={() => setPasswordStep("email")}>← Voltar</button>
            </form>
          )}

          {passwordStep === "password" && (
            <form className="profile-form" onSubmit={updatePassword}>
              {resetSeconds > 0 ? (
                <p className="profile-security-instruction is-confirmed"><span aria-hidden="true">✓</span> E-mail confirmado. Defina uma nova senha em até {formatCountdown(resetSeconds)}.</p>
              ) : (
                <p className="profile-security-instruction is-expired">A confirmação expirou. Solicite um novo código para continuar.</p>
              )}
              <label className="profile-field">
                <span>Nova senha</span>
                <input type="password" autoComplete="new-password" placeholder="Pelo menos 8 caracteres" value={newPassword} disabled={resetSeconds <= 0} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label className="profile-field">
                <span>Confirmar nova senha</span>
                <input type="password" autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmPassword} disabled={resetSeconds <= 0} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              <PasswordErrorNotice message={passwordError} requestId={passwordRequestId} />
              <div className="profile-form-actions">
                {resetSeconds <= 0 && <button type="button" className="profile-text-button" onClick={requestPasswordCode}>Solicitar novo código</button>}
                <button type="submit" className="profile-secondary-button" disabled={resetSeconds <= 0}>Salvar nova senha</button>
              </div>
            </form>
          )}

          {passwordStep === "complete" && (
            <div className="profile-password-complete" role="status" aria-live="polite">
              <span aria-hidden="true">✓</span>
              <div><strong>Senha atualizada</strong><small>{passwordMessage}</small></div>
              <button type="button" className="profile-text-button" onClick={() => setPasswordStep("email")}>Alterar novamente</button>
            </div>
          )}
        </section>

        <section className="profile-card profile-danger-card panel" aria-labelledby="profile-account-title">
          <div className="profile-card-heading">
            <span className="profile-card-icon" aria-hidden="true">⌫</span>
            <div>
              <h2 id="profile-account-title">Conta</h2>
              <p>Remova o perfil deste dispositivo.</p>
            </div>
          </div>
          <button type="button" className="profile-danger-button" onClick={deleteProfile}>Remover perfil</button>
          {accountError && <FeedbackMessage tone="error" className="profile-feedback is-error" message={accountError} />}
        </section>

        <section className="profile-card panel" aria-labelledby="profile-preferences-title">
          <div className="profile-card-heading">
            <span className="profile-card-icon" aria-hidden="true">⌘</span>
            <div>
              <h2 id="profile-preferences-title">Preferências da conta</h2>
              <p>Escolha quais atualizações deseja receber.</p>
            </div>
          </div>
          <ProfilePreferences key={profile.joinedAt} profile={profile} />
        </section>
      </div>
    </main>
  );
}
