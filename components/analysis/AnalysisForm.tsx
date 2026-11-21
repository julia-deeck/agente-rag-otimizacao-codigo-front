"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import AnalysisResultPanel from "./AnalysisResultPanel";
import AppFrame from "../layout/AppFrame";
import type { AttachmentRecord, ConversationRecord, EditorFileRecord, EditorLanguage, ProjectRecord } from "../layout/conversationTypes";
import { isConversationRecord, isProjectRecord, MAX_CONVERSATIONS, MAX_PROJECTS, parseUniqueRecords } from "../security/workspaceData";
import FeedbackMessage from "../ui/FeedbackMessage";
import useModalFocus from "../ui/useModalFocus";
import WorkspaceToolsPanel, { WorkspaceToolTabs, type WorkspaceToolId } from "../workspace/WorkspaceToolsPanel";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading" role="status" aria-live="polite" aria-busy="true">Carregando editor...</div>
  ),
});

function conversationCodeSummary(conversation: ConversationRecord) {
  const files = conversation.codeFiles?.filter((file) => file.language === conversation.activeLanguage && file.content.trim()) ?? [];
  if (files.length) return files.map((file) => file.name).join(", ");
  return conversation.activeLanguage === "qasm" ? "OpenQASM 2" : "Python / Qiskit";
}

function parseConversations(value: unknown): ConversationRecord[] {
  return Array.isArray(value) ? parseUniqueRecords(value, isConversationRecord, MAX_CONVERSATIONS).records : [];
}

function readStoredConversations(): { conversations: ConversationRecord[]; issue: string } {
  if (typeof window === "undefined") return { conversations: [], issue: "" };
  try {
    const raw = window.localStorage.getItem("quantumone.conversations.v1");
    if (raw === null) return { conversations: [], issue: "" };
    if (raw.length > 10 * 1024 * 1024) throw new Error("workspace-data-too-large");
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) return { conversations: [], issue: "O histórico salvo está em um formato inválido. Restaure uma cópia pelas configurações; os dados antigos foram preservados." };
    const parsed = parseUniqueRecords(stored, isConversationRecord, MAX_CONVERSATIONS);
    return {
      conversations: parsed.records,
      issue: parsed.invalid ? "O histórico contém registros inválidos ou ultrapassa o limite permitido. Restaure uma cópia pelas configurações; os dados antigos foram preservados." : "",
    };
  } catch {
    return { conversations: [], issue: "Não foi possível ler o histórico salvo. Restaure uma cópia pelas configurações; os dados antigos foram preservados." };
  }
}

function readStoredProjects(): { projects: ProjectRecord[]; issue: string } {
  if (typeof window === "undefined") return { projects: [], issue: "" };
  try {
    const raw = window.localStorage.getItem("quantumone.projects.v1");
    if (raw === null) return { projects: [], issue: "" };
    if (raw.length > 2 * 1024 * 1024) throw new Error("project-data-too-large");
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) return { projects: [], issue: "Os dados dos projetos estão em um formato inválido. Confira a tela Projetos ou restaure um backup." };
    const parsed = parseUniqueRecords(stored, isProjectRecord, MAX_PROJECTS);
    return {
      projects: parsed.records,
      issue: parsed.invalid ? "Os projetos contêm registros inválidos ou ultrapassam o limite permitido. Confira a tela Projetos ou restaure um backup." : "",
    };
  } catch {
    return { projects: [], issue: "Não foi possível ler os projetos salvos. Confira a tela Projetos ou restaure um backup." };
  }
}

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function AnalysisForm() {
  const [qasmCode, setQasmCode] = useState("");
  const [pythonCode, setPythonCode] = useState("");
  const [activeLanguage, setActiveLanguage] =
    useState<EditorLanguage>("qasm");
  const [defaultLanguage, setDefaultLanguage] = useState<EditorLanguage>("qasm");
  const [defaultTopK, setDefaultTopK] = useState("5");
  const [sendWithEnter, setSendWithEnter] = useState(false);
  const [openCodePanelOnNewConversation, setOpenCodePanelOnNewConversation] = useState(false);
  const [question, setQuestion] = useState("");
  const [backend, setBackend] = useState("reference");
  const [topK, setTopK] = useState("5");
  const [showInputErrors, setShowInputErrors] = useState(false);
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const codeDialogRef = useModalFocus<HTMLElement>(isCodePanelOpen);
  const [activeTool, setActiveTool] = useState<WorkspaceToolId | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [codeFiles, setCodeFiles] = useState<EditorFileRecord[]>([
    { id: "main-qasm", name: "circuit.qasm", language: "qasm", content: "" },
    { id: "main-python", name: "main.py", language: "python", content: "" },
  ]);
  const [activeCodeFileId, setActiveCodeFileId] = useState("main-qasm");
  const [renamingCodeFileId, setRenamingCodeFileId] = useState<string | null>(null);
  const [renamingCodeFileName, setRenamingCodeFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeCodeDialogOnEscape = useRef<(() => void) | null>(null);
  const codeDialogSnapshot = useRef<{
    qasmCode: string;
    pythonCode: string;
    activeLanguage: EditorLanguage;
    codeFiles: EditorFileRecord[];
    activeCodeFileId: string;
  } | null>(null);
  const [initialConversationState] = useState(readStoredConversations);
  const [conversations, setConversations] = useState<ConversationRecord[]>(initialConversationState.conversations);
  const [historyStorageIssue, setHistoryStorageIssue] = useState(initialConversationState.issue);
  const blockConversationWrites = useRef(Boolean(initialConversationState.issue));
  const [initialProjectState] = useState(readStoredProjects);
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjectState.projects);
  const [projectStorageIssue, setProjectStorageIssue] = useState(initialProjectState.issue);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(subscribeToHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);

  const [feedback, setFeedback] = useState<{
    type: "error";
    message: string;
  } | null>(null);

  const [editorMessage, setEditorMessage] = useState("");

  useEffect(() => {
    function handleConversationsChanged(event: Event) {
      const nextValue = (event as CustomEvent<unknown>).detail;
      const nextConversations = parseConversations(nextValue);
      if (Array.isArray(nextValue) && nextConversations.length !== nextValue.length) {
        blockConversationWrites.current = true;
        setHistoryStorageIssue("A cópia restaurada contém registros incompletos. Alguns itens foram ignorados.");
      } else {
        setHistoryStorageIssue("");
        blockConversationWrites.current = false;
      }
      setConversations(nextConversations);
      setActiveConversationId(null);
    }

    window.addEventListener("quantumone:conversations-changed", handleConversationsChanged);
    return () => window.removeEventListener("quantumone:conversations-changed", handleConversationsChanged);
  }, []);
  useEffect(() => {
    function readDefaultLanguage() {
      try {
        const stored = window.localStorage.getItem("quantumone.preferences.v1");
        if (!stored) return;
        applyPreferences(JSON.parse(stored));
      } catch {
        applyPreferences({});
      }
    }

    function handlePreferencesChanged(event: Event) {
      applyPreferences((event as CustomEvent<Record<string, unknown>>).detail ?? {});
    }

    function applyPreferences(preferences: Record<string, unknown>) {
      setDefaultLanguage(preferences.defaultLanguage === "python" ? "python" : "qasm");
      setDefaultTopK(["3", "5", "8", "10"].includes(String(preferences.defaultTopK))
        ? String(preferences.defaultTopK)
        : "5");
      setSendWithEnter(preferences.sendWithEnter === true);
      setOpenCodePanelOnNewConversation(preferences.openCodePanelOnNewConversation === true);
      document.documentElement.dataset.reducedMotion = String(preferences.reduceMotion === true);
      document.documentElement.dataset.highContrast = String(preferences.highContrast === true);
      const scale = preferences.interfaceScale === "90" || preferences.interfaceScale === "110"
        ? preferences.interfaceScale
        : "100";
      document.documentElement.style.setProperty("zoom", `${Number(scale) / 100}`);
    }

    readDefaultLanguage();
    window.addEventListener("quantumone:preferences-changed", handlePreferencesChanged);
    window.addEventListener("storage", readDefaultLanguage);
    return () => {
      window.removeEventListener("quantumone:preferences-changed", handlePreferencesChanged);
      window.removeEventListener("storage", readDefaultLanguage);
    };
  }, []);

  useEffect(() => {
    function applyProjects(nextProjects: ProjectRecord[], issue = "") {
      setProjects(nextProjects);
      setProjectStorageIssue(issue);
      const projectIds = new Set(nextProjects.map((project) => project.id));
      setActiveProjectId((current) => current && !projectIds.has(current) ? null : current);
      if (!issue) {
        setConversations((current) => current.map((conversation) => {
          if (!conversation.projectId || projectIds.has(conversation.projectId)) return conversation;
          const updated = { ...conversation };
          delete updated.projectId;
          return updated;
        }));
      }
    }

    function readProjects() {
      try {
        const stored = window.localStorage.getItem("quantumone.projects.v1");
        if (!stored) {
          applyProjects([]);
          return;
        }
        if (stored.length > 2 * 1024 * 1024) throw new Error("project-data-too-large");
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const result = parseUniqueRecords(parsed, isProjectRecord, MAX_PROJECTS);
          applyProjects(result.records, result.invalid ? "Os dados de projeto são inválidos ou excedem o limite permitido." : "");
        } else {
          applyProjects([], "Os dados dos projetos estão em um formato inválido. Confira a tela Projetos ou restaure um backup.");
        }
      } catch {
        applyProjects([], "Não foi possível ler os projetos salvos. Confira a tela Projetos ou restaure um backup.");
      }
    }

    function handleProjectsChanged(event: Event) {
      const changedProjects: unknown = (event as CustomEvent<unknown>).detail;
      if (Array.isArray(changedProjects)) {
        const result = parseUniqueRecords(changedProjects, isProjectRecord, MAX_PROJECTS);
        applyProjects(result.records, result.invalid ? "Os dados de projeto recebidos são inválidos." : "");
      }
    }

    window.addEventListener("quantumone:projects-changed", handleProjectsChanged);
    window.addEventListener("storage", readProjects);
    return () => {
      window.removeEventListener("quantumone:projects-changed", handleProjectsChanged);
      window.removeEventListener("storage", readProjects);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || blockConversationWrites.current) return;
    try {
      window.localStorage.setItem("quantumone.conversations.v1", JSON.stringify(conversations));
      window.setTimeout(() => setHistoryStorageIssue(""), 0);
    } catch {
      window.setTimeout(() => setFeedback({
        type: "error",
        message: "Não foi possível salvar o histórico neste dispositivo.",
      }), 0);
      window.setTimeout(() => setHistoryStorageIssue("O histórico não pôde ser salvo neste dispositivo. Libere espaço ou exporte uma cópia pelas configurações."), 0);
    }
  }, [conversations, isHydrated]);

  const code = activeLanguage === "qasm" ? qasmCode : pythonCode;
  const visibleProjects = isHydrated ? projects : [];
  const visibleConversations = isHydrated ? conversations : [];
  const activeProject = visibleProjects.find((project) => project.id === activeProjectId) ?? null;
  const activeCodeFile = codeFiles.find((file) => file.id === activeCodeFileId);
  const editorCode = activeCodeFile?.content ?? code;
  const visibleCodeFiles = codeFiles.filter((file) => file.language === activeLanguage);

  function setCode(value: string) {
    if (value.length > 500_000) {
      setEditorMessage("O código ultrapassa o limite de 500 mil caracteres.");
      setFeedback({ type: "error", message: "Reduza o código para continuar; o limite é de 500 mil caracteres." });
      return false;
    }
    if (activeCodeFile) {
      setCodeFiles((current) => current.map((file) => file.id === activeCodeFile.id ? { ...file, content: value, isDirty: true } : file));
      if (activeCodeFile.id === "main-qasm") setQasmCode(value);
      if (activeCodeFile.id === "main-python") setPythonCode(value);
    } else if (activeLanguage === "qasm") setQasmCode(value);
    else setPythonCode(value);
    return true;
  }

  function selectCodeFile(file: EditorFileRecord) {
    setActiveCodeFileId(file.id);
    setActiveLanguage(file.language);
    setActiveConversationId(null);
    setEditorMessage("");
  }

  function selectLanguage(language: EditorLanguage) {
    let languageFiles = codeFiles.filter((file) => file.language === language);
    if (!languageFiles.length) {
      const file: EditorFileRecord = language === "qasm"
        ? { id: "main-qasm", name: "circuit.qasm", language, content: qasmCode }
        : { id: "main-python", name: "main.py", language, content: pythonCode };
      setCodeFiles((current) => [...current, file]);
      languageFiles = [file];
    }
    const primaryFile = languageFiles.find((file) => file.id === (language === "qasm" ? "main-qasm" : "main-python")) ?? languageFiles[0];
    setActiveCodeFileId(primaryFile.id);
    setActiveLanguage(language);
    setActiveConversationId(null);
    setEditorMessage("");
  }

  function addCodeFile() {
    const language = activeLanguage;
    const index = visibleCodeFiles.length + 1;
    const file: EditorFileRecord = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: language === "qasm" ? `circuit-${index}.qasm` : `module-${index}.py`,
      language,
      content: "",
      isDirty: true,
    };
    setCodeFiles((current) => [...current, file]);
    setActiveCodeFileId(file.id);
    setActiveConversationId(null);
    setEditorMessage("");
  }

  function closeCodeFile(file: EditorFileRecord) {
    if (file.id === "main-qasm" || file.id === "main-python") return;
    if (file.isDirty && !window.confirm(`Fechar ${file.name} e descartar as alterações ainda não salvas na conversa?`)) return;
    const remaining = codeFiles.filter((item) => item.id !== file.id);
    setCodeFiles(remaining);
    if (activeCodeFileId === file.id) {
      const nextFile = remaining.find((item) => item.language === file.language) ?? remaining[0];
      if (nextFile) selectCodeFile(nextFile);
    }
  }

  function startRenameCodeFile(file: EditorFileRecord) {
    setRenamingCodeFileId(file.id);
    setRenamingCodeFileName(file.name);
  }

  function finishRenameCodeFile() {
    const normalizedName = renamingCodeFileName.trim();
    if (normalizedName) {
      setCodeFiles((current) => current.map((file) => file.id === renamingCodeFileId
        ? { ...file, name: normalizedName, isDirty: true }
        : file));
    }
    setRenamingCodeFileId(null);
    setRenamingCodeFileName("");
  }

  const examples = [
    "Reduzir profundidade",
    "Explicar o circuito",
    "Adaptar ao backend",
  ];

  function selectExample(example: string) {
    setActiveConversationId(null);
    setQuestion(example);
    setFeedback(null);
  }

  function openCodeEditor() {
    codeDialogSnapshot.current = { qasmCode, pythonCode, activeLanguage, codeFiles, activeCodeFileId };
    setIsCodePanelOpen(true);
    setEditorMessage("");
  }

  function cancelCodeEditor() {
    if (codeDialogSnapshot.current) {
      setQasmCode(codeDialogSnapshot.current.qasmCode);
      setPythonCode(codeDialogSnapshot.current.pythonCode);
      setActiveLanguage(codeDialogSnapshot.current.activeLanguage);
      setCodeFiles(codeDialogSnapshot.current.codeFiles);
      setActiveCodeFileId(codeDialogSnapshot.current.activeCodeFileId);
    }
    codeDialogSnapshot.current = null;
    setEditorMessage("");
    setRenamingCodeFileId(null);
    setRenamingCodeFileName("");
    setIsCodePanelOpen(false);
  }

  closeCodeDialogOnEscape.current = cancelCodeEditor;

  function applyCodeEditor() {
    codeDialogSnapshot.current = null;
    setEditorMessage("");
    setIsCodePanelOpen(false);
    setRenamingCodeFileId(null);
    setRenamingCodeFileName("");
  }

  function clearCurrentCode() {
    setCode("");
    setCodeFiles((current) => current.map((file) => file.id === activeCodeFileId ? { ...file, content: "" } : file));
    setActiveConversationId(null);
    setShowInputErrors(false);
    setFeedback(null);
    setEditorMessage("Código removido.");
  }

  function handleSelectFiles(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files);
    const accepted = picked.filter((file) => file.size <= 10 * 1024 * 1024 && file.name.length <= 255);
    const rejectedCount = picked.length - accepted.length;
    setFeedback(rejectedCount ? {
      type: "error",
      message: "Alguns arquivos foram recusados. Cada arquivo deve ter até 10 MB e um nome com no máximo 255 caracteres.",
    } : null);
    const remainingSlots = Math.max(0, 10 - attachments.length);
    const selected = accepted.slice(0, remainingSlots).map((file) => ({
      id: globalThis.crypto?.randomUUID?.() ?? `${file.name}-${file.lastModified}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || "Arquivo local",
    }));
    if (accepted.length > remainingSlots) {
      setFeedback({ type: "error", message: "O limite é de 10 arquivos por conversa. Remova um arquivo para adicionar outro." });
    }
    if (selected.length) {
      setAttachments((current) => [...current, ...selected]);
      setActiveTool("files");
      setActiveConversationId(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    if (activeConversationId) {
      setConversations((current) => current.map((conversation) =>
        conversation.id === activeConversationId
          ? { ...conversation, attachments: conversation.attachments?.filter((attachment) => attachment.id !== id) }
          : conversation
      ));
    }
  }

  function createConversationTitle(prompt: string, language: EditorLanguage) {
    const normalizedPrompt = prompt.trim().replace(/\s+/g, " ");
    if (normalizedPrompt) {
      return normalizedPrompt.length > 38
        ? `${normalizedPrompt.slice(0, 38).trimEnd()}…`
        : normalizedPrompt;
    }
    return language === "qasm" ? "Análise OpenQASM 2" : "Análise Python / Qiskit";
  }

  function handleSelectConversation(id: string) {
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) return;
    setActiveConversationId(id);
    setActiveProjectId(conversation.projectId ?? null);
    setQuestion(conversation.prompt);
    setQasmCode(conversation.activeLanguage === "qasm" ? conversation.qasmCode : "");
    setPythonCode(conversation.activeLanguage === "python" ? conversation.pythonCode : "");
    setActiveLanguage(conversation.activeLanguage);
    setBackend(conversation.backend);
    setTopK(conversation.topK);
    setAttachments(conversation.attachments ?? []);
    const restoredFiles = conversation.codeFiles?.filter((file) => file.language === conversation.activeLanguage) ?? [];
    if (!restoredFiles.length) {
      restoredFiles.push(conversation.activeLanguage === "qasm"
        ? { id: "main-qasm", name: "circuit.qasm", language: "qasm", content: conversation.qasmCode }
        : { id: "main-python", name: "main.py", language: "python", content: conversation.pythonCode });
    }
    setCodeFiles(restoredFiles);
    setActiveCodeFileId((restoredFiles.find((file) => file.language === conversation.activeLanguage) ?? restoredFiles[0]).id);
    setFeedback(null);
    setShowInputErrors(false);
    setEditorMessage("");
    setIsCodePanelOpen(false);
  }

  function handleRenameConversation(id: string, title: string) {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;
    setConversations((current) => current.map((item) =>
      item.id === id ? { ...item, title: normalizedTitle } : item
    ));
  }

  function handleToggleConversationPin(id: string) {
    setConversations((current) => current.map((item) =>
      item.id === id ? { ...item, isPinned: !item.isPinned } : item
    ));
  }

  function handleDeleteConversation(id: string) {
    setConversations((current) => current.filter((item) => item.id !== id));
    if (activeConversationId === id) setActiveConversationId(null);
  }

  function handleAssignConversationToProject(id: string, projectId: string | null) {
    if (activeConversationId === id) setActiveProjectId(projectId);
    setConversations((current) => current.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item };
      if (projectId) updated.projectId = projectId;
      else delete updated.projectId;
      return updated;
    }));
  }

  function openProjectWorkspace(projectId: string) {
    handleClear();
    setActiveProjectId(projectId);
    const projectLanguage = projects.find((project) => project.id === projectId)?.language;
    const language: EditorLanguage = projectLanguage === "Python / Qiskit" ? "python" : "qasm";
    setActiveLanguage(language);
    setActiveCodeFileId(language === "python" ? "main-python" : "main-qasm");
    if (codeDialogSnapshot.current) {
      codeDialogSnapshot.current = {
        ...codeDialogSnapshot.current,
        activeLanguage: language,
        activeCodeFileId: language === "python" ? "main-python" : "main-qasm",
      };
    }
  }

  async function handleCopy() {
    if (!editorCode.trim()) {
      setEditorMessage("Não existe código para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(editorCode);
      setEditorMessage("Código copiado!");
    } catch {
      setEditorMessage(
        "Não foi possível copiar automaticamente. Utilize Ctrl+C."
      );
    }
  }

  async function handlePaste() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) {
        setEditorMessage("A área de transferência está vazia.");
        return;
      }

      if (!setCode(clipboardText)) return;
      setActiveConversationId(null);
      setEditorMessage("Código inserido!");
      setFeedback(null);
      setShowInputErrors(false);
    } catch {
      setEditorMessage(
        "Não foi possível acessar a área de transferência. Utilize Ctrl+V."
      );
    }
  }

  function handleClear() {
    setActiveConversationId(null);
    setQasmCode("");
    setPythonCode("");
    setCodeFiles([
      { id: "main-qasm", name: "circuit.qasm", language: "qasm", content: "" },
      { id: "main-python", name: "main.py", language: "python", content: "" },
    ]);
    setActiveCodeFileId(defaultLanguage === "python" ? "main-python" : "main-qasm");
    setRenamingCodeFileId(null);
    setRenamingCodeFileName("");
    setAttachments([]);
    setQuestion("");
    setBackend("reference");
    setTopK(defaultTopK);
    setFeedback(null);
    setEditorMessage("");
    setShowInputErrors(false);
    setActiveLanguage(defaultLanguage);
    codeDialogSnapshot.current = openCodePanelOnNewConversation
      ? {
          qasmCode: "", pythonCode: "", activeLanguage: defaultLanguage,
          codeFiles: [
            { id: "main-qasm", name: "circuit.qasm", language: "qasm", content: "" },
            { id: "main-python", name: "main.py", language: "python", content: "" },
          ],
          activeCodeFileId: defaultLanguage === "python" ? "main-python" : "main-qasm",
        }
      : null;
    setIsCodePanelOpen(openCodePanelOnNewConversation);
    setActiveTool(null);
  }

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const activeLanguageCode = activeLanguage === "qasm" ? qasmCode : pythonCode;
    if (question.length > 20_000 || activeLanguageCode.length > 500_000 || attachments.length > 10) {
      setFeedback({ type: "error", message: "A pergunta, o código ou os anexos excedem os limites permitidos. Revise o conteúdo antes de continuar." });
      return;
    }
    const hasActiveLanguageFile = visibleCodeFiles.some((file) => file.content.trim());
    if (!activeLanguageCode.trim() && !hasActiveLanguageFile && !question.trim()) {
      setShowInputErrors(true);
      setFeedback({
        type: "error",
        message:
          "Preencha o código, a pergunta ou os dois para continuar.",
      });
      return;
    }

    setShowInputErrors(false);
    setFeedback(null);
    const id = globalThis.crypto?.randomUUID?.() ?? `conversation-${Date.now()}`;
    const savedCodeFiles = visibleCodeFiles.map((file) => ({ ...file, isDirty: false }));
    const conversation: ConversationRecord = {
      id,
      title: createConversationTitle(question, activeLanguage),
      prompt: question.trim(),
      qasmCode: activeLanguage === "qasm" ? qasmCode : "",
      pythonCode: activeLanguage === "python" ? pythonCode : "",
      activeLanguage,
      backend,
      topK,
      createdAt: new Date().toISOString(),
      isPinned: false,
      attachments,
      codeFiles: savedCodeFiles,
      ...(activeProjectId ? { projectId: activeProjectId } : {}),
    };
    setConversations((current) => [conversation, ...current]);
    setCodeFiles(savedCodeFiles);
    setQasmCode(activeLanguage === "qasm" ? qasmCode : "");
    setPythonCode(activeLanguage === "python" ? pythonCode : "");
    setActiveConversationId(id);
    setQuestion("");
  }

  useEffect(() => {
    if (!isCodePanelOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeCodeDialogOnEscape.current?.();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isCodePanelOpen]);

  return (
    <AppFrame
      activeItem="new-analysis"
      conversations={visibleConversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onStartNewConversation={handleClear}
      onRenameConversation={handleRenameConversation}
      onToggleConversationPin={handleToggleConversationPin}
      onDeleteConversation={handleDeleteConversation}
      projects={visibleProjects}
      onAssignConversationToProject={handleAssignConversationToProject}
      onOpenProjectWorkspace={openProjectWorkspace}
    >
      <>
        <main className="workspace chat-workspace">
          <section className="page-intro chat-page-intro">
            <div>
              <span className="eyebrow">QUANTUMONE / WORKSPACE</span>
              <h1>Nova conversa</h1>
              <p>
                Explore seu circuito, faça perguntas e prepare uma análise
                no mesmo espaço.
              </p>
            </div>
          </section>

          <form
            className={
              "chat-layout " + (!isCodePanelOpen ? "chat-layout-expanded" : "")
            }
            onSubmit={handleAnalyze}
            noValidate
          >
            <section className="panel chat-panel">
              <div className="chat-context-bar">
                <div className="chat-breadcrumb">
                  <span className="workspace-dot" aria-hidden="true" />
                  <span>quantumone</span>
                  <span className="breadcrumb-separator">/</span>
                  <strong>{activeProject?.name ?? "workspace"}</strong>
                </div>
                <span className="chat-mode-label">QONE · AGENTE</span>
              </div>

              {activeProject && (
                <div className="chat-project-context">
                  <span className="chat-project-context-mark" aria-hidden="true">P</span>
                  <div><span>PROJETO ATIVO</span><strong>{activeProject.name}</strong></div>
                  <p>Novas conversas serão relacionadas a este projeto.</p>
                  <button type="button" onClick={() => setActiveProjectId(null)}>Sair do projeto</button>
                </div>
              )}

              {historyStorageIssue && <FeedbackMessage tone="warning" className="chat-storage-warning" message={historyStorageIssue} />}
              {projectStorageIssue && <FeedbackMessage tone="warning" className="chat-storage-warning" message={projectStorageIssue} />}

              <WorkspaceToolTabs activeTool={activeTool} onSelect={setActiveTool} />
              {activeTool && (
                <WorkspaceToolsPanel
                  activeTool={activeTool}
                  attachments={attachments}
                  onPickFiles={() => fileInputRef.current?.click()}
                  onRemoveAttachment={removeAttachment}
                />
              )}

              <div className="chat-thread">
                {activeConversationId ? (
                  <div className="chat-conversation-thread">
                    {(() => {
                      const activeConversation = conversations.find(
                        (item) => item.id === activeConversationId,
                      );
                      if (!activeConversation) return null;
                      return (
                        <>
                          <div className="chat-user-message">
                            <p>
                              {activeConversation.prompt ||
                                `Analisei um circuito ${activeConversation.activeLanguage === "qasm" ? "OpenQASM 2" : "Python / Qiskit"}.`}
                            </p>
                            {(activeConversation.qasmCode.trim() || activeConversation.pythonCode.trim() || activeConversation.codeFiles?.some((file) => file.content.trim())) && (
                              <span className="chat-code-attachment">
                                Código incluído: {conversationCodeSummary(activeConversation)}
                              </span>
                            )}
                            {activeConversation.attachments?.length ? (
                              <div className="chat-message-attachments">
                                {activeConversation.attachments.map((attachment) => (
                                  <span key={attachment.id}>▤ {attachment.name}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <AnalysisResultPanel result={activeConversation.analysisResult} />
                          <p className="chat-local-note">
                            A QOne Agent é uma IA e pode cometer erros.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                ) : <div className="chat-empty-state">
                  <div className="chat-mark" aria-hidden="true">
                    <Image
                      src="/images/quantumone-icon.png"
                      alt=""
                      width={42}
                      height={42}
                      className="chat-mark-icon"
                    />
                  </div>
                  <span className="chat-empty-kicker">
                    SEU WORKSPACE QUÂNTICO
                  </span>
                  <h2>O que vamos explorar?</h2>
                  <p>
                    Faça uma pergunta sobre seu circuito ou escolha uma
                    sugestão para começar.
                  </p>

                  <div className="example-list chat-suggestions">
                    {examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className="example-chip"
                        onClick={() => selectExample(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>}
              </div>

              <div className="chat-composer">
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  multiple
                  onChange={(event) => handleSelectFiles(event.target.files)}
                  aria-label="Selecionar arquivos para a conversa"
                />
                <label
                  className="visually-hidden"
                  htmlFor="analysis-question"
                >
                  Pergunta ou objetivo da análise
                </label>
                <textarea
                  id="analysis-question"
                  className={
                    "question-input chat-question-input " +
                    (showInputErrors ? "input-invalid-field" : "")
                  }
                  aria-invalid={showInputErrors}
                  value={question}
                  maxLength={20_000}
                  onChange={(event) => {
                    setActiveConversationId(null);
                    setQuestion(event.target.value);
                    setFeedback(null);

                    if (event.target.value.trim()) {
                      setShowInputErrors(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      sendWithEnter &&
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Pergunte, descreva o que deseja otimizar ou peça uma explicação..."
                />

                <div className="composer-meta">
                  <span>
                    {sendWithEnter
                      ? "Enter envia Â· Shift + Enter cria uma linha."
                      : "Use uma pergunta com ou sem código."}
                  </span>
                  <span>{question.length} caracteres</span>
                </div>

                <div className="composer-actions">
                  <div className="composer-tools">
                    <span className="composer-hint">
                      <span className="composer-hint-dot" />
                      {activeLanguage === "qasm" ? "OpenQASM 2" : "Python / Qiskit"}
                    </span>
                    <button
                      type="button"
                      className="button-secondary add-code-button"
                      onClick={openCodeEditor}
                      aria-haspopup="dialog"
                      aria-expanded={isCodePanelOpen}
                    >
                      <span aria-hidden="true">＋</span>
                      {qasmCode.trim() || pythonCode.trim() || codeFiles.some((file) => file.content.trim())
                        ? "Editar código"
                        : "Adicionar código"}
                    </button>
                    <button
                      type="button"
                      className="button-secondary add-code-button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Anexar arquivos à conversa"
                      title="Anexar arquivos à conversa"
                    >
                      <span aria-hidden="true">⌁</span>
                      Anexar
                    </button>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={handleClear}
                    >
                      Limpar
                    </button>

                    <button type="submit" className="button-primary">
                      Analisar
                      <span aria-hidden="true">↑</span>
                    </button>
                  </div>
                </div>
              </div>

              {feedback && (
                <FeedbackMessage tone="error" className="form-feedback error" message={feedback.message} />
              )}
            </section>

            {isCodePanelOpen && (
              <div className="code-dialog-layer">
                <button
                  type="button"
                  className="code-dialog-backdrop"
                  aria-label="Fechar janela de código"
                  onClick={cancelCodeEditor}
                />
                <aside
                  className="panel context-panel code-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="code-dialog-title"
                  tabIndex={-1}
                  ref={codeDialogRef}
                >
              <div className="context-panel-heading">
                <div>
                  <span className="section-kicker">CONTEXTO</span>
                  <h2 id="code-dialog-title">Código do projeto</h2>
                  <p>Adicione o circuito que você quer explorar.</p>
                </div>
                <button
                  type="button"
                  className="button-quiet code-dialog-close"
                  aria-label="Fechar janela de código"
                  onClick={cancelCodeEditor}
                >
                  ×
                </button>
              </div>

              <div
                className="editor-file-tabs"
                role="tablist"
                aria-label="Arquivos de código abertos"
              >
                {visibleCodeFiles.map((file, index) => (
                  <div className={`editor-file-tab ${activeCodeFileId === file.id ? "active" : ""}`} key={file.id}>
                    {renamingCodeFileId === file.id ? (
                      <input
                        autoFocus
                        className="editor-file-rename-input"
                        aria-label="Rename code file"
                        value={renamingCodeFileName}
                        onChange={(event) => setRenamingCodeFileName(event.target.value)}
                        onBlur={finishRenameCodeFile}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") finishRenameCodeFile();
                          if (event.key === "Escape") {
                            setRenamingCodeFileId(null);
                            setRenamingCodeFileName("");
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        role="tab"
                        data-file-tab={file.id}
                        aria-selected={activeCodeFileId === file.id}
                        className="editor-file-tab-select"
                        title="Clique duas vezes para renomear"
                        onClick={() => selectCodeFile(file)}
                        onDoubleClick={() => startRenameCodeFile(file)}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                          event.preventDefault();
                          const tabs = Array.from(event.currentTarget.closest(".editor-file-tabs")?.querySelectorAll<HTMLButtonElement>("[role='tab']") ?? []);
                          const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                          tabs[nextIndex]?.focus();
                          tabs[nextIndex]?.click();
                        }}
                      >
                        <span className={file.language === "qasm" ? "file-type-qasm" : "file-type-python"} aria-hidden="true" />
                        <span>{file.name}</span>
                        {file.isDirty && <i className="editor-file-dirty" aria-label="Alterações não salvas" title="Alterações não salvas" />}
                      </button>
                    )}
                    {file.id !== "main-qasm" && file.id !== "main-python" && (
                      <button type="button" className="editor-file-close" onClick={() => closeCodeFile(file)} aria-label={`Fechar ${file.name}`} title="Fechar aba">×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="editor-file-add" onClick={addCodeFile} aria-label="Criar nova aba de código" title="Nova aba de código">+</button>
              </div>

              <div
                className="editor-tabs"
                role="group"
                aria-label="Linguagem do código"
              >
                <button
                  type="button"
                  className={
                    "editor-tab " +
                    (activeLanguage === "qasm" ? "active" : "")
                  }
                  onClick={() => {
                    selectLanguage("qasm");
                  }}
                  aria-pressed={activeLanguage === "qasm"}
                >
                  OpenQASM 2
                </button>

                <button
                  type="button"
                  className={
                    "editor-tab " +
                    (activeLanguage === "python" ? "active" : "")
                  }
                  onClick={() => {
                    selectLanguage("python");
                  }}
                  aria-pressed={activeLanguage === "python"}
                >
                  Python
                </button>
              </div>

              <div
                className={
                  "editor-shell context-editor-shell " +
                  (showInputErrors ? "input-invalid" : "")
                }
              >
                <div className="editor-toolbar">
                  <span className="language-label">
                    {activeLanguage === "qasm" ? "OPENQASM 2" : "PYTHON"}
                  </span>

                  <div className="toolbar-actions">
                    <button
                      type="button"
                      className="button-quiet"
                      onClick={handlePaste}
                      aria-label="Colar código"
                      title="Colar código"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="button-quiet"
                      onClick={handleCopy}
                      aria-label="Copiar código"
                      title="Copiar código"
                    >
                      ⧉
                    </button>
                  </div>
                </div>

                <CodeEditor
                  language={activeLanguage}
                  value={editorCode}
                  onChange={(value) => {
                    setActiveConversationId(null);
                    setCode(value);
                    setEditorMessage("");

                    if (value.trim()) {
                      setShowInputErrors(false);
                      setFeedback(null);
                    }
                  }}
                />
              </div>

              <div className="editor-footer context-editor-footer">
                <span>
                  {activeLanguage === "qasm" ? "OpenQASM 2" : "Python"}
                </span>
                {activeCodeFile?.isDirty && <span className="editor-unsaved-status"><i /> Alterações não salvas</span>}
                <span>{editorCode.length} caracteres</span>
              </div>

              {editorMessage && (
                <FeedbackMessage tone="info" className="editor-message" message={editorMessage} />
              )}

              <div className="code-dialog-actions">
                <button
                  type="button"
                  className="button-quiet code-dialog-clear"
                  onClick={clearCurrentCode}
                  disabled={!editorCode.trim()}
                >
                  Limpar
                </button>
                <div>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={cancelCodeEditor}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={applyCodeEditor}
                  >
                    Adicionar código
                  </button>
                </div>
              </div>
                </aside>
              </div>
            )}
          </form>

          <footer className="page-footer">
            QuantumOne — Seu laboratório quântico.
          </footer>
        </main>
      </>
    </AppFrame>
  );
}
