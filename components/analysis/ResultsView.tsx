
"use client";

import { useState, useCallback } from "react";
import SourceDrawer, {
  type SourceDetails,
} from "./SourceDrawer";

// FONTES DEMONSTRATIVAS
// Posteriormente, essas informações virão da API.

const demoSources: SourceDetails[] = [
  {
    id: "source-01",
    title: "Introduction to transpilation",
    origin: "Qiskit Documentation",
    category: "transpilation",
    type: "documentation",

    excerpt:
      "Trecho ilustrativo sobre o processo de transpilação do Qiskit, utilizado para explicar a adaptação de circuitos às características do backend.",

    relationship:
      "Sugestão 1 — Avaliar a utilização de optimization_level=3.",

    url: null,
  },
  {
    id: "source-02",
    title: "Referência complementar",
    origin: "Documentação técnica",
    category: "circuitos",
    type: "documentation",

    excerpt:
      "Nenhum trecho real foi recuperado nesta demonstração. Este conteúdo representa apenas a estrutura de apresentação da fonte.",

    relationship:
      "Nenhuma sugestão associada nesta demonstração.",

    url: null,
  },
];

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

  const originalCode =
    code.trim() ||
    "# Nenhum código Qiskit foi enviado.\n# Solicitação feita somente por pergunta.";

  const suggestedCode = `from qiskit import transpile

# Exemplo ilustrativo de transpilação
qc_optimized = transpile(
    qc,
    optimization_level=3
)

print(qc_optimized.depth())`;

  // CONTROLE DO PAINEL DE FONTES

  const [selectedSource, setSelectedSource] =
    useState<SourceDetails | null>(null);

  const closeSourceDrawer = useCallback(() => {
    setSelectedSource(null);
  }, []);

  // MENSAGEM DE CÓPIA

  const [copyMessage, setCopyMessage] = useState("");

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(suggestedCode);

      setCopyMessage("Fragmento copiado com sucesso!");

    } catch {
      setCopyMessage(
        "Não foi possível copiar automaticamente. Utilize Ctrl+C."
      );
    }
  }

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
            ANÁLISE DE CÓDIGO
          </span>

          <div className="result-title-row">

            <h1>Resultado da análise</h1>

            <span className="preview-badge">
              Demonstração
            </span>

          </div>

          <div className="result-header-actions">

            <button
              type="button"
              className="button-secondary"
              onClick={onBack}
            >
              Editar entrada
            </button>

          </div>

        </section>

        {/* AVISO */}

        <div className="result-warning">

          <div className="result-warning-icon">
            !
          </div>

          <div>

            <strong>
              Resultado demonstrativo — dados simulados
            </strong>

            <p>
              Nenhuma análise real foi executada. As métricas
              e sugestões abaixo são exemplos ilustrativos.
              Nenhuma recomendação foi validada pelo Qiskit.
              Verifique tecnicamente antes de aplicar qualquer
              alteração.
            </p>

          </div>

        </div>

        {/* ORGANIZAÇÃO DOS RESULTADOS */}

        <div className="result-grid">

          <div className="result-main">

            {/* EXPLICAÇÃO */}

            <section className="panel result-section">

              <div className="result-section-heading">

                <h2>Explicação</h2>

                <span className="result-subtitle">
                  Interpretação demonstrativa
                </span>

              </div>

              <p className="explanation-text">
                O circuito pode apresentar uma sequência de
                portas quânticas que influencia sua profundidade.

                {" "}

                A transpilação do Qiskit permite transformar
                um circuito para adaptá-lo às características
                do backend de destino.

                {" "}

                Entretanto, qualquer melhoria na profundidade
                precisa ser verificada por meio de uma execução
                real da transpilação e da análise das métricas.
              </p>

              {question && (
                <div className="question-context">

                  <span>Pergunta enviada</span>

                  <strong>{question}</strong>

                </div>
              )}

            </section>

            {/* SUGESTÕES */}

            <section className="panel result-section">

              <div className="result-section-heading">

                <div>
                  <h2>Sugestões de otimização</h2>

                  <span className="result-subtitle">
                    Recomendações ilustrativas
                  </span>
                </div>

                <span className="suggestion-count">
                  2 sugestões
                </span>

              </div>

              <article className="suggestion-card">

                <div className="suggestion-heading">

                  <span className="suggestion-number">
                    01
                  </span>

                  <h3>
                    Avaliar a transpilação com optimization_level=3
                  </h3>

                </div>

                <span className="suggestion-status">
                  Sugestão não validada
                </span>

                <p>
                  Avaliar a transpilação utilizando o nível
                  de otimização 3 do Qiskit. O resultado
                  depende do circuito, da versão utilizada
                  e das características do backend.
                </p>

                <button
                  type="button"
                  className="source-inline-button"
                  onClick={() => setSelectedSource(demoSources[0])}
                >
                  Ver fonte: Introduction to transpilation →
                </button>

              </article>

              <article className="suggestion-card">

                <div className="suggestion-heading">

                  <span className="suggestion-number">
                    02
                  </span>

                  <h3>
                    Verificar a organização das portas
                  </h3>

                </div>

                <span className="suggestion-status">
                  Sugestão não validada
                </span>

                <p>
                  Investigar possíveis oportunidades de
                  reorganização de operações independentes,
                  respeitando as dependências entre as portas
                  do circuito.
                </p>

                <div className="suggestion-source">
                  Sem suporte documental nesta demonstração.
                </div>

              </article>

            </section>

          </div>

          {/* COLUNA LATERAL */}

          <aside className="result-sidebar">

            {/* MÉTRICAS */}

            <section className="panel result-section">

              <div className="result-section-heading">
                <h2>Métricas</h2>
              </div>

              <div className="metrics-grid">

                <div className="metric-card">
                  <span>Profundidade antes</span>
                  <strong>8</strong>
                </div>

                <div className="metric-card">
                  <span>Profundidade depois</span>
                  <strong>5</strong>
                </div>

              </div>

              <div className="metric-warning">
                Valores ilustrativos. Nenhuma execução do
                Qiskit foi realizada.
              </div>

              <div className="metric-legend">

                <span className="legend-item">
                  <span className="legend-dot validated"></span>
                  Validado com Qiskit
                </span>

                <span className="legend-item">
                  <span className="legend-dot suggested"></span>
                  Sugestão não validada
                </span>

                <span className="legend-item">
                  <span className="legend-dot unavailable"></span>
                  Métrica indisponível
                </span>

              </div>

            </section>

            {/* FONTES CONSULTADAS */}

            <section className="panel result-section">

              <div className="result-section-heading">
                <h2>Fontes consultadas</h2>
              </div>

              {demoSources.map((source, index) => (

                <button
                  type="button"
                  key={source.id}
                  className="source-item source-item-button"
                  onClick={() => setSelectedSource(source)}
                  aria-haspopup="dialog"
                  aria-controls="source-detail-drawer"
                >

                  <span className="source-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="source-item-content">

                    <strong>{source.title}</strong>

                    <span>{source.origin}</span>

                    <small>
                      Referência demonstrativa · Ver detalhes
                    </small>

                  </span>

                  <span className="source-arrow">
                    →
                  </span>

                </button>

              ))}

              <p className="source-disclaimer">
                As referências apresentadas são exemplos.
                Nenhuma consulta à base RAG foi realizada.
              </p>

            </section>

          </aside>

        </div>

        {/* COMPARAÇÃO DE CÓDIGOS */}

        <section className="panel code-comparison-section">

          <div className="comparison-heading">

            <div>
              <h2>Código original × sugerido</h2>

              <p>
                Comparação demonstrativa de código.
              </p>
            </div>

            <button
              type="button"
              className="button-secondary"
              onClick={handleCopyCode}
            >
              Copiar fragmento sugerido
            </button>

          </div>

          <div className="comparison-notice">
            O fragmento sugerido é apenas um exemplo e não
            representa uma transformação validada do código
            enviado.
          </div>

          <div className="comparison-grid">

            <div className="comparison-panel">

              <div className="comparison-panel-heading">
                ORIGINAL
              </div>

              <pre className="comparison-code">
                <code>{originalCode}</code>
              </pre>

            </div>

            <div className="comparison-panel">

              <div className="comparison-panel-heading suggested-heading">
                FRAGMENTO SUGERIDO
              </div>

              <pre className="comparison-code">
                <code>{suggestedCode}</code>
              </pre>

            </div>

          </div>

          {copyMessage && (
            <p className="copy-feedback" role="status">
              {copyMessage}
            </p>
          )}

        </section>

        <footer className="page-footer">
          Agente RAG · Qiskit — Ferramenta de apoio ao
          desenvolvimento quântico.
        </footer>

      </main>

      {/* PAINEL DE DETALHES DA FONTE */}

      <SourceDrawer
        source={selectedSource}
        onClose={closeSourceDrawer}
      />

    </>
  );
}