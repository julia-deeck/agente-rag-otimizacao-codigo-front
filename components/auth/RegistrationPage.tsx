"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveUserProfile } from "./profileStorage";
import FeedbackMessage from "../ui/FeedbackMessage";

type RegistrationValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>;

const EMPTY_VALUES: RegistrationValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validate(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const normalizedEmail = values.email.trim();

  if (values.name.trim().length < 2) errors.name = "Informe um nome com pelo menos 2 caracteres.";
  else if (values.name.trim().length > 80) errors.name = "Use no máximo 80 caracteres no nome.";
  if (!normalizedEmail) errors.email = "Informe seu e-mail.";
  else if (!/^[^\s@]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$/.test(normalizedEmail)) {
    errors.email = "Digite um e-mail válido.";
  }
  if (values.password.length < 8) errors.password = "Use pelo menos 8 caracteres.";
  else if (values.password.length > 128) errors.password = "Use no máximo 128 caracteres na senha.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirme sua senha.";
  else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "As senhas não correspondem.";
  }

  return errors;
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: "Use 8 caracteres ou mais" };
  const score = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (score <= 1) return { score: 1, label: "Fraca" };
  if (score <= 2) return { score: 2, label: "Razoável" };
  if (score === 3) return { score: 3, label: "Boa" };
  return { score: 4, label: "Forte" };
}

export default function RegistrationPage() {
  const router = useRouter();
  const [values, setValues] = useState<RegistrationValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const strength = passwordStrength(values.password);

  function updateValue(field: keyof RegistrationValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      document.getElementById(`registration-${firstInvalidField}`)?.focus();
      return;
    }

    try {
      saveUserProfile({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        joinedAt: new Date().toISOString(),
      });
    } catch {
      setSubmitError("Não foi possível concluir seu cadastro. Tente novamente.");
      return;
    }
    setValues(EMPTY_VALUES);
    setShowPassword(false);
    router.push("/perfil");
  }

  return (
    <main className="registration-page">
      <div className="registration-orb registration-orb-one" aria-hidden="true" />
      <div className="registration-orb registration-orb-two" aria-hidden="true" />

      <div className="registration-topbar">
        <Link href="/" className="registration-brand" aria-label="Voltar ao QuantumOne">
          <Image
            src="/images/quantumone-logo.png"
            alt="QuantumOne"
            width={210}
            height={54}
            priority
          />
        </Link>
        <Link href="/perfil" className="registration-account-link">Acessar perfil <span aria-hidden="true">↗</span></Link>
      </div>

      <section className="registration-card" aria-labelledby="registration-title">
        <>
            <div className="registration-heading">
              <span className="registration-eyebrow">SEU PRÓXIMO ESPAÇO DE CRIAÇÃO</span>
              <h1 id="registration-title">Crie sua conta</h1>
              <p>Prepare seu perfil para explorar e desenvolver projetos quânticos.</p>
            </div>

            <form className="registration-form" onSubmit={handleSubmit} noValidate>
              <div className="registration-field">
                <label htmlFor="registration-name">Nome completo</label>
                <input
                  id="registration-name"
                  name="name"
                  type="text"
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Como podemos chamar você?"
                  value={values.name}
                  onChange={(event) => updateValue("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "registration-name-error" : undefined}
                />
                {errors.name && <span className="registration-field-error" id="registration-name-error">{errors.name}</span>}
              </div>

              <div className="registration-field">
                <label htmlFor="registration-email">E-mail</label>
                <input
                  id="registration-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@exemplo.com"
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "registration-email-error" : undefined}
                />
                {errors.email && <span className="registration-field-error" id="registration-email-error">{errors.email}</span>}
              </div>

              <div className="registration-field">
                <label htmlFor="registration-password">Senha</label>
                <div className="registration-password-wrap">
                  <input
                    id="registration-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Crie uma senha segura"
                    value={values.password}
                    onChange={(event) => updateValue("password", event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "registration-password-error" : "registration-password-hint"}
                  />
                  <button
                    type="button"
                    className="registration-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {errors.password ? (
                  <span className="registration-field-error" id="registration-password-error">{errors.password}</span>
                ) : (
                  <div className="registration-password-strength" id="registration-password-hint" aria-live="polite">
                    <span className="registration-strength-bars" aria-hidden="true">
                      {[1, 2, 3, 4].map((bar) => <i className={bar <= strength.score ? `level-${strength.score}` : ""} key={bar} />)}
                    </span>
                    <span>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="registration-field">
                <label htmlFor="registration-confirmPassword">Confirme sua senha</label>
                <input
                  id="registration-confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  value={values.confirmPassword}
                  onChange={(event) => updateValue("confirmPassword", event.target.value)}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "registration-confirmPassword-error" : undefined}
                />
                {errors.confirmPassword && <span className="registration-field-error" id="registration-confirmPassword-error">{errors.confirmPassword}</span>}
              </div>

              {submitError && <FeedbackMessage tone="error" className="registration-field-error" message={submitError} />}

              <button type="submit" className="registration-submit">
                Criar conta <span aria-hidden="true">↗</span>
              </button>

              <p className="registration-return">
                Já tem um workspace? <Link href="/">Voltar para o QuantumOne</Link>
              </p>
            </form>
        </>
      </section>

      <footer className="registration-footer">
        <span>QUANTUMONE · COMPUTAÇÃO QUÂNTICA</span>
        <span>Uma nova forma de explorar circuitos.</span>
      </footer>
    </main>
  );
}
