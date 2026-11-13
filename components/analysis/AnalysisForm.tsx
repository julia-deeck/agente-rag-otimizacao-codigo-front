
"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import SettingsPanel from "./SettingsPanel";

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
  const [code, setCode] = useState("");
  const [question, setQuestion] = useState("");

  const [backend, setBackend] = useState("reference");
  const [topK, setTopK] = useState("5");

  const [showInputErrors, setShowInputErrors] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "error";
    message: string;
  } | null>(null);

  const [editorMessage, setEditorMessage] = useState("");

  const examples = [
    "Reduzir profundidade",
    "Explicar o circuito",
    "Adaptar ao backend",
  ];

  function selectExample(example: string) {
    setQuestion(example);
    setFeedback(null);
  }

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
      setShowInputErrors(false);
    } catch {
      setEditorMessage(
        "Não foi possível acessar a área de transferência. Utilize Ctrl+V."
      );
    }
  }

  function handleClear() {
    setCode("");
    setQuestion("");
    setBackend("reference");
    setTopK("5");
    setFeedback(null);
    setEditorMessage("");
    setShowInputErrors(false);
  }

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim() && !question.trim()) {
      setShowInputErrors(true);

      setFeedback({
        type: "error",
        message:
          "Preencha o código, a pergunta ou os dois para continuar.",
      });

      return;
    }

    setShowInputErrors(false);
    setFeedback(null);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Image
              src="/images/logo.png"
              alt="Identidade visual do projeto Agente RAG"
              width={240}
              height={90}
              priority
              style={{
                display: "block",
                width: "220px",
                height: "auto",
                maxHeight: "76px",
                objectFit: "contain",
              }}
            />
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
              Cole seu código OpenQASM 2, diga o que deseja entender
              ou melhorar e receba uma análise com fontes.
            </p>
          </div>
        </section>

        <form
          className="analysis-grid"
          onSubmit={handleAnalyze}
          noValidate
        >
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Código OpenQASM 2</h2>

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
                  OPENQASM 2
                </span>

                <span>OpenQASM</span>
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
              <span>Editor de código OpenQASM 2</span>
              <span>{code.length} caracteres</span>
            </div>

            {editorMessage && (
              <p className="editor-message" role="status">
                {editorMessage}
              </p>
            )}
          </section>

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