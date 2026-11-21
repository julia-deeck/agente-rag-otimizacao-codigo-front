import type { ReactNode } from "react";

export type FeedbackTone = "error" | "warning" | "success" | "info" | "loading";
export type FeedbackAction = { label: string; onClick: () => void };

type FeedbackMessageProps = {
  tone: FeedbackTone;
  message: string;
  className?: string;
  children?: ReactNode;
  action?: FeedbackAction;
};

const ICONS: Record<FeedbackTone, string> = {
  error: "!",
  warning: "!",
  success: "✓",
  info: "i",
  loading: "…",
};

export default function FeedbackMessage({ tone, message, className = "", children, action }: FeedbackMessageProps) {
  const isError = tone === "error";
  return (
    <div
      className={`ui-feedback-message is-${tone} ${className}`.trim()}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <span className="ui-feedback-icon" aria-hidden="true">{ICONS[tone]}</span>
      <div className="ui-feedback-content">
        <p>{message}</p>
        {children}
        {action && <button type="button" className="ui-feedback-action" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
}
