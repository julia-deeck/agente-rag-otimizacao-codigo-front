"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import type { ConversationRecord, ProjectRecord } from "../layout/conversationTypes";
import { isProjectRecord, MAX_PROJECTS, parseUniqueRecords } from "../security/workspaceData";
import useModalFocus from "../ui/useModalFocus";
import FeedbackMessage, { type FeedbackAction, type FeedbackTone } from "../ui/FeedbackMessage";
import EmptyState from "../ui/EmptyState";

type ProjectsPageProps = {
  onOpenWorkspace: (projectId: string) => void;
  conversations: ConversationRecord[];
  onOpenConversation: (id: string) => void;
};

function readStoredProjects(): { projects: ProjectRecord[]; issue: string } {
  if (typeof window === "undefined") return { projects: [], issue: "" };
  try {
    const raw = window.localStorage.getItem("quantumone.projects.v1");
    if (raw === null) return { projects: [], issue: "" };
    if (raw.length > 2 * 1024 * 1024) throw new Error("project-data-too-large");
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) return { projects: [], issue: "Os dados dos projetos estão em um formato inválido. Confira seu backup antes de continuar." };
    const parsed = parseUniqueRecords(stored, isProjectRecord, MAX_PROJECTS);
    const projects = parsed.records.filter((project) => project.id !== "quantumone-default-project");
    return {
      projects,
      issue: parsed.invalid ? "Os dados dos projetos são inválidos ou excedem o limite permitido." : "",
    };
  } catch {
    return { projects: [], issue: "Não foi possível ler os projetos salvos. Confira o armazenamento e tente novamente." };
  }
}

export default function ProjectsPage({ onOpenWorkspace, conversations, onOpenConversation }: ProjectsPageProps) {
  const [query, setQuery] = useState("");
  const [initialProjects] = useState(readStoredProjects);
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects.projects);
  const [storageIssue, setStorageIssue] = useState(initialProjects.issue);
  const [storageReadBlocked, setStorageReadBlocked] = useState(Boolean(initialProjects.issue));
  const [actionMessage, setActionMessage] = useState<{ message: string; tone: FeedbackTone; action?: FeedbackAction } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectLanguage, setProjectLanguage] = useState<ProjectRecord["language"]>("OpenQASM 2");
  const [formError, setFormError] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const createDialogRef = useModalFocus<HTMLElement>(isCreateDialogOpen);

  useEffect(() => {
    function handleProjectsChanged(event: Event) {
      const changedProjects: unknown = (event as CustomEvent<unknown>).detail;
      if (!Array.isArray(changedProjects)) return;
      const parsed = parseUniqueRecords(changedProjects, isProjectRecord, MAX_PROJECTS);
      setProjects(parsed.records);
      setStorageReadBlocked(parsed.invalid);
      setStorageIssue(parsed.invalid ? "Os dados restaurados contêm projetos inválidos. Nenhuma nova gravação será feita até uma cópia válida ser restaurada." : "");
    }
    window.addEventListener("quantumone:projects-changed", handleProjectsChanged);
    return () => window.removeEventListener("quantumone:projects-changed", handleProjectsChanged);
  }, []);

  function persistProjects(nextProjects: ProjectRecord[]) {
    if (storageReadBlocked) {
      setStorageIssue("Restaure uma cópia válida antes de alterar os projetos salvos.");
      return false;
    }
    const projectIds = new Set(nextProjects.map((project) => project.id));
    if (nextProjects.length > MAX_PROJECTS || nextProjects.some((project) => !isProjectRecord(project)) || projectIds.size !== nextProjects.length) {
      setStorageIssue("Os dados do projeto ultrapassaram os limites permitidos e não foram salvos.");
      return false;
    }
    try {
      window.localStorage.setItem("quantumone.projects.v1", JSON.stringify(nextProjects));
      setProjects(nextProjects);
      setStorageIssue("");
      setStorageReadBlocked(false);
      window.dispatchEvent(new CustomEvent("quantumone:projects-changed", { detail: nextProjects }));
      return true;
    } catch {
      setStorageIssue("Não foi possível salvar as alterações dos projetos. Libere espaço e tente novamente.");
      return false;
    }
  }

  useEffect(() => {
    if (!isCreateDialogOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setIsCreateDialogOpen(false);
      setProjectName("");
      setProjectDescription("");
      setProjectLanguage("OpenQASM 2");
      setFormError("");
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isCreateDialogOpen]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return projects
      .filter((project) =>
        `${project.name} ${project.description} ${project.language}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery)
      )
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [projects, query]);

  function resetCreateForm() {
    setProjectName("");
    setProjectDescription("");
    setProjectLanguage("OpenQASM 2");
    setFormError("");
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = projectName.trim();
    if (!normalizedName) {
      setFormError("Dê um nome ao projeto para continuar.");
      return;
    }
    const project: ProjectRecord = {
      id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
      name: normalizedName,
      description: projectDescription.trim() || "Workspace de desenvolvimento quântico.",
      language: projectLanguage,
      createdAt: new Date().toISOString(),
    };
    if (!persistProjects([project, ...projects])) return;
    setActionMessage({ message: `Projeto “${normalizedName}” criado.`, tone: "success" });
    setQuery("");
    setIsCreateDialogOpen(false);
    resetCreateForm();
  }

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);
    resetCreateForm();
  }

  function renameProject(id: string) {
    const normalizedName = editingProjectName.trim();
    if (!normalizedName) return;
    if (!persistProjects(projects.map((project) => project.id === id ? { ...project, name: normalizedName } : project))) return;
    setActionMessage({ message: "Nome do projeto atualizado.", tone: "success" });
    setEditingProjectId(null);
    setEditingProjectName("");
  }

  function toggleProjectPin(id: string) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    if (persistProjects(projects.map((item) => item.id === id ? { ...item, isPinned: !item.isPinned } : item))) {
      setActionMessage({ message: project.isPinned ? "Projeto desafixado." : "Projeto fixado.", tone: "success" });
    }
  }

  function deleteProject(project: ProjectRecord) {
    if (!window.confirm(`Excluir o projeto “${project.name}”?`)) return;
    if (persistProjects(projects.filter((item) => item.id !== project.id))) {
      setActionMessage({ message: `Projeto “${project.name}” excluído.`, tone: "success" });
    }
  }

  function downloadProject(project: ProjectRecord) {
    try {
      const contents = JSON.stringify(project, null, 2);
      const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = project.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-|-$/g, "") || "projeto";
      link.href = url;
      link.download = `${safeName}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionMessage({ message: `Projeto “${project.name}” exportado.`, tone: "success" });
    } catch {
      setActionMessage({ message: "Não foi possível baixar o projeto. Tente novamente.", tone: "error", action: { label: "Tentar novamente", onClick: () => downloadProject(project) } });
    }
  }

  function closeProjectMenu(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <main className="workspace projects-workspace">
      <section className="page-intro projects-page-intro">
        <div>
          <span className="eyebrow">QUANTUMONE / WORKSPACE</span>
          <h1>Projetos</h1>
          <p>
            Acesse seus workspaces e mantenha cada contexto de desenvolvimento
            organizado.
          </p>
        </div>

        <div className="projects-overview-badge">
          <span className="workspace-dot" aria-hidden="true" />
          {projects.length} {projects.length === 1 ? "workspace" : "workspaces"}
        </div>
      </section>

      <section className="projects-toolbar" aria-label="Ferramentas de projetos">
        <label className="projects-search">
          <span className="projects-search-icon" aria-hidden="true">⌕</span>
          <span className="visually-hidden">Buscar projetos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar projetos..."
          />
        </label>

        <div className="projects-toolbar-actions">
          <span className="projects-count" aria-live="polite" aria-atomic="true">
            {filteredProjects.length} {filteredProjects.length === 1 ? "projeto" : "projetos"}
          </span>
          <button
            type="button"
            className="button-primary project-create-button"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <span aria-hidden="true">＋</span>
            Criar projeto
          </button>
        </div>
      </section>

      {storageIssue && <FeedbackMessage tone="warning" className="projects-storage-alert" message={storageIssue} />}
      {actionMessage && <FeedbackMessage tone={actionMessage.tone} className="projects-action-message" message={actionMessage.message} action={actionMessage.action} />}

      {filteredProjects.length > 0 ? (
        <section className="projects-grid" aria-label="Lista de projetos">
          {filteredProjects.map((project) => {
            const relatedConversations = conversations
              .filter((conversation) => conversation.projectId === project.id)
              .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
            return (
            <article className="panel project-card project-card-current" key={project.id}>
              <div className="project-card-topline">
                <span className="project-type-label">
                  PROJETO QUANTUMONE
                </span>
                <div className="project-card-top-actions">
                  {project.isPinned && <span className="project-pinned-badge">Fixado</span>}
                  <span className="project-status">
                    <span aria-hidden="true" /> Disponível
                  </span>
                  <details className="project-actions-menu">
                    <summary aria-label={`Ações do projeto ${project.name}`} title="Ações do projeto">•••</summary>
                    <div className="project-actions-popover" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                          closeProjectMenu(event);
                          toggleProjectPin(project.id);
                        }}
                      >
                        {project.isPinned ? "Desafixar projeto" : "Fixar projeto"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                          closeProjectMenu(event);
                          setEditingProjectId(project.id);
                          setEditingProjectName(project.name);
                        }}
                      >
                        Editar nome
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                          closeProjectMenu(event);
                          downloadProject(project);
                        }}
                      >
                        Baixar projeto (.json)
                      </button>
                      <button
                        type="button"
                        className="project-menu-delete"
                        role="menuitem"
                        onClick={(event) => {
                          closeProjectMenu(event);
                          deleteProject(project);
                        }}
                      >
                        Excluir projeto
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              <div className="project-card-identity">
                <div className="project-icon-shell">
                  <Image
                    src="/images/quantumone-icon.png"
                    alt=""
                    width={42}
                    height={42}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  {editingProjectId === project.id ? (
                    <form
                      className="project-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        renameProject(project.id);
                      }}
                    >
                      <input
                        autoFocus
                        aria-label="Novo nome do projeto"
                        maxLength={80}
                        value={editingProjectName}
                        onChange={(event) => setEditingProjectName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setEditingProjectId(null);
                        }}
                      />
                      <button type="submit" aria-label="Salvar nome">✓</button>
                      <button type="button" aria-label="Cancelar edição" onClick={() => setEditingProjectId(null)}>×</button>
                    </form>
                  ) : (
                    <h2>{project.name}</h2>
                  )}
                  <p>{project.description}</p>
                </div>
              </div>

              <div className="project-tags" aria-label="Linguagens do projeto">
                <span>{project.language}</span>
                <span>{relatedConversations.length} {relatedConversations.length === 1 ? "conversa" : "conversas"}</span>
              </div>

              <section className="project-conversations" aria-label={`Conversas relacionadas a ${project.name}`}>
                <div className="project-conversations-heading">
                  <strong>Conversas deste projeto</strong>
                  <span>{relatedConversations.length.toString().padStart(2, "0")}</span>
                </div>
                {relatedConversations.length ? (
                  <div className="project-conversation-list">
                    {relatedConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className="project-conversation-row"
                        onClick={() => onOpenConversation(conversation.id)}
                      >
                        <span className="project-conversation-mark" aria-hidden="true">Q</span>
                        <span className="project-conversation-copy">
                          <strong>{conversation.title}</strong>
                          <small>{conversation.prompt.trim() || (conversation.activeLanguage === "qasm" ? "Conversa OpenQASM 2" : "Conversa Python / Qiskit")}</small>
                        </span>
                        <span className="project-conversation-open" aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="project-conversations-empty">As conversas adicionadas a este projeto aparecerão aqui.</p>
                )}
              </section>

              <div className="project-card-footer">
                <span className="project-last-opened">
                  <span className="project-presence-dot" aria-hidden="true" />
                  Criado no QuantumOne
                </span>
                <button
                  type="button"
                  className="button-primary project-open-button"
                  onClick={() => onOpenWorkspace(project.id)}
                >
                  Abrir workspace
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          className="panel projects-empty-state"
          icon={<Image src="/images/quantumone-icon.png" alt="" width={48} height={48} />}
          iconClassName="projects-empty-mark"
          title={query ? "Nenhum projeto encontrado" : "Nenhum projeto criado"}
          description={query
            ? `Não encontramos projetos para “${query}”. Confira o nome e tente novamente.`
            : "Seus projetos aparecerão aqui depois que você clicar em Criar projeto."}
          action={query ? { label: "Limpar busca", onClick: () => setQuery(""), className: "button-secondary" } : undefined}
        />
      )}

      <section className="projects-info-strip">
        <span className="projects-info-icon" aria-hidden="true">✦</span>
        <p>
          Projetos criados aqui ficam salvos neste dispositivo. Vincular pastas locais e
          repositórios Git exige acesso explícito ao computador.
        </p>
      </section>

      {isCreateDialogOpen && (
        <div className="project-dialog-layer">
          <button
            type="button"
            className="project-dialog-backdrop"
            aria-label="Fechar janela de criação"
            onClick={closeCreateDialog}
          />
          <section
            className="panel project-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-create-title"
            tabIndex={-1}
            ref={createDialogRef}
          >
            <div className="project-dialog-heading">
              <div>
                <span className="section-kicker">NOVO WORKSPACE</span>
                <h2 id="project-create-title">Criar projeto</h2>
                <p>Defina um nome e o contexto principal do projeto.</p>
              </div>
              <button
                type="button"
                className="button-quiet project-dialog-close"
                aria-label="Fechar janela"
                onClick={closeCreateDialog}
              >
                ×
              </button>
            </div>

            <form className="project-create-form" onSubmit={createProject}>
              <label>
                <span>Nome do projeto</span>
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={projectName}
                  onChange={(event) => {
                    setProjectName(event.target.value);
                    setFormError("");
                  }}
                  placeholder="Ex.: Otimização de circuitos"
                />
              </label>

              <label>
                <span>Descrição <small>opcional</small></span>
                <textarea
                  rows={3}
                  maxLength={240}
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="Descreva o objetivo deste workspace..."
                />
              </label>

              <label>
                <span>Linguagem principal</span>
                <select
                  value={projectLanguage}
                  onChange={(event) => setProjectLanguage(event.target.value as ProjectRecord["language"])}
                >
                  <option>OpenQASM 2</option>
                  <option>Python / Qiskit</option>
                </select>
              </label>

              <p className="project-create-note">
                O projeto será salvo no QuantumOne neste dispositivo.
              </p>

              {formError && <FeedbackMessage tone="error" className="project-form-error" message={formError} />}

              <div className="project-dialog-actions">
                <button type="button" className="button-secondary" onClick={closeCreateDialog}>Cancelar</button>
                <button type="submit" className="button-primary">
                  Criar projeto <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
