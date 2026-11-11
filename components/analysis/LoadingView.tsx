"use client";
import type { AnalysisFeedbackType } from "./AnalysisFeedback";

type LoadingViewProps = {
  code: string;
  question: string;
  backend: string;
  topK: string;
  onBack: () => void;
  onShowDemoResult: () => void;
  onShowError: (type: AnalysisFeedbackType) => void;
};

export default function LoadingView({
  code,
  question,
  backend,
  topK,
  onBack,
  onShowDemoResult,
  onShowError,
}: LoadingViewProps) {

  // Divide o código em linhas para exibição
  const codeLines = code
    ? code.split("\n")
    : ["Nenhum código foi informado."];

  const backendName =
    backend === "reference"
      ? "Backend de referência"
      : backend;

  return (
    <>
      {/* CABEÇALHO */}

      <header className="topbar">
        <div className="topbar-inner">

          <div className="brand">
            <div className="brand-symbol">Q</div>

            <div className="brand-copy">
              <strong>Agente RAG</strong>
              <span>Otimização de código</span>
            </div>
          </div>

          <div className="topbar-label">
            Qiskit · Next-Gen Computing
          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}

      <main className="workspace">

        <section className="page-intro">

          <span className="eyebrow">
            ACOMPANHAMENTO
          </span>

          <div className="loading-title-row">
            <h1>Analisando...</h1>

            <span className="preview-badge">
              Prévia local
            </span>
          </div>

          <p>
            Acompanhe as etapas previstas para a análise
            do seu código Qiskit.
          </p>

        </section>

        {/* AVISO SOBRE O MODO DE DEMONSTRAÇÃO */}

        <div className="demo-notice">
          <div className="demo-notice-icon">
            i
          </div>

          <div>
            <strong>Prévia de processamento</strong>

            <p>
              Esta tela demonstra como o acompanhamento
              será apresentado. Nenhuma requisição foi
              enviada ao backend e nenhuma análise real
              foi executada.
            </p>
          </div>
        </div>

        {/* ORGANIZAÇÃO DOS PAINÉIS */}

        <div className="loading-grid">

          {/* CÓDIGO ENVIADO */}

          <section className="panel">

            <div className="panel-heading">

              <div>
                <h2>Código enviado</h2>
                <span>
                  Visualização da entrada original.
                </span>
              </div>

              <span className="readonly-badge">
                Somente leitura
              </span>

            </div>

            <div className="editor-shell">

              <div className="editor-toolbar">

                <span className="language-label">
                  PYTHON
                </span>

                <span>Qiskit</span>

              </div>

              <div className="readonly-code">

                {codeLines.map((line, index) => (
                  <div
                    className="readonly-code-line"
                    key={index}
                  >

                    <span className="readonly-line-number">
                      {index + 1}
                    </span>

                    <code>
                      {line || " "}
                    </code>

                  </div>
                ))}

              </div>

            </div>

            <div className="editor-footer">

              <span>Entrada preservada</span>

              <span>
                {code.length} caracteres
              </span>

            </div>

          </section>

          {/* ACOMPANHAMENTO DAS ETAPAS */}

          <section className="panel progress-panel">

            <div className="panel-heading">

              <div>
                <h2>Etapas do processamento</h2>

                <span>
                  Fluxo previsto do agente RAG.
                </span>
              </div>

            </div>

            <ol className="processing-steps">

              {/* ETAPA 1 */}

              <li className="processing-step step-complete">

                <div className="step-indicator">
                  ✓
                </div>

                <div className="step-content">

                  <strong>
                    Entrada recebida pela interface
                  </strong>

                  <span>
                    Campos preenchidos e conferidos
                    no navegador.
                  </span>

                  <small>
                    Concluída localmente
                  </small>

                </div>

              </li>

              {/* ETAPA 2 */}

              <li className="processing-step">

                <div className="step-indicator">
                  2
                </div>

                <div className="step-content">

                  <strong>
                    Buscando fontes na documentação
                  </strong>

                  <span>
                    Recuperação de trechos relevantes
                    na base de conhecimento.
                  </span>

                  <small>
                    Aguardando integração com o backend
                  </small>

                </div>

              </li>

              {/* ETAPA 3 */}

              <li className="processing-step">

                <div className="step-indicator">
                  3
                </div>

                <div className="step-content">

                  <strong>
                    Analisando o circuito com Qiskit
                  </strong>

                  <span>
                    Análise do circuito e obtenção
                    de métricas.
                  </span>

                  <small>
                    Aguardando integração com o backend
                  </small>

                </div>

              </li>

              {/* ETAPA 4 */}

              <li className="processing-step">

                <div className="step-indicator">
                  4
                </div>

                <div className="step-content">

                  <strong>
                    Gerando explicação e sugestões
                  </strong>

                  <span>
                    Preparação da resposta fundamentada
                    e das recomendações.
                  </span>

                  <small>
                    Aguardando integração com o backend
                  </small>

                </div>

              </li>

            </ol>

            {/* CONTROLES DE DEMONSTRAÇÃO */}

            <section className="demo-controls">

              <span className="section-label">
                CENÁRIOS DE DEMONSTRAÇÃO
              </span>

              <p>
                Utilize os botões abaixo para visualizar os diferentes
                estados previstos da aplicação.
              </p>

              <button
                type="button"
                className="button-primary"
                onClick={onShowDemoResult}
              >
                Simular sucesso
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={() => onShowError("invalid-code")}
              >
                Simular código inválido
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={() => onShowError("insufficient-evidence")}
              >
                Simular sem evidência
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={() => onShowError("service-error")}
              >
                Simular falha de serviço
              </button>

              <small>
                Estes controles são exclusivos da demonstração local.
              </small>

            </section>


            {/* RESUMO DA SOLICITAÇÃO */}

            <div className="request-summary">

              <h3>Resumo da solicitação</h3>

              <div className="summary-item">

                <span>Pergunta / objetivo</span>

                <strong>
                  {question.trim() || "Análise de código"}
                </strong>

              </div>

              <div className="summary-item">

                <span>Backend</span>

                <strong>{backendName}</strong>

              </div>

              <div className="summary-item">

                <span>Trechos recuperados (top_k)</span>

                <strong>{topK}</strong>

              </div>

              <div className="summary-item">

                <span>Identificador da solicitação</span>

                <strong>
                  Ainda não gerado
                </strong>

              </div>

            </div>
            
            <button
              type="button"
              className="button-primary back-button"
              onClick={onShowDemoResult}
            >
              Visualizar resultado demonstrativo →
            </button>

            {/* AVISO DE DEMONSTRAÇÃO */}

            <button
              type="button"
              className="button-secondary back-button"
              onClick={onBack}
            >
              ← Voltar para editar
            </button>

          </section>

        </div>

        <footer className="page-footer">
          Agente RAG · Qiskit — Ferramenta de apoio ao
          desenvolvimento quântico.
        </footer>

      </main>
    </>
  );
}