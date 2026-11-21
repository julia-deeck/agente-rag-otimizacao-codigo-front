
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import type { ConversationRecord, ProjectRecord } from "./conversationTypes";
import { readUserProfile, type UserProfile } from "../auth/profileStorage";

type SidebarProps = {
  activeItem: string;
  onNavigate: (item: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  conversations?: ConversationRecord[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
  onDeleteConversation?: (id: string) => void;
  onToggleConversationPin?: (id: string) => void;
  projects?: ProjectRecord[];
  onAssignConversationToProject?: (conversationId: string, projectId: string | null) => void;
};

const navigationItems = [
  {
    id: "new-analysis",
    label: "Nova análise",
    icon: "＋",
  },
  {
    id: "projects",
    label: "Projetos",
    icon: "▤",
  },
  {
    id: "history",
    label: "Histórico",
    icon: "◷",
  },
];

export default function Sidebar({
  activeItem,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onToggleConversationPin,
  projects = [],
  onAssignConversationToProject,
}: SidebarProps) {
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const orderedConversations = useMemo(() => [...conversations].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  }), [conversations]);

  useEffect(() => {
    const syncProfile = () => setProfile(readUserProfile());
    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("quantumone:profile-changed", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("quantumone:profile-changed", syncProfile);
    };
  }, []);

  function saveConversationTitle(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const title = editingTitle.trim();
    if (!title) return;
    onRenameConversation?.(id, title);
    setEditingConversationId(null);
    setEditingTitle("");
  }

  function closeConversationMenu(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  function confirmDeleteConversation(conversation: ConversationRecord) {
    if (!window.confirm(`Excluir a conversa “${conversation.title}”?`)) return;
    onDeleteConversation?.(conversation.id);
  }

  return (
    <aside className={`quantum-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      {onToggleCollapse && (
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      )}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Image
            src="/images/quantumone-icon.png"
            alt=""
            aria-hidden="true"
            width={42}
            height={42}
            className="sidebar-logo-image"
          />
        </div>

        <div className="sidebar-brand-copy">
          <strong>QuantumOne</strong>
          <span>QUANTUM WORKSPACE</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section-label">
        WORKSPACE
      </div>

      <nav className="sidebar-navigation" aria-label="Navegação principal">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${
              activeItem === item.id ? "active" : ""
            }`}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={
              activeItem === item.id ? "page" : undefined
            }
          >
            <span className="sidebar-item-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <Link href={profile ? "/perfil" : "/cadastro"} className="sidebar-create-account" aria-label={profile?.name ?? "Criar conta"} title={profile?.name ?? "Criar conta"}>
        <span className={`sidebar-item-icon ${profile ? "sidebar-user-icon" : ""}`} aria-hidden="true">
          {profile?.avatarDataUrl ? (
            <Image src={profile.avatarDataUrl} alt="" aria-hidden="true" width={26} height={26} unoptimized className="sidebar-user-avatar" />
          ) : profile ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.25" />
              <path d="M5.5 19.25c.5-3.05 2.9-5.1 6.5-5.1s6 2.05 6.5 5.1" />
            </svg>
          ) : "✦"}
        </span>
        <span>{profile?.name ?? "Criar conta"}</span>
      </Link>

      {conversations.length > 0 && (
        <section className="sidebar-recent-conversations" aria-label="Conversas recentes">
          <div className="sidebar-section-label">RECENTES</div>
          <div className="sidebar-conversation-list">
            {orderedConversations.map((conversation) => (
              <div
                className={`sidebar-conversation-row ${openConversationMenuId === conversation.id ? "is-menu-open" : ""}`}
                key={conversation.id}
              >
                {editingConversationId === conversation.id ? (
                  <form
                    className="sidebar-conversation-rename"
                    onSubmit={(event) => saveConversationTitle(event, conversation.id)}
                  >
                    <input
                      autoFocus
                      aria-label="Novo nome da conversa"
                      maxLength={100}
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setEditingConversationId(null);
                      }}
                    />
                    <button type="submit" aria-label="Salvar nome">✓</button>
                    <button type="button" aria-label="Cancelar edição" onClick={() => setEditingConversationId(null)}>×</button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className={
                        "sidebar-conversation-item " +
                        (conversation.id === activeConversationId ? "active " : "") +
                        (conversation.isPinned ? "is-pinned" : "")
                      }
                      onClick={() => onSelectConversation?.(conversation.id)}
                      aria-current={
                        conversation.id === activeConversationId ? "page" : undefined
                      }
                      title={conversation.title}
                    >
                      <span className="sidebar-conversation-marker" aria-hidden="true" />
                      <span className="sidebar-conversation-copy">
                        <span className="sidebar-conversation-title">{conversation.title}</span>
                        {conversation.projectId && (
                          <span className="sidebar-conversation-project">
                            {projects.find((project) => project.id === conversation.projectId)?.name ?? "Projeto"}
                          </span>
                        )}
                      </span>
                    </button>
                    <details
                      className="sidebar-conversation-menu"
                      onToggle={(event) => {
                        const details = event.currentTarget;
                        if (details.open) {
                          details.closest(".quantum-sidebar")
                            ?.querySelectorAll<HTMLDetailsElement>(".sidebar-conversation-menu[open]")
                            .forEach((otherMenu) => {
                              if (otherMenu !== details) otherMenu.removeAttribute("open");
                            });
                        }
                        setOpenConversationMenuId((current) =>
                          details.open ? conversation.id : current === conversation.id ? null : current
                        );
                      }}
                    >
                      <summary aria-label={`Ações da conversa ${conversation.title}`} title="Ações da conversa">•••</summary>
                      <div className="sidebar-conversation-popover">
                        <button
                          type="button"
                          onClick={(event) => {
                            closeConversationMenu(event);
                            onToggleConversationPin?.(conversation.id);
                          }}
                        >
                          {conversation.isPinned ? "Desafixar conversa" : "Fixar conversa"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            closeConversationMenu(event);
                            setEditingConversationId(conversation.id);
                            setEditingTitle(conversation.title);
                          }}
                        >
                          Editar nome
                        </button>
                        <div className="sidebar-project-picker">
                          <span>{conversation.projectId ? "Mover para projeto" : "Adicionar a projeto"}</span>
                          {projects.length > 0 ? projects.map((project) => (
                            <button
                              type="button"
                              key={project.id}
                              className={project.id === conversation.projectId ? "selected" : ""}
                              onClick={(event) => {
                                closeConversationMenu(event);
                                onAssignConversationToProject?.(conversation.id, project.id);
                              }}
                            >
                              {project.name}
                            </button>
                          )) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                closeConversationMenu(event);
                                onNavigate("projects");
                              }}
                            >
                              Criar primeiro projeto…
                            </button>
                          )}
                          {conversation.projectId && (
                            <button
                              type="button"
                              className="sidebar-project-remove"
                              onClick={(event) => {
                                closeConversationMenu(event);
                                onAssignConversationToProject?.(conversation.id, null);
                              }}
                            >
                              Remover do projeto
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="sidebar-conversation-delete"
                          onClick={(event) => {
                            closeConversationMenu(event);
                            confirmDeleteConversation(conversation);
                          }}
                        >
                          Excluir conversa
                        </button>
                      </div>
                    </details>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sidebar-spacer" />

      <div className="sidebar-divider" />

      <button
        type="button"
        className={`sidebar-item ${
          activeItem === "settings" ? "active" : ""
        }`}
        onClick={() => onNavigate("settings")}
        aria-label="Configurações"
        aria-current={
          activeItem === "settings" ? "page" : undefined
        }
      >
        <span className="sidebar-item-icon" aria-hidden="true">
          ⚙
        </span>

        <span>Configurações</span>
      </button>

      <div className="sidebar-profile">
        <div className="sidebar-avatar">
          <Image
            src="/images/quantumone-icon.png"
            alt=""
            aria-hidden="true"
            width={30}
            height={30}
            className="sidebar-avatar-image"
          />
        </div>

        <div className="sidebar-profile-copy">
          <strong>QuantumOne</strong>
          <span>Workspace</span>
        </div>

        <span className="sidebar-status" />
      </div>

    </aside>
  );
}
