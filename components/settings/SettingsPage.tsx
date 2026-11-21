"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorLanguage } from "../layout/conversationTypes";
import { isConversationRecord, isProjectRecord, MAX_CONVERSATIONS, MAX_PROJECTS, MAX_WORKSPACE_BACKUP_BYTES, parseUniqueRecords } from "../security/workspaceData";
import FeedbackMessage, { type FeedbackAction, type FeedbackTone } from "../ui/FeedbackMessage";

type AppPreferences = {
  interfaceScale: "90" | "100" | "110";
  reduceMotion: boolean;
  highContrast: boolean;
  defaultLanguage: EditorLanguage;
  defaultTopK: "3" | "5" | "8" | "10";
  sendWithEnter: boolean;
  openCodePanelOnNewConversation: boolean;
};

const DEFAULT_PREFERENCES: AppPreferences = {
  interfaceScale: "100",
  reduceMotion: false,
  highContrast: false,
  defaultLanguage: "qasm",
  defaultTopK: "5",
  sendWithEnter: false,
  openCodePanelOnNewConversation: false,
};

function readStoredPreferences(): { preferences: AppPreferences; issue: boolean } {
  if (typeof window === "undefined") return { preferences: DEFAULT_PREFERENCES, issue: false };
  try {
    const raw = window.localStorage.getItem("quantumone.preferences.v1");
    if (raw === null) return { preferences: DEFAULT_PREFERENCES, issue: false };
    if (raw.length > 16_384) return { preferences: DEFAULT_PREFERENCES, issue: true };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { preferences: DEFAULT_PREFERENCES, issue: true };
    const values = parsed as Partial<AppPreferences>;
    const preferences: AppPreferences = {
      ...DEFAULT_PREFERENCES,
      reduceMotion: values.reduceMotion === true,
      highContrast: values.highContrast === true,
      interfaceScale: values.interfaceScale === "90" || values.interfaceScale === "110" ? values.interfaceScale : "100",
      defaultLanguage: values.defaultLanguage === "python" ? "python" : "qasm",
      defaultTopK: values.defaultTopK === "3" || values.defaultTopK === "8" || values.defaultTopK === "10" ? values.defaultTopK : "5",
      sendWithEnter: values.sendWithEnter === true,
      openCodePanelOnNewConversation: values.openCodePanelOnNewConversation === true,
    };
    return { preferences, issue: false };
  } catch {
    return { preferences: DEFAULT_PREFERENCES, issue: true };
  }
}

export default function SettingsPage() {
  const [initialPreferenceState] = useState(readStoredPreferences);
  const [preferences, setPreferences] = useState<AppPreferences>(initialPreferenceState.preferences);
  const [preferenceStorageBlocked, setPreferenceStorageBlocked] = useState(initialPreferenceState.issue);
  const [savedData, setSavedData] = useState({ conversations: 0, projects: 0, available: true });
  const [restoreMessage, setRestoreMessage] = useState<{ message: string; tone: FeedbackTone; action?: FeedbackAction } | null>(null);
  const [preferenceSaveFailed, setPreferenceSaveFailed] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  function showRestoreMessage(message: string, tone: FeedbackTone = "success", action?: FeedbackAction) {
    setRestoreMessage({ message, tone, action });
  }

  useEffect(() => {
    function readSavedData() {
      try {
        const conversationsRaw = window.localStorage.getItem("quantumone.conversations.v1") ?? "[]";
        const projectsRaw = window.localStorage.getItem("quantumone.projects.v1") ?? "[]";
        if (conversationsRaw.length > MAX_WORKSPACE_BACKUP_BYTES || projectsRaw.length > 2 * 1024 * 1024) throw new Error("stored-data-too-large");
        const conversations: unknown = JSON.parse(conversationsRaw);
        const projects: unknown = JSON.parse(projectsRaw);
        if (!Array.isArray(conversations) || !Array.isArray(projects)) throw new Error("invalid-storage-shape");
        const parsedConversations = parseUniqueRecords(conversations, isConversationRecord, MAX_CONVERSATIONS);
        const parsedProjects = parseUniqueRecords(projects, isProjectRecord, MAX_PROJECTS);
        if (parsedConversations.invalid || parsedProjects.invalid) throw new Error("invalid-stored-record");
        setSavedData({
          conversations: parsedConversations.records.length,
          projects: parsedProjects.records.length,
          available: true,
        });
      } catch {
        setSavedData((current) => ({ ...current, available: false }));
      }
    }
    readSavedData();
    window.addEventListener("storage", readSavedData);
    window.addEventListener("quantumone:projects-changed", readSavedData);
    return () => {
      window.removeEventListener("storage", readSavedData);
      window.removeEventListener("quantumone:projects-changed", readSavedData);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reducedMotion = String(preferences.reduceMotion);
    root.dataset.highContrast = String(preferences.highContrast);
    root.style.setProperty("zoom", `${Number(preferences.interfaceScale) / 100}`);
  }, [preferences]);

  useEffect(() => {
    if (preferenceStorageBlocked) {
      window.setTimeout(() => setPreferenceSaveFailed(true), 0);
      return;
    }
    try {
      window.localStorage.setItem("quantumone.preferences.v1", JSON.stringify(preferences));
      window.setTimeout(() => setPreferenceSaveFailed(false), 0);
    } catch {
      window.setTimeout(() => setPreferenceSaveFailed(true), 0);
    }
    window.dispatchEvent(new CustomEvent("quantumone:preferences-changed", {
      detail: preferences,
    }));
  }, [preferences, preferenceStorageBlocked]);

  function updatePreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
    setPreferenceStorageBlocked(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function exportWorkspaceBackup() {
    setRestoreMessage(null);
    try {
      const conversationsRaw = window.localStorage.getItem("quantumone.conversations.v1") ?? "[]";
      const projectsRaw = window.localStorage.getItem("quantumone.projects.v1") ?? "[]";
      const preferencesRaw = window.localStorage.getItem("quantumone.preferences.v1") ?? "{}";
      if (conversationsRaw.length > MAX_WORKSPACE_BACKUP_BYTES || projectsRaw.length > 2 * 1024 * 1024 || preferencesRaw.length > 16_384) {
        throw new Error("stored-data-too-large");
      }
      const conversations: unknown = JSON.parse(conversationsRaw);
      const projects: unknown = JSON.parse(projectsRaw);
      const preferences: unknown = JSON.parse(preferencesRaw);
      if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) throw new Error("invalid-preferences");
      const backup = {
        format: "quantumone-workspace-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        conversations,
        projects,
        preferences,
      };
      if (!Array.isArray(backup.conversations) || !Array.isArray(backup.projects) ||
        parseUniqueRecords(backup.conversations, isConversationRecord, MAX_CONVERSATIONS).invalid ||
        parseUniqueRecords(backup.projects, isProjectRecord, MAX_PROJECTS).invalid) {
        throw new Error("invalid-workspace-data");
      }
      const contents = JSON.stringify(backup, null, 2);
      if (new Blob([contents]).size > MAX_WORKSPACE_BACKUP_BYTES) {
        showRestoreMessage("A cópia ultrapassa o limite de 10 MB e não pôde ser exportada.", "error", { label: "Tentar novamente", onClick: exportWorkspaceBackup });
        return;
      }
      const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quantumone-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showRestoreMessage("Cópia do workspace exportada.");
    } catch {
      showRestoreMessage("Não foi possível exportar a cópia. Verifique os dados salvos e tente novamente.", "error", { label: "Tentar novamente", onClick: exportWorkspaceBackup });
    }
  }

  async function restoreWorkspaceBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > MAX_WORKSPACE_BACKUP_BYTES) {
        showRestoreMessage("A cópia ultrapassa o limite de 10 MB.", "error", { label: "Selecionar outro arquivo", onClick: () => backupInputRef.current?.click() });
        return;
      }
      const backup: unknown = JSON.parse(await file.text());
      if (!backup || typeof backup !== "object" ||
        (backup as { format?: unknown }).format !== "quantumone-workspace-backup" ||
        (backup as { version?: unknown }).version !== 1 ||
        !Array.isArray((backup as { conversations?: unknown }).conversations) ||
        !Array.isArray((backup as { projects?: unknown }).projects) ||
        ((backup as { preferences?: unknown }).preferences !== undefined &&
          ((backup as { preferences?: unknown }).preferences === null || typeof (backup as { preferences?: unknown }).preferences !== "object" ||
            Array.isArray((backup as { preferences?: unknown }).preferences)))) {
        showRestoreMessage("Arquivo de backup QuantumOne inválido.", "error", { label: "Selecionar outro arquivo", onClick: () => backupInputRef.current?.click() });
        return;
      }
      const restored = backup as { conversations: unknown[]; projects: unknown[]; preferences?: unknown };
      const parsedConversations = parseUniqueRecords(restored.conversations, isConversationRecord, MAX_CONVERSATIONS);
      const parsedProjects = parseUniqueRecords(restored.projects, isProjectRecord, MAX_PROJECTS);
      if (parsedConversations.invalid || parsedProjects.invalid) {
        showRestoreMessage("A cópia contém registros incompletos ou incompatíveis. Nenhum dado foi alterado.", "error", { label: "Selecionar outro arquivo", onClick: () => backupInputRef.current?.click() });
        return;
      }
      const validConversations = parsedConversations.records;
      const validProjects = parsedProjects.records;
      const updates = new Map<string, string>([
        ["quantumone.conversations.v1", JSON.stringify(validConversations)],
        ["quantumone.projects.v1", JSON.stringify(validProjects)],
      ]);
      let nextPreferences: AppPreferences | null = null;
      if (restored.preferences && typeof restored.preferences === "object") {
        const imported = restored.preferences as Partial<AppPreferences>;
        nextPreferences = {
          ...DEFAULT_PREFERENCES,
          interfaceScale: imported.interfaceScale === "90" || imported.interfaceScale === "110" ? imported.interfaceScale : "100",
          reduceMotion: imported.reduceMotion === true,
          highContrast: imported.highContrast === true,
          defaultLanguage: imported.defaultLanguage === "python" ? "python" : "qasm",
          defaultTopK: imported.defaultTopK === "3" || imported.defaultTopK === "8" || imported.defaultTopK === "10" ? imported.defaultTopK : "5",
          sendWithEnter: imported.sendWithEnter === true,
          openCodePanelOnNewConversation: imported.openCodePanelOnNewConversation === true,
        };
        updates.set("quantumone.preferences.v1", JSON.stringify(nextPreferences));
      }
      const previousValues = new Map<string, string | null>();
      for (const key of updates.keys()) previousValues.set(key, window.localStorage.getItem(key));
      try {
        for (const [key, value] of updates) window.localStorage.setItem(key, value);
      } catch (error) {
        for (const [key, value] of previousValues) {
          try {
            if (value === null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, value);
          } catch {
            // Best effort rollback after a quota or storage failure.
          }
        }
        throw error;
      }
      if (nextPreferences) setPreferences(nextPreferences);
      if (nextPreferences) setPreferenceStorageBlocked(false);
      window.dispatchEvent(new CustomEvent("quantumone:conversations-changed", { detail: validConversations }));
      window.dispatchEvent(new CustomEvent("quantumone:projects-changed", { detail: validProjects }));
      setSavedData({ conversations: validConversations.length, projects: validProjects.length, available: true });
      showRestoreMessage("Backup do workspace restaurado.");
    } catch {
      showRestoreMessage("Não foi possível restaurar este backup.", "error", { label: "Tentar novamente", onClick: () => backupInputRef.current?.click() });
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  return (
    <main className="workspace settings-workspace">
      <section className="page-intro settings-page-intro">
        <div>
          <span className="eyebrow">QUANTUMONE / WORKSPACE</span>
          <h1>Configurações</h1>
          <p>Personalize a interface e os padrões do seu workspace.</p>
        </div>
        <div className="settings-page-header-actions">
          <span className="settings-save-indicator" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true" /> {preferenceSaveFailed ? "Não foi possível salvar" : "Salvo neste dispositivo"}
          </span>
          <button
            type="button"
            className="settings-reset-button"
            onClick={() => {
              setPreferenceStorageBlocked(false);
              setPreferences(DEFAULT_PREFERENCES);
            }}
          >
            Restaurar padrões
          </button>
        </div>
      </section>

      {preferenceStorageBlocked && <FeedbackMessage tone="warning" className="settings-data-note" message="As preferências salvas estão inválidas e foram preservadas. Altere uma preferência, restaure uma cópia válida ou use Restaurar padrões para substituí-las." />}

      <div className="settings-page-grid">
        <nav className="settings-page-nav" aria-label="Seções de configuração">
          <a href="#interface">Interface</a>
          <a href="#accessibility">Acessibilidade</a>
          <a href="#workspace-settings">Workspace</a>
          <a href="#chat-settings">Conversa</a>
          <a href="#data-settings">Dados e recuperação</a>
        </nav>

        <div className="settings-page-content">
          <section className="panel settings-page-card" id="interface">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">◐</span>
              <div>
                <h2>Interface</h2>
                <p>Escolha como o QuantumOne aparece na sua tela.</p>
              </div>
            </div>

            <div className="settings-row settings-scale-row">
              <div>
                <strong>Escala da interface</strong>
                <span>Ajuste o tamanho dos elementos em todas as páginas.</span>
              </div>
              <div className="settings-scale-options" role="group" aria-label="Escala da interface">
                {(["90", "100", "110"] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={preferences.interfaceScale === scale ? "active" : ""}
                    aria-pressed={preferences.interfaceScale === scale}
                    onClick={() => updatePreference("interfaceScale", scale)}
                  >
                    {scale === "90" ? "Compacta" : scale === "100" ? "Padrão" : "Ampliada"}
                    <small>{scale}%</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel settings-page-card" id="accessibility">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">◉</span>
              <div>
                <h2>Acessibilidade</h2>
                <p>Adapte efeitos visuais e legibilidade às suas preferências.</p>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <strong>Reduzir movimento</strong>
                <span>Desativa animações e transições decorativas.</span>
              </div>
              <button
                type="button"
                role="switch"
                className={`settings-switch ${preferences.reduceMotion ? "is-on" : ""}`}
                aria-checked={preferences.reduceMotion}
                aria-label="Reduzir movimento"
                onClick={() => updatePreference("reduceMotion", !preferences.reduceMotion)}
              >
                <span />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <strong>Contraste reforçado</strong>
                <span>Realça textos, contornos e estados interativos.</span>
              </div>
              <button
                type="button"
                role="switch"
                className={`settings-switch ${preferences.highContrast ? "is-on" : ""}`}
                aria-checked={preferences.highContrast}
                aria-label="Contraste reforçado"
                onClick={() => updatePreference("highContrast", !preferences.highContrast)}
              >
                <span />
              </button>
            </div>
          </section>

          <section className="panel settings-page-card" id="workspace-settings">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">⌘</span>
              <div>
                <h2>Workspace</h2>
                <p>Defina os valores iniciais para novas conversas.</p>
              </div>
            </div>

            <div className="settings-row settings-language-row">
              <div>
                <strong>Linguagem padrão</strong>
                <span>Usada ao iniciar uma nova análise. Pode ser alterada na conversa.</span>
              </div>
              <div className="settings-language-options" role="group" aria-label="Linguagem padrão">
                <button
                  type="button"
                  className={preferences.defaultLanguage === "qasm" ? "active" : ""}
                  aria-pressed={preferences.defaultLanguage === "qasm"}
                  onClick={() => updatePreference("defaultLanguage", "qasm")}
                >
                  OpenQASM 2
                </button>
                <button
                  type="button"
                  className={preferences.defaultLanguage === "python" ? "active" : ""}
                  aria-pressed={preferences.defaultLanguage === "python"}
                  onClick={() => updatePreference("defaultLanguage", "python")}
                >
                  Python / Qiskit
                </button>
              </div>
            </div>

            <div className="settings-row settings-analysis-row">
              <div>
                <strong>Trechos documentais padrão</strong>
                <span>Quantidade inicial usada na recuperação de contexto.</span>
              </div>
              <select
                value={preferences.defaultTopK}
                onChange={(event) => updatePreference("defaultTopK", event.target.value as AppPreferences["defaultTopK"])}
                aria-label="Quantidade padrão de trechos documentais"
              >
                <option value="3">3 trechos</option>
                <option value="5">5 trechos</option>
                <option value="8">8 trechos</option>
                <option value="10">10 trechos</option>
              </select>
            </div>
          </section>

          <section className="panel settings-page-card" id="chat-settings">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">↵</span>
              <div>
                <h2>Conversa</h2>
                <p>Ajuste o envio de mensagens e a composição de novas conversas.</p>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <strong>Enviar com Enter</strong>
                <span>Use Shift + Enter para criar uma nova linha quando ativado.</span>
              </div>
              <button
                type="button"
                role="switch"
                className={`settings-switch ${preferences.sendWithEnter ? "is-on" : ""}`}
                aria-checked={preferences.sendWithEnter}
                aria-label="Enviar mensagens com Enter"
                onClick={() => updatePreference("sendWithEnter", !preferences.sendWithEnter)}
              >
                <span />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <strong>Abrir editor de código ao iniciar</strong>
                <span>Mostra o editor automaticamente em uma nova conversa.</span>
              </div>
              <button
                type="button"
                role="switch"
                className={`settings-switch ${preferences.openCodePanelOnNewConversation ? "is-on" : ""}`}
                aria-checked={preferences.openCodePanelOnNewConversation}
                aria-label="Abrir editor de código em nova conversa"
                onClick={() => updatePreference("openCodePanelOnNewConversation", !preferences.openCodePanelOnNewConversation)}
              >
                <span />
              </button>
            </div>
          </section>

          <section className="panel settings-page-card" id="data-settings">
            <div className="settings-card-heading">
              <span className="settings-card-icon" aria-hidden="true">▤</span>
              <div>
                <h2>Dados e recuperação</h2>
                <p>Conversas e projetos ficam salvos localmente neste dispositivo.</p>
              </div>
            </div>
            <div className="settings-row settings-data-row">
              <div>
                <strong>Recuperação de sessões</strong>
                <span>{savedData.available ? `${savedData.conversations} conversas e ${savedData.projects} projetos salvos neste dispositivo.` : "Não foi possível acessar o armazenamento local."}</span>
              </div>
              <span className={`settings-storage-badge ${savedData.available ? "is-ready" : "is-error"}`}>
                <i /> {savedData.available ? "Salvamento local ativo" : "Armazenamento indisponível"}
              </span>
            </div>
            <div className="settings-row settings-data-row">
              <div>
                <strong>Exportar cópia do workspace</strong>
                <span>Baixe conversas, projetos e preferências em um arquivo JSON.</span>
              </div>
              <button type="button" className="button-secondary" onClick={exportWorkspaceBackup}>Baixar cópia</button>
            </div>
            <div className="settings-row settings-data-row">
              <div>
                <strong>Restaurar cópia do workspace</strong>
                <span>Carregue uma cópia JSON do QuantumOne. Os dados locais atuais serão substituídos.</span>
              </div>
              <input ref={backupInputRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Selecionar cópia do workspace" onChange={(event) => void restoreWorkspaceBackup(event.target.files?.[0])} />
              <button type="button" className="button-secondary" onClick={() => backupInputRef.current?.click()}>Restaurar cópia</button>
            </div>
            {restoreMessage && <FeedbackMessage tone={restoreMessage.tone} className="settings-data-note" message={restoreMessage.message} action={restoreMessage.action} />}
            <p className="settings-data-note">Restauração entre instalações e verificação de atualizações dependem da versão desktop.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
