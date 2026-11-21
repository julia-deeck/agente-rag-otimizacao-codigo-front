"use client";

import { useId, type ReactNode } from "react";

type EmptyStateProps = {
  className: string;
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  description: ReactNode;
  action?: { label: string; onClick: () => void; className: string };
};

export default function EmptyState({ className, icon, iconClassName = "", title, description, action }: EmptyStateProps) {
  const titleId = useId();
  return (
    <section className={`ui-empty-state ${className}`} aria-labelledby={titleId}>
      {icon && <div className={iconClassName} aria-hidden="true">{icon}</div>}
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {action && <button type="button" className={action.className} onClick={action.onClick}>{action.label}</button>}
    </section>
  );
}
