"use client";

import { useMemo, useState } from "react";
import type { ConversationRecord } from "../layout/conversationTypes";
import FeedbackMessage, { type FeedbackAction, type FeedbackTone } from "../ui/FeedbackMessage";
import EmptyState from "../ui/EmptyState";

type HistoryPageProps = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  onOpenConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onToggleConversationPin: (id: string) => void;
  onDeleteConversation: (id: string) => void;
};

function conversationDate(conversation: ConversationRecord) {
  if (!conversation.createdAt) return "Data indisponível";
  const date = new Date(conversation.createdAt);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function conversationPreview(conversation: ConversationRecord) {
  const prompt = conversation.prompt.trim();
  if (prompt) return prompt;
  const codeFiles = conversation.codeFiles?.filter((file) => file.language === conversation.activeLanguage && file.content.trim()) ?? [];
  if (codeFiles.length) return codeFiles.map((file) => file.name).join(", ");
  return conversation.activeLanguage === "qasm"
    ? "Circuito OpenQASM 2 anexado"
    : "Código Python / Qiskit anexado";
}

function exportConversation(conversation: ConversationRecord) {
  try {
    const contents = JSON.stringify(conversation, null, 2);
    const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = conversation.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "") || "conversa";
    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export default function HistoryPage({
  conversations,
  activeConversationId,
  onOpenConversation,
  onStartNewConversation,
  onRenameConversation,
  onToggleConversationPin,
  onDeleteConversation,
}: HistoryPageProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [actionMessage, setActionMessage] = useState<{ message: string; tone: FeedbackTone; action?: FeedbackAction } | null>(null);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return [...conversations]
      .filter((conversation) =>
        `${conversation.title} ${conversation.prompt}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery)
      )
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
  }, [conversations, query]);

  function saveTitle(id: string) {
    const title = editingTitle.trim();
    if (!title) {
      setActionMessage({ message: "O título não pode ficar vazio.", tone: "error" });
      return;
    }
    onRenameConversation(id, title);
    setActionMessage({ message: "Título atualizado.", tone: "success" });
    setEditingId(null);
    setEditingTitle("");
  }

  function confirmDelete(conversation: ConversationRecord) {
    if (window.confirm(`Excluir a conversa “${conversation.title}”?`)) {
      onDeleteConversation(conversation.id);
      setActionMessage({ message: `Conversa “${conversation.title}” excluída.`, tone: "success" });
    }
  }

  function exportAndReport(conversation: ConversationRecord) {
    const exported = exportConversation(conversation);
    setActionMessage(exported
      ? { message: `Conversa “${conversation.title}” exportada.`, tone: "success" }
      : { message: "Não foi possível exportar a conversa. Tente novamente.", tone: "error", action: { label: "Tentar novamente", onClick: () => exportAndReport(conversation) } });
  }

  return (
    <main className="workspace history-workspace">
      <section className="page-intro history-page-intro">
        <div>
          <span className="eyebrow">QUANTUMONE / WORKSPACE</span>
          <h1>Histórico</h1>
          <p>Pesquise, organize e retome suas conversas com o QOne Agent.</p>
        </div>
        <button type="button" className="button-primary" onClick={onStartNewConversation}>
          <span aria-hidden="true">＋</span>
          Nova conversa
        </button>
      </section>

      <section className="history-toolbar" aria-label="Pesquisar histórico">
        <label className="history-search">
          <span aria-hidden="true">⌕</span>
          <span className="visually-hidden">Pesquisar conversas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título ou mensagem..."
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca">
              ×
            </button>
          )}
        </label>
        <span className="history-count" aria-live="polite" aria-atomic="true">
          {filteredConversations.length} {filteredConversations.length === 1 ? "conversa" : "conversas"}
        </span>
      </section>

      {actionMessage && <FeedbackMessage tone={actionMessage.tone} className="history-action-message" message={actionMessage.message} action={actionMessage.action} />}

      {filteredConversations.length > 0 ? (
        <section className="history-list" aria-label="Conversas salvas">
          {filteredConversations.map((conversation) => (
            <article
              key={conversation.id}
              className={`panel history-card ${conversation.id === activeConversationId ? "is-active" : ""}`}
            >
              <div className="history-card-main">
                <span className="history-card-icon" aria-hidden="true">◷</span>
                <div className="history-card-copy">
                  <div className="history-card-title-row">
                    {editingId === conversation.id ? (
                      <form
                        className="history-rename-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveTitle(conversation.id);
                        }}
                      >
                        <input
                          autoFocus
                          aria-label="Novo título da conversa"
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button type="submit" className="history-icon-button" aria-label="Salvar título">✓</button>
                        <button type="button" className="history-icon-button" onClick={() => setEditingId(null)} aria-label="Cancelar renomeação">×</button>
                      </form>
                    ) : (
                      <h2>{conversation.title}</h2>
                    )}
                    {conversation.isPinned && <span className="history-pinned-badge">Fixada</span>}
                  </div>
                  <p>{conversationPreview(conversation)}</p>
                  <div className="history-card-meta">
                    <span>{conversationDate(conversation)}</span>
                    <span className="history-meta-dot" aria-hidden="true" />
                    <span>{conversation.activeLanguage === "qasm" ? "OpenQASM 2" : "Python / Qiskit"}</span>
                    {(conversation.qasmCode.trim() || conversation.pythonCode.trim() || conversation.codeFiles?.some((file) => file.content.trim())) && (
                      <>
                        <span className="history-meta-dot" aria-hidden="true" />
                        <span>Código anexado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="history-card-actions">
                <button
                  type="button"
                  className="button-secondary history-open-button"
                  onClick={() => onOpenConversation(conversation.id)}
                >
                  Retomar conversa <span aria-hidden="true">↗</span>
                </button>
                <div className="history-utility-actions">
                  <button
                    type="button"
                    className="history-text-action"
                    onClick={() => {
                      onToggleConversationPin(conversation.id);
                      setActionMessage({ message: conversation.isPinned ? "Conversa desafixada." : "Conversa fixada.", tone: "success" });
                    }}
                  >
                    {conversation.isPinned ? "Desafixar" : "Fixar"}
                  </button>
                  <button
                    type="button"
                    className="history-text-action"
                    onClick={() => exportAndReport(conversation)}
                  >
                    Exportar
                  </button>
                  <button
                    type="button"
                    className="history-text-action"
                    onClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title);
                    }}
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    className="history-text-action history-delete-action"
                    onClick={() => confirmDelete(conversation)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          className="panel history-empty-state"
          icon="◷"
          iconClassName="history-empty-icon"
          title={query ? "Nenhuma conversa encontrada" : "Seu histórico começa aqui"}
          description={query
            ? "Tente buscar por outro título ou trecho de mensagem."
            : "As conversas criadas no workspace ficam disponíveis aqui para você retomar quando quiser."}
          action={query
            ? { label: "Limpar busca", onClick: () => setQuery(""), className: "button-secondary" }
            : { label: "Iniciar conversa", onClick: onStartNewConversation, className: "button-primary" }}
        />
      )}

      <p className="history-storage-note">Seu histórico é salvo localmente neste dispositivo.</p>
    </main>
  );
}
