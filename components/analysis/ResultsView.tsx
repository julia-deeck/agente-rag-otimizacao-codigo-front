
"use client";

import AppFrame from "../layout/AppFrame";
import AppHeader from "../layout/AppHeader";

type ResultsViewProps = {
  code: string;
  question: string;
  onBack: () => void;
};

export default function ResultsView({
  code,
  question,
  onBack,
}: ResultsViewProps) {
  return (
    <AppFrame activeItem="new-analysis">
    <>
      <AppHeader />

      <main className="workspace">
        <section className="page-intro">
          <span className="eyebrow">
            ANÁLISE DE CÓDIGO
          </span>

          <h1>Resultados da análise</h1>

          <div className="result-header-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onBack}
            >
              Voltar ao editor
            </button>
          </div>
        </section>

        <section className="panel result-section">
          <div className="result-section-heading">
            <h2>Análise indisponível</h2>
          </div>

          <p>
            O serviço de análise ainda não está conectado.
            Assim que a integração com o backend estiver
            disponível, os resultados serão apresentados aqui.
          </p>

          <p>
            Nenhuma sugestão de otimização, métrica ou fonte
            foi gerada nesta etapa.
          </p>
        </section>

        <section className="panel result-section">
          <div className="result-section-heading">
            <h2>Dados enviados</h2>
          </div>

          <div className="question-context">
            <span>Pergunta</span>
            <strong>
              {question.trim() || "Nenhuma pergunta informada."}
            </strong>
          </div>

          <div className="comparison-panel">
            <div className="comparison-panel-heading">
              CÓDIGO OPENQASM 2
            </div>

            <pre className="comparison-code">
              <code>
                {code.trim() || "Nenhum código informado."}
              </code>
            </pre>
          </div>
        </section>

        <footer className="page-footer">
          Agente RAG · Qiskit — Ferramenta de apoio ao
          desenvolvimento quântico.
        </footer>
      </main>
    </>
    </AppFrame>
  );
}
