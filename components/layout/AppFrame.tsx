"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import ProjectsPage from "../projects/ProjectsPage";
import HistoryPage from "../history/HistoryPage";
import SettingsPage from "../settings/SettingsPage";
import type { ConversationRecord, ProjectRecord } from "./conversationTypes";

type AppFrameProps = {
  activeItem: string;
  children: ReactNode;
  conversations?: ConversationRecord[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onStartNewConversation?: () => void;
  onRenameConversation?: (id: string, title: string) => void;
  onToggleConversationPin?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  projects?: ProjectRecord[];
  onAssignConversationToProject?: (conversationId: string, projectId: string | null) => void;
  onOpenProjectWorkspace?: (projectId: string) => void;
};

export default function AppFrame({
  activeItem,
  children,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onStartNewConversation,
  onRenameConversation,
  onToggleConversationPin,
  onDeleteConversation,
  projects = [],
  onAssignConversationToProject,
  onOpenProjectWorkspace,
}: AppFrameProps) {
  const [currentItem, setCurrentItem] = useState(activeItem);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    function closeOpenMenus(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const openMenus = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[open]"));
      if (!openMenus.length) return;
      event.preventDefault();
      openMenus.forEach((menu) => menu.removeAttribute("open"));
    }
    document.addEventListener("keydown", closeOpenMenus);
    return () => document.removeEventListener("keydown", closeOpenMenus);
  }, []);

  return (
    <div className={`app-frame ${isCollapsed ? "is-collapsed" : ""}`}>
      <Sidebar
        activeItem={currentItem}
        onNavigate={(item) => {
          setCurrentItem(item);
          if (item === "new-analysis") onStartNewConversation?.();
        }}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setCurrentItem("new-analysis");
          onSelectConversation?.(id);
        }}
        projects={projects}
        onRenameConversation={onRenameConversation}
        onDeleteConversation={onDeleteConversation}
        onToggleConversationPin={onToggleConversationPin}
        onAssignConversationToProject={onAssignConversationToProject}
      />
      <div className="app-frame-content">
        {currentItem === "projects" ? (
          <ProjectsPage
            conversations={conversations}
            onOpenWorkspace={(projectId) => {
              setCurrentItem("new-analysis");
              onOpenProjectWorkspace?.(projectId);
            }}
            onOpenConversation={(id) => {
              setCurrentItem("new-analysis");
              onSelectConversation?.(id);
            }}
          />
        ) : currentItem === "history" ? (
          <HistoryPage
            conversations={conversations}
            activeConversationId={activeConversationId}
            onOpenConversation={(id) => {
              setCurrentItem("new-analysis");
              onSelectConversation?.(id);
            }}
            onStartNewConversation={() => {
              setCurrentItem("new-analysis");
              onStartNewConversation?.();
            }}
            onRenameConversation={onRenameConversation ?? (() => undefined)}
            onToggleConversationPin={onToggleConversationPin ?? (() => undefined)}
            onDeleteConversation={onDeleteConversation ?? (() => undefined)}
          />
        ) : currentItem === "settings" ? (
          <SettingsPage />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
