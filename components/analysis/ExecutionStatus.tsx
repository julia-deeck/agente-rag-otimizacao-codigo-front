"use client";

export type ExecutionStage = "saved" | "reading" | "planning" | "executing" | "validating" | "complete" | "failed";

const stages: { id: Exclude<ExecutionStage, "failed">; label: string }[] = [
  { id: "saved", label: "Solicitação salva" },
  { id: "reading", label: "Leitura do projeto" },
  { id: "planning", label: "Planejamento" },
  { id: "executing", label: "Execução" },
  { id: "validating", label: "Validação e evidências" },
  { id: "complete", label: "Concluída" },
];

export default function ExecutionStatus({ stage }: { stage: ExecutionStage }) {
  const currentIndex = stage === "failed" ? 1 : stages.findIndex((item) => item.id === stage);

  return (
    <ol className={`execution-stage-list execution-stage-${stage}`} aria-label="Etapas da análise">
      {stages.map((item, index) => {
        const state = stage === "failed" && index === 1
          ? "failed"
          : stage === "complete" || index < currentIndex || (stage === "saved" && index === currentIndex)
            ? "complete"
            : index === currentIndex
              ? "active"
              : "pending";
        return (
          <li key={item.id} className={`execution-stage ${state}`} aria-current={state === "active" ? "step" : undefined}>
            <i aria-hidden="true" /> {stage === "failed" && index === 1 ? "Falha na execução" : item.label}
          </li>
        );
      })}
    </ol>
  );
}
