"use client";

import { useState } from "react";
import type { AnalysisResultRecord } from "../layout/conversationTypes";
import FeedbackMessage from "../ui/FeedbackMessage";

function safeExternalUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return (url.protocol === "https:" || localHttp) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function AnalysisResultPanel({ result }: { result?: AnalysisResultRecord }) {
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function copySummary() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setNotice({ tone: "success", message: "Resumo copiado para a área de transferência." });
    } catch {
      setNotice({ tone: "error", message: "Não foi possível copiar o resumo. Verifique a permissão da área de transferência." });
    }
  }

  function exportReport() {
    if (!result) return;
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "relatorio-analise-quantumone.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: "success", message: "Relatório exportado." });
    } catch {
      setNotice({ tone: "error", message: "Não foi possível exportar o relatório." });
    }
  }

  if (!result) return (
    <section className="analysis-result-panel analysis-result-empty" aria-labelledby="analysis-result-title">
      <div className="analysis-result-heading">
        <span className="analysis-result-mark" aria-hidden="true">✦</span>
        <div><span className="analysis-result-eyebrow">QONE AGENT</span><h2 id="analysis-result-title">Solicitação registrada</h2></div>
      </div>
      <p>A solicitação foi adicionada à conversa. O espaço abaixo organiza o resumo, as sugestões, as justificativas e as fontes da análise.</p>
      <div className="analysis-result-sections" aria-label="Seções do relatório">
        <span>Resumo</span><span>Sugestões</span><span>Justificativas</span><span>Fontes</span>
      </div>
    </section>
  );

  const metrics = result.metrics;
  return (
    <section className="analysis-result-panel" aria-labelledby="analysis-result-title">
      <div className="analysis-result-heading">
        <span className="analysis-result-mark" aria-hidden="true">✦</span>
        <div><span className="analysis-result-eyebrow">QONE AGENT · ANÁLISE</span><h2 id="analysis-result-title">Resultado</h2></div>
        <div className="analysis-result-actions"><button type="button" onClick={copySummary}>Copiar resumo</button><button type="button" onClick={exportReport}>Exportar JSON</button></div>
      </div>
      {notice && <FeedbackMessage tone={notice.tone} message={notice.message} />}
      <section className="analysis-result-section"><h3>Resumo</h3><p className="analysis-result-summary">{result.summary}</p></section>
      {metrics && Object.values(metrics).some((value) => value !== undefined) && (
        <section className="analysis-result-section"><h3>Métricas</h3><dl className="analysis-result-metrics">
          {metrics.depthBefore !== undefined && <div><dt>Profundidade antes</dt><dd>{metrics.depthBefore}</dd></div>}
          {metrics.depthAfter !== undefined && <div><dt>Profundidade depois</dt><dd>{metrics.depthAfter}</dd></div>}
          {metrics.gatesBefore !== undefined && <div><dt>Portas antes</dt><dd>{metrics.gatesBefore}</dd></div>}
          {metrics.gatesAfter !== undefined && <div><dt>Portas depois</dt><dd>{metrics.gatesAfter}</dd></div>}
        </dl></section>
      )}
      {result.suggestions.length > 0 && <section className="analysis-result-section"><h3>Sugestões <span>{result.suggestions.length}</span></h3><div className="analysis-suggestions">
        {result.suggestions.map((item, index) => <article key={`${item.title}-${index}`} className="analysis-suggestion"><h4>{item.title}</h4><p>{item.description}</p><p><strong>Justificativa:</strong> {item.rationale}</p>{item.code && <pre><code>{item.code}</code></pre>}</article>)}
      </div></section>}
      {result.warnings?.length ? <section className="analysis-result-section"><h3>Observações</h3><ul className="analysis-result-warnings">{result.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></section> : null}
      {result.sources.length > 0 && <section className="analysis-result-section"><h3>Fontes <span>{result.sources.length}</span></h3><ul className="analysis-result-sources">
        {result.sources.map((source, index) => { const href = safeExternalUrl(source.url); return <li key={`${source.title}-${index}`}><div><strong>{source.title}</strong>{source.origin && <span>{source.origin}</span>}</div>{source.excerpt && <p>{source.excerpt}</p>}{href && <a href={href} target="_blank" rel="noopener noreferrer">Abrir fonte <span aria-hidden="true">↗</span></a>}</li>; })}
      </ul></section>}
      {result.requestId && <p className="analysis-result-id">Referência: <code>{result.requestId}</code></p>}
    </section>
  );
}
