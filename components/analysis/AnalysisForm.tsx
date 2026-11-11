
"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import SettingsPanel from "./SettingsPanel";
import LoadingView from "./LoadingView";
import ResultsView from "./ResultsView";
import AnalysisFeedback, {
  type AnalysisFeedbackType,
} from "./AnalysisFeedback";

const CodeEditor = dynamic(
  () => import("./CodeEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="editor-loading">
        Carregando editor...
      </div>
    ),
  }
);

export default function AnalysisForm() {

  // DADOS DA ENTRADA

  const [code, setCode] = useState("");
  const [question, setQuestion] = useState("");

  // CONFIGURAÇÕES

  const [backend, setBackend] = useState("reference");
  const [topK, setTopK] = useState("5");

  // CONTROLE DAS TELAS

  const [showProcessingPreview, setShowProcessingPreview] =
    useState(false);

  const [showResultPreview, setShowResultPreview] =
    useState(false);
  
  // CONTROLE DOS ESTADOS DE ERRO

  const [feedbackType, setFeedbackType] =
    useState<AnalysisFeedbackType | null>(null);

  // CONTROLE DA VALIDAÇÃO DO FORMULÁRIO

  const [showInputErrors, setShowInputErrors] =
    useState(false);

  // MENSAGENS

  const [feedback, setFeedback] = useState<{
    type: "error";
    message: string;
  } | null>(null);

  const [editorMessage, setEditorMessage] = useState("");

  // EXEMPLOS

  const examples = [
    "Reduzir profundidade",
    "Explicar o circuito",
    "Adaptar ao backend",
  ];

  function selectExample(example: string) {
    setQuestion(example);
    setFeedback(null);
  }

  // COPIAR CÓDIGO

  async function handleCopy() {
    if (!code.trim()) {
      setEditorMessage("Não existe código para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setEditorMessage("Código copiado!");
    } catch {
      setEditorMessage(
        "Não foi possível copiar automaticamente. Utilize Ctrl+C."
      );
    }
  }

  // COLAR CÓDIGO

  async function handlePaste() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) {
        setEditorMessage("A área de transferência está vazia.");
        return;
      }

      setCode(clipboardText);
      setEditorMessage("Código inserido!");
      setFeedback(null);

    } catch {
      setEditorMessage(
        "Não foi possível acessar a área de transferência. Utilize Ctrl+V."
      );
    }
  }

  // LIMPAR

  function handleClear() {
    setCode("");
    setQuestion("");

    setBackend("reference");
    setTopK("5");

    setFeedback(null);
    setEditorMessage("");

    setShowProcessingPreview(false);
    setShowResultPreview(false);
    setFeedbackType(null);
    setShowInputErrors(false);
  }

  // INICIAR A PRÉVIA DE PROCESSAMENTO

  
function handleAnalyze(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  // Verifica se existe pergunta ou código
  if (!code.trim() && !question.trim()) {
    setShowInputErrors(true);

    setFeedback({
      type: "error",
      message:
        "Falta informação para analisar. Preencha o código, a pergunta ou os dois.",
    });

    return;
  }

  // Remove mensagens de validação
  setShowInputErrors(false);
  setFeedback(null);
  setFeedbackType(null);

  // Prepara a visualização do processamento
  setShowResultPreview(false);
  setShowProcessingPreview(true);
}


  // PRIMEIRO: MOSTRA RESULTADO


// EXIBE OS CENÁRIOS DE ERRO

  if (feedbackType) {
    return (
      <AnalysisFeedback
        type={feedbackType}
        code={code}
        question={question}
        requestId="req-demo-125"
        errorLine={5}
        onBack={() => {
          setFeedbackType(null);
          setShowProcessingPreview(false);
          setShowResultPreview(false);
        }}
        onRetry={() => {
          setFeedbackType(null);
          setShowProcessingPreview(true);
          setShowResultPreview(false);
        }}
      />
    );
  }

  if (showResultPreview) {
    return (
      <ResultsView
        code={code}
        question={question}
        onBack={() => {
          setShowResultPreview(false);
          setShowProcessingPreview(false);
        }}
      />
    );
  }

  // SEGUNDO: MOSTRA PROCESSAMENTO

  if (showProcessingPreview) {
    return (
      <LoadingView
        code={code}
        question={question}
        backend={backend}
        topK={topK}
        
        onBack={() => setShowProcessingPreview(false)}
        
        onShowDemoResult={() => {
          setFeedbackType(null);
          setShowProcessingPreview(false);
          setShowResultPreview(true);
        }}

        onShowError={(type) => {
          setFeedbackType(type);
          setShowProcessingPreview(false);
          setShowResultPreview(false);
        }}
      />
    );
  }

  // TERCEIRO: MOSTRA ENTRADA

  return (
    <>
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

      <main className="workspace">

        <section className="page-intro">

          <div>
            <span className="eyebrow">
              ÁREA DE TRABALHO
            </span>

            <h1>Nova análise</h1>

            <p>
              Cole seu código Qiskit, diga o que deseja entender
              ou melhorar e receba uma análise com fontes.
            </p>
          </div>

        </section>

        <form
          className="analysis-grid"
          onSubmit={handleAnalyze}
          noValidate
        >

          {/* EDITOR */}

          <section className="panel">

            <div className="panel-heading">

              <div>
                <h2>Código Qiskit</h2>

                <span>
                  Insira o código que deseja analisar.
                </span>
              </div>

              <div className="toolbar-actions">

                <button
                  type="button"
                  className="button-quiet"
                  onClick={handlePaste}
                >
                  Colar
                </button>

                <button
                  type="button"
                  className="button-quiet"
                  onClick={handleCopy}
                >
                  Copiar
                </button>

              </div>

            </div>

            <div 
                className={`editor-shell ${
                  showInputErrors ? "input-invalid" : ""
                }`}
                >

              <div className="editor-toolbar">
                <span className="language-label">
                  PYTHON
                </span>

                <span>Qiskit</span>
              </div>

              <CodeEditor
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setEditorMessage("");

              if (value.trim()) {
                  setShowInputErrors(false);
                  setFeedback(null);
               }
              }}
              />

            </div>

            <div className="editor-footer">
              <span>Editor de código Python</span>
              <span>{code.length} caracteres</span>
            </div>

            {editorMessage && (
              <p className="editor-message" role="status">
                {editorMessage}
              </p>
            )}

          </section>

          {/* PERGUNTA E CONFIGURAÇÕES */}

          <section className="panel side-panel">

            <div className="field-group">

              <label htmlFor="analysis-question">
                Pergunta / objetivo
              </label>

              <textarea
                id="analysis-question"
                className={`question-input ${
                  showInputErrors ? "input-invalid-field" : ""
                }`}
                aria-invalid={showInputErrors}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setFeedback(null);
                  
                if (event.target.value.trim()) {
                  setShowInputErrors(false);
                  setFeedback(null);
                }
                }}
                placeholder="O que você gostaria de entender ou melhorar?"
              />

            </div>

            <div className="examples-section">

              <span className="section-label">
                EXEMPLOS DE OBJETIVO
              </span>

              <div className="example-list">

                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="example-chip"
                    onClick={() => selectExample(example)}
                  >
                    {example}
                  </button>
                ))}

              </div>

            </div>

            <SettingsPanel
              backend={backend}
              topK={topK}
              onBackendChange={setBackend}
              onTopKChange={setTopK}
            />

            <div className="form-actions">

              <button
                type="submit"
                className="button-primary"
              >
                Analisar
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={handleClear}
              >
                Limpar tudo
              </button>

            </div>

            <p className="form-hint">
              Preencha ao menos a pergunta ou o código.
            </p>

          </section>

        </form>

        {feedback && (
          <div
            className="form-feedback error"
            role="alert"
          >
            {feedback.message}
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