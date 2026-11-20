"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorLanguage } from "../layout/conversationTypes";

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

function readStoredPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const parsed: Partial<AppPreferences> = JSON.parse(window.localStorage.getItem("quantumone.preferences.v1") ?? "{}");
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      reduceMotion: parsed.reduceMotion === true,
      highContrast: parsed.highContrast === true,
      interfaceScale: parsed.interfaceScale === "90" || parsed.interfaceScale === "110" ? parsed.interfaceScale : "100",
      defaultLanguage: parsed.defaultLanguage === "python" ? "python" : "qasm",
      defaultTopK: parsed.defaultTopK === "3" || parsed.defaultTopK === "8" || parsed.defaultTopK === "10" ? parsed.defaultTopK : "5",
      sendWithEnter: parsed.sendWithEnter === true,
      openCodePanelOnNewConversation: parsed.openCodePanelOnNewConversation === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(readStoredPreferences);
  const [savedData, setSavedData] = useState({ conversations: 0, projects: 0, available: true });
  const [restoreMessage, setRestoreMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function readSavedData() {
      try {
        const conversations = JSON.parse(window.localStorage.getItem("quantumone.conversations.v1") ?? "[]");
        const projects = JSON.parse(window.localStorage.getItem("quantumone.projects.v1") ?? "[]");
        setSavedData({
          conversations: Array.isArray(conversations) ? conversations.length : 0,
          projects: Array.isArray(projects) ? projects.length : 0,
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
    try {
      window.localStorage.setItem("quantumone.preferences.v1", JSON.stringify(preferences));
    } catch {
      // Keep preferences active for this session if browser storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("quantumone:preferences-changed", {
      detail: preferences,
    }));
  }, [preferences]);

  function updatePreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function exportWorkspaceBackup() {
    const backup = {
      format: "quantumone-workspace-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      conversations: JSON.parse(window.localStorage.getItem("quantumone.conversations.v1") ?? "[]"),
      projects: JSON.parse(window.localStorage.getItem("quantumone.projects.v1") ?? "[]"),
      preferences: JSON.parse(window.localStorage.getItem("quantumone.preferences.v1") ?? "{}"),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quantumone-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restoreWorkspaceBackup(file: File | undefined) {
    if (!file) return;
    try {
      const backup: unknown = JSON.parse(await file.text());
      if (!backup || typeof backup !== "object" ||
        (backup as { format?: unknown }).format !== "quantumone-workspace-backup" ||
        !Array.isArray((backup as { conversations?: unknown }).conversations) ||
        !Array.isArray((backup as { projects?: unknown }).projects)) {
        setRestoreMessage("Arquivo de backup QuantumOne inválido.");
        return;
      }
      const restored = backup as { conversations: unknown[]; projects: unknown[]; preferences?: unknown };
      const validConversations = restored.conversations.filter((item) =>
        item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { title?: unknown }).title === "string" &&
        typeof (item as { prompt?: unknown }).prompt === "string" &&
        typeof (item as { qasmCode?: unknown }).qasmCode === "string" &&
        typeof (item as { pythonCode?: unknown }).pythonCode === "string"
      );
      const validProjects = restored.projects.filter((item) =>
        item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { name?: unknown }).name === "string"
      );
      window.localStorage.setItem("quantumone.conversations.v1", JSON.stringify(validConversations));
      window.localStorage.setItem("quantumone.projects.v1", JSON.stringify(validProjects));
      if (restored.preferences && typeof restored.preferences === "object") {
        const imported = restored.preferences as Partial<AppPreferences>;
        const nextPreferences: AppPreferences = {
          ...DEFAULT_PREFERENCES,
          interfaceScale: imported.interfaceScale === "90" || imported.interfaceScale === "110" ? imported.interfaceScale : "100",
          reduceMotion: imported.reduceMotion === true,
          highContrast: imported.highContrast === true,
          defaultLanguage: imported.defaultLanguage === "python" ? "python" : "qasm",
          defaultTopK: imported.defaultTopK === "3" || imported.defaultTopK === "8" || imported.defaultTopK === "10" ? imported.defaultTopK : "5",
          sendWithEnter: imported.sendWithEnter === true,
          openCodePanelOnNewConversation: imported.openCodePanelOnNewConversation === true,
        };
        window.localStorage.setItem("quantumone.preferences.v1", JSON.stringify(nextPreferences));
        setPreferences(nextPreferences);
      }
      window.dispatchEvent(new CustomEvent("quantumone:conversations-changed", { detail: validConversations }));
      window.dispatchEvent(new CustomEvent("quantumone:projects-changed", { detail: validProjects }));
      setSavedData({ conversations: validConversations.length, projects: validProjects.length, available: true });
      setRestoreMessage("Backup do workspace restaurado.");
    } catch {
      setRestoreMessage("Não foi possível restaurar este backup.");
    }
    if (backupInputRef.current) backupInputRef.current.value = "";
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
          <span className="settings-save-indicator">
            <span aria-hidden="true" /> Salvo neste dispositivo
          </span>
          <button
            type="button"
            className="settings-reset-button"
            onClick={() => setPreferences(DEFAULT_PREFERENCES)}
          >
            Restaurar padrões
          </button>
        </div>
      </section>

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
            {restoreMessage && <p className="settings-data-note" role="status">{restoreMessage}</p>}
            <p className="settings-data-note">Restauração entre instalações e verificação de atualizações dependem da versão desktop.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
