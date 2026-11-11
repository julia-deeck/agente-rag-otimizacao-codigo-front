
"use client";

import { useState } from "react";

// Tipos de situações que a aplicação pode apresentar
export type AnalysisFeedbackType =
  | "invalid-code"
  | "insufficient-evidence"
  | "service-error";

type AnalysisFeedbackProps = {
  type: AnalysisFeedbackType;
  code: string;
  question: string;
  requestId: string;
  errorLine?: number;
  onBack: () => void;
  onRetry: () => void;
};

// Componente para exibir código somente leitura
function FeedbackCode({
  code,
  errorLine,
}: {
  code: string;
  errorLine?: number;
}) {
  const lines = code
    ? code.split("\n")
    : ["Nenhum código foi informado."];

  return (
    <div className="feedback-code">

      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const isErrorLine = lineNumber === errorLine;

        return (
          <div
            key={lineNumber}
            className={`feedback-code-line ${
              isErrorLine ? "has-error" : ""
            }`}
          >
            <span className="feedback-line-number">
              {lineNumber}
            </span>

            <code>{line || " "}</code>

            {isErrorLine && (
              <span className="feedback-line-indicator">
                Erro demonstrativo
              </span>
            )}
          </div>
        );
      })}

    </div>
  );
}

export default function AnalysisFeedback({
  type,
  code,
  question,
  requestId,
  errorLine = 5,
  onBack,
  onRetry,
}: AnalysisFeedbackProps) {

  const [copyMessage, setCopyMessage] = useState("");

  // Copiar identificador da solicitação
  async function handleCopyRequestId() {
    try {
      await navigator.clipboard.writeText(requestId);

      setCopyMessage("Identificador copiado com sucesso!");

    } catch {
      setCopyMessage(
        "Não foi possível copiar automaticamente."
      );
    }
  }

  const isInvalidCode = type === "invalid-code";

  const isInsufficientEvidence =
    type === "insufficient-evidence";

  const isServiceError = type === "service-error";

  return (
    <>

      {/* CABEÇALHO */}

      <header className="topbar">

        <div className="topbar-inner">

          <div className="brand">

            <div className="brand-symbol">
              Q
            </div>

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

      <main className="workspace feedback-workspace">

        {/* IDENTIFICAÇÃO DO CENÁRIO */}

        <section className="page-intro">

          <span className="eyebrow">
            ACOMPANHAMENTO DA SOLICITAÇÃO
          </span>

          <h1>
            {isInvalidCode
              ? "Não foi possível analisar o código"
              : isInsufficientEvidence
                ? "Resultado da análise"
                : "Análise não concluída"}
          </h1>

          <p>
            {isInvalidCode
              ? "Identificamos uma situação que precisa ser corrigida na entrada."
              : isInsufficientEvidence
                ? "Não encontramos informações suficientes para fundamentar esta análise."
                : "O processamento não pôde ser concluído devido a uma falha no serviço."}
          </p>

        </section>

        {/* CENÁRIO 1: CÓDIGO INVÁLIDO */}

        {isInvalidCode && (

          <>

            <div className="feedback-alert error-alert">

              <span className="feedback-alert-icon">
                !
              </span>

              <div>
                <strong>
                  Código inválido
                </strong>

                <p>
                  Corrija o código destacado e envie novamente.
                  Sua entrada foi preservada.
                </p>
              </div>

            </div>

            <section className="panel feedback-code-panel">

              <div className="panel-heading">

                <div>
                  <h2>Código Qiskit</h2>

                  <span>
                    Sua entrada foi preservada.
                  </span>
                </div>

                <span className="readonly-badge">
                  Somente leitura
                </span>

              </div>

              <FeedbackCode
                code={code}
                errorLine={errorLine}
              />

              <div className="feedback-error-detail">

                <strong>
                  Exemplo de diagnóstico da linha {errorLine}
                </strong>

                <p>
                  A operação <code>qc.cx()</code> precisa receber
                  dois qubits: controle e alvo. Por exemplo:
                  <code> qc.cx(0, 1)</code>.
                </p>

                <small>
                  Demonstração visual. O código ainda não foi
                  validado pelo backend.
                </small>

              </div>

            </section>

          </>

        )}

        {/* CENÁRIO 2: EVIDÊNCIA INSUFICIENTE */}

        {isInsufficientEvidence && (

          <>

            <div className="feedback-alert warning-alert">

              <span className="feedback-alert-icon">
                !
              </span>

              <div>
                <strong>
                  Evidência insuficiente
                </strong>

                <p>
                  Não encontramos contexto suficiente na base
                  para fundamentar esta resposta. Nenhuma
                  recomendação abaixo deve ser tratada como
                  fato documentado.
                </p>
              </div>

            </div>

            <div className="result-grid feedback-result-grid">

              <div className="result-main">

                <section className="panel result-section">

                  <h2>Explicação</h2>

                  <p className="explanation-text">
                    A base de conhecimento não retornou
                    trechos relevantes para esta pergunta.

                    {" "}

                    Por esse motivo, não é possível indicar
                    recomendações fundamentadas na documentação.
                  </p>

                </section>

                <section className="panel result-section">

                  <h2>Como melhorar o resultado?</h2>

                  <ul className="improvement-list">
                    <li>
                      Descreva o objetivo da análise, como
                      reduzir profundidade ou entender uma porta.
                    </li>

                    <li>
                      Cole o trecho de código relacionado ao problema.
                    </li>

                    <li>
                      Informe o backend de destino, quando aplicável.
                    </li>

                    <li>
                      Utilize termos técnicos relacionados à
                      documentação do Qiskit.
                    </li>
                  </ul>

                </section>

                <section className="panel result-section">

                  <h2>Sua entrada</h2>

                  <p className="result-subtitle">
                    Somente leitura · Edite para fazer nova tentativa.
                  </p>

                  <div className="question-context">

                    <span>Pergunta</span>

                    <strong>
                      {question || "Nenhuma pergunta informada."}
                    </strong>

                  </div>

                  <FeedbackCode code={code} />

                </section>

              </div>

              <aside className="result-sidebar">

                <section className="panel result-section">

                  <h2>Métricas</h2>

                  <div className="unavailable-metric">
                    <strong>Métrica indisponível</strong>

                    <p>
                      Nenhum valor foi calculado para esta
                      solicitação.
                    </p>
                  </div>

                </section>

                <section className="panel result-section">

                  <h2>Fontes consultadas</h2>

                  <p className="no-sources-message">
                    Nenhuma fonte relevante foi encontrada
                    para esta pergunta.
                  </p>

                </section>

              </aside>

            </div>

          </>

        )}

        {/* CENÁRIO 3: FALHA NO SERVIÇO */}

        {isServiceError && (

          <>

            <div className="feedback-alert error-alert">

              <span className="feedback-alert-icon">
                !
              </span>

              <div>
                <strong>
                  Não conseguimos consultar a documentação agora
                </strong>

                <p>
                  O serviço de busca nas fontes está indisponível.
                  Nenhuma análise foi gerada e nenhuma fonte foi
                  consultada. Isso não indica um problema no seu código.
                </p>
              </div>

            </div>

            <div className="service-error-grid">

              <section className="panel service-error-main">

                <h2>O que você pode fazer?</h2>

                <ol className="service-instructions">
                  <li>
                    Tente novamente quando o serviço estiver
                    disponível.
                  </li>

                  <li>
                    Se a falha continuar, informe o identificador
                    da solicitação ao suporte.
                  </li>
                </ol>

                <div className="request-id-box">

                  <span>
                    Identificador da solicitação
                  </span>

                  <strong>{requestId}</strong>

                  <button
                    type="button"
                    className="button-quiet"
                    onClick={handleCopyRequestId}
                  >
                    Copiar identificador
                  </button>

                </div>

                {copyMessage && (
                  <p className="copy-feedback" role="status">
                    {copyMessage}
                  </p>
                )}

                <div className="service-actions">

                  <button
                    type="button"
                    className="button-primary"
                    onClick={onRetry}
                  >
                    Tentar novamente (prévia)
                  </button>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={onBack}
                  >
                    Voltar à entrada
                  </button>

                </div>

              </section>

              <aside className="panel service-other-errors">

                <h2>Outras mensagens por tipo de falha</h2>

                <div className="service-error-item">
                  <strong>Modelo de linguagem indisponível (503)</strong>

                  <p>
                    Não foi possível acessar o serviço de geração.
                  </p>
                </div>

                <div className="service-error-item">
                  <strong>Tempo excedido (504)</strong>

                  <p>
                    A análise demorou mais que o esperado.
                    Tente com um trecho menor de código.
                  </p>
                </div>

                <div className="service-error-item">
                  <strong>Erro interno (500)</strong>

                  <p>
                    Algo deu errado no serviço.
                    Informe o identificador ao suporte.
                  </p>
                </div>

              </aside>

            </div>

            <section className="panel preserved-code-section">

              <div className="panel-heading">

                <div>
                  <h2>Seu código foi preservado</h2>

                  <span>
                    Nada será perdido ao voltar para a entrada.
                  </span>
                </div>

                <span className="readonly-badge">
                  Somente leitura
                </span>

              </div>

              <FeedbackCode code={code} />

            </section>

          </>

        )}

        {/* AÇÕES PARA CÓDIGO INVÁLIDO */}

        {isInvalidCode && (

          <div className="feedback-actions">

            <button
              type="button"
              className="button-primary"
              onClick={onBack}
            >
              Voltar e corrigir código
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={onRetry}
            >
              Voltar à prévia
            </button>

          </div>

        )}

        {/* AÇÕES PARA EVIDÊNCIA INSUFICIENTE */}

        {isInsufficientEvidence && (

          <div className="feedback-actions">

            <button
              type="button"
              className="button-primary"
              onClick={onBack}
            >
              Editar e reenviar
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={onBack}
            >
              Reformular pergunta
            </button>

          </div>

        )}

        <footer className="page-footer">
          Agente RAG · Qiskit — Ferramenta de apoio ao
          desenvolvimento quântico.
        </footer>

      </main>

    </>
  );
}