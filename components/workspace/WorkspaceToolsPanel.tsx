"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { AttachmentRecord } from "../layout/conversationTypes";
import SourceDrawer, { type SourceDetails } from "../analysis/SourceDrawer";

export type WorkspaceToolId = "files" | "diff" | "terminal" | "qiskit" | "sources";

type WorkspaceToolsPanelProps = {
  activeTool: WorkspaceToolId;
  attachments: AttachmentRecord[];
  onPickFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  diffFiles?: DiffFilePreview[];
  onApproveDiffFile?: (id: string) => void;
  onRevertDiffFile?: (id: string) => void;
  terminalOutput?: TerminalOutput;
  onRunCommand?: (command: string) => void;
  qiskitData?: QiskitPreviewData;
  sources?: WorkspaceSource[];
};

export type DiffFilePreview = {
  id: string;
  path: string;
  originalLines: string[];
  proposedLines: string[];
  additions: number;
  removals: number;
};

export type TerminalOutput = {
  status: "idle" | "running" | "success" | "error";
  command?: string;
  lines?: string[];
  exitCode?: number;
};

export type QiskitPreviewData = {
  depth?: number;
  operations?: number;
  qubits?: number;
  equivalence?: "equivalent" | "different" | "unknown";
  gates?: { wire: number; column: number; label: string }[];
};

export type WorkspaceSource = SourceDetails & { version?: string };

const tools: { id: WorkspaceToolId; label: string; icon: string }[] = [
  { id: "files", label: "Arquivos", icon: "\u25A4" },
  { id: "diff", label: "Diff", icon: "\u00B1" },
  { id: "terminal", label: "Terminal", icon: "\u203A_" },
  { id: "qiskit", label: "Qiskit", icon: "\u25C7" },
  { id: "sources", label: "Fontes", icon: "\u2315" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkspaceToolTabs({
  activeTool,
  onSelect,
}: {
  activeTool: WorkspaceToolId | null;
  onSelect: (tool: WorkspaceToolId | null) => void;
}) {
  return (
    <nav className="workspace-tool-tabs" aria-label="Ferramentas do workspace" role="tablist">
      <span className="workspace-tool-tabs-label">FERRAMENTAS</span>
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          role="tab"
          aria-selected={activeTool === tool.id}
          className={activeTool === tool.id ? "active" : ""}
          onClick={() => onSelect(activeTool === tool.id ? null : tool.id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']") ?? []);
            const current = tabs.indexOf(event.currentTarget);
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.focus();
            tabs[next]?.click();
          }}
        >
          <span aria-hidden="true">{tool.icon}</span>
          {tool.label}
        </button>
      ))}
    </nav>
  );
}

function EmptyState({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="workspace-tool-empty">
      <span className="workspace-tool-empty-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export default function WorkspaceToolsPanel({
  activeTool,
  attachments,
  onPickFiles,
  onRemoveAttachment,
  diffFiles = [],
  onApproveDiffFile,
  onRevertDiffFile,
  terminalOutput,
  onRunCommand,
  qiskitData,
  sources = [],
}: WorkspaceToolsPanelProps) {
  const [selectedDiffId, setSelectedDiffId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceDetails | null>(null);
  const [terminalCommand, setTerminalCommand] = useState("");
  const heading = tools.find((tool) => tool.id === activeTool)?.label ?? "Ferramenta";
  const selectedDiff = diffFiles.find((file) => file.id === selectedDiffId) ?? diffFiles[0];

  function runTerminalCommand() {
    const command = terminalCommand.trim();
    if (!command || !onRunCommand) return;
    onRunCommand(command);
    setTerminalCommand("");
  }

  return (
    <section className={`workspace-tool-panel workspace-tool-panel-${activeTool}`} role="tabpanel" aria-label={heading}>
      <div className="workspace-tool-panel-heading">
        <div>
          <span className="section-kicker">WORKSPACE</span>
          <h3>{heading}</h3>
        </div>
        {activeTool === "files" && (
          <button type="button" className="button-secondary tool-action-button" onClick={onPickFiles}>
            <span aria-hidden="true">+</span> Anexar arquivos
          </button>
        )}
      </div>

      {activeTool === "files" && (
        <div className="workspace-files-layout">
          <section className="workspace-project-tree" aria-label="Explorador do projeto">
            <div className="workspace-subpanel-heading"><span>EXPLORADOR</span><span className="workspace-connection-state">ARQUIVOS DO PROJETO</span></div>
            <EmptyState icon={"\u25A4"} title="Nenhum arquivo selecionado">
              <p>Adicione arquivos à conversa para consultá-los nesta área.</p>
            </EmptyState>
            <div className="workspace-permission-summary" aria-label="Permissões de pasta">
              <span>PERMISSÕES</span>
              <div><strong>Leitura</strong><small>Não concedida</small></div>
              <div><strong>Escrita</strong><small>Não concedida</small></div>
            </div>
          </section>

          <section className="workspace-attachments" aria-label="Arquivos anexados à conversa">
            <div className="workspace-subpanel-heading"><span>ANEXOS DA CONVERSA</span><span>{attachments.length.toString().padStart(2, "0")}</span></div>
            {attachments.length ? (
              <div className="workspace-file-list">
                {attachments.map((file) => (
                  <article className="workspace-file-row" key={file.id}>
                    <span className="workspace-file-icon" aria-hidden="true">\u25A4</span>
                    <div>
                      <strong>{file.name}</strong>
                      <span>{formatFileSize(file.size)}{file.type ? ` | ${file.type}` : ""}</span>
                    </div>
                    <button type="button" className="workspace-file-remove" onClick={() => onRemoveAttachment(file.id)} aria-label={`Remover ${file.name}`}>x</button>
                  </article>
                ))}
                <p className="workspace-tool-hint">Arquivos selecionados para esta conversa.</p>
              </div>
            ) : (
              <EmptyState icon="+" title="Nenhum arquivo anexado">
                <p>Selecione arquivos para preparar o contexto desta conversa.</p>
                <button type="button" className="button-secondary tool-action-button" onClick={onPickFiles}>Selecionar arquivos</button>
              </EmptyState>
            )}
          </section>
        </div>
      )}

      {activeTool === "diff" && (
        diffFiles.length ? (
          <div className="workspace-diff-viewer">
          <div className="workspace-diff-status"><span className="workspace-status-dot" /> {diffFiles.length} arquivo(s) com alterações propostas</div>
            <div className="workspace-diff-browser">
              <nav className="workspace-diff-file-list" aria-label="Arquivos com diff">
                {diffFiles.map((file) => (
                  <button key={file.id} type="button" className={selectedDiff?.id === file.id ? "active" : ""} onClick={() => setSelectedDiffId(file.id)}>
                    <span>{file.path}</span><small>+{file.additions} / -{file.removals}</small>
                  </button>
                ))}
              </nav>
              {selectedDiff && (
                <div className="workspace-diff-content">
                  <div className="workspace-diff-file-heading"><strong>{selectedDiff.path}</strong><span>Por arquivo</span></div>
                  <div className="workspace-diff-columns">
                    <div><span>ORIGINAL</span><pre>{selectedDiff.originalLines.map((line, index) => <code key={index}>{String(index + 1).padStart(3, "0")}  {line || " "}{"\n"}</code>)}</pre></div>
                    <div><span>PROPOSTA</span><pre>{selectedDiff.proposedLines.map((line, index) => <code key={index}>{String(index + 1).padStart(3, "0")}  {line || " "}{"\n"}</code>)}</pre></div>
                  </div>
                  {(onApproveDiffFile || onRevertDiffFile) && <div className="workspace-disabled-actions">
                    {onApproveDiffFile && <button type="button" className="button-secondary" onClick={() => onApproveDiffFile(selectedDiff.id)}>Aprovar este arquivo</button>}
                    {onRevertDiffFile && <button type="button" className="button-secondary" onClick={() => onRevertDiffFile(selectedDiff.id)}>Reverter este arquivo</button>}
                  </div>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState icon={"\u00B1"} title="Nenhuma alteração nesta conversa"><p>Quando houver uma proposta, a comparação entre o original e o resultado será exibida aqui.</p></EmptyState>
        )
      )}

      {activeTool === "terminal" && (
        <div className="terminal-preview" aria-label="Terminal do workspace">
          <div className="terminal-preview-toolbar">
            <span><i /> Terminal do workspace</span>
            <span className={`terminal-status terminal-status-${terminalOutput?.status ?? "idle"}`}>{terminalOutput?.status === "running" ? "Executando" : terminalOutput?.status === "error" ? "Falha" : terminalOutput?.status === "success" ? "Concluído" : onRunCommand ? "Pronto" : "Somente leitura"}</span>
          </div>
          <div className="terminal-preview-body">
            {terminalOutput?.command && <div className="terminal-output-command"><code>$ {terminalOutput.command}</code></div>}
            {terminalOutput?.lines?.length ? (
              <pre className="terminal-output-lines">{terminalOutput.lines.join("\n")}</pre>
            ) : (
              <p className="terminal-welcome">Nenhuma saída registrada nesta conversa.</p>
            )}
            {terminalOutput?.exitCode !== undefined && <div className="terminal-exit-code">Processo finalizado com código {terminalOutput.exitCode}.</div>}
            {onRunCommand && <div className="terminal-preview-prompt">
              <span>qone</span><code>$</code>
              <input aria-label="Comando do terminal" value={terminalCommand} onChange={(event) => setTerminalCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runTerminalCommand(); }} placeholder="Digite um comando" disabled={terminalOutput?.status === "running"} />
              <button type="button" onClick={runTerminalCommand} disabled={!terminalCommand.trim() || terminalOutput?.status === "running"}>Executar</button>
            </div>}
          </div>
        </div>
      )}

      {activeTool === "qiskit" && (
        <div className="qiskit-preview">
          <div className="qiskit-metric-grid">
            {[["Profundidade", qiskitData?.depth === undefined ? "-" : String(qiskitData.depth)], ["Operações", qiskitData?.operations === undefined ? "-" : String(qiskitData.operations)], ["Qubits", qiskitData?.qubits === undefined ? "-" : String(qiskitData.qubits)]].map(([label, value]) => (
              <div className="qiskit-metric" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
          {qiskitData?.qubits ? (
            <div className="qiskit-circuit-diagram" aria-label={`Circuito com ${qiskitData.qubits} qubits`}>
              {Array.from({ length: qiskitData.qubits }, (_, wire) => (
                <div className="qiskit-circuit-row" key={wire}>
                  <span>q[{wire}]</span><div className="qiskit-circuit-track" />
                  {qiskitData.gates?.filter((gate) => gate.wire === wire).map((gate, gateIndex) => (
                    <span key={`${gate.column}-${gateIndex}`} className="qiskit-gate" style={{ left: `${72 + gate.column * 42}px` }}>{gate.label}</span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
              <div className="qiskit-circuit-empty"><span className="qiskit-circuit-wire" /><span className="qiskit-circuit-label">Nenhum circuito nesta conversa</span><span className="qiskit-circuit-wire" /></div>
          )}
          <div className={`qiskit-equivalence-state qiskit-equivalence-${qiskitData?.equivalence ?? "unknown"}`}><span className="qiskit-state-dot" /><div><strong>{qiskitData?.equivalence === "equivalent" ? "Circuitos equivalentes" : qiskitData?.equivalence === "different" ? "Circuitos diferentes" : "Equivalência não verificada"}</strong><span>{qiskitData?.equivalence === "unknown" || !qiskitData?.equivalence ? "Nenhuma verificação foi executada." : "Resultado recebido da verificação."}</span></div></div>
        </div>
      )}

      {activeTool === "sources" && (
        sources.length ? (
          <div className="workspace-source-browser">
            <div className="workspace-source-list">
              {sources.map((source) => (
                <button type="button" className="workspace-source-card" key={source.id} onClick={() => setSelectedSource(source)}>
                  <span className="workspace-source-type">{source.category} / {source.type}</span>
                  <strong>{source.title}</strong>
                  <span className="workspace-source-meta">{source.origin}{source.version ? ` | ${source.version}` : ""}</span>
                  <p>{source.excerpt}</p>
                  <span className="workspace-source-open">Ver evidencia</span>
                </button>
              ))}
            </div>
            <SourceDrawer source={selectedSource} onClose={() => setSelectedSource(null)} />
          </div>
        ) : (
          <EmptyState icon={"\u2315"} title="Fontes e evidências">
          <p>Nenhuma fonte associada a esta conversa.</p>
          </EmptyState>
        )
      )}
    </section>
  );
}
