
"use client";

import { useState } from "react";

type SettingsPanelProps = {
  backend: string;
  topK: string;
  onBackendChange: (value: string) => void;
  onTopKChange: (value: string) => void;
};

export default function SettingsPanel({
  backend,
  topK,
  onBackendChange,
  onTopKChange,
}: SettingsPanelProps) {
  // Controla se as configurações estão abertas
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="settings-panel">

      {/* CABEÇALHO DAS CONFIGURAÇÕES */}

      <button
        type="button"
        className="settings-toggle"
        aria-expanded={isExpanded}
        aria-controls="advanced-settings"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="section-label">
          CONFIGURAÇÕES
        </span>

        <span
          className={`settings-chevron ${
            isExpanded ? "is-open" : ""
          }`}
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      <p className="settings-description">
        Personalize os parâmetros utilizados na análise.
      </p>

      {/* CONTEÚDO EXPANSÍVEL */}

      <div
        id="advanced-settings"
        className="settings-content"
        hidden={!isExpanded}
      >

        {/* SELEÇÃO DO BACKEND */}

        <div className="field-group">
          <label htmlFor="backend">
            Backend
          </label>

          <select
            id="backend"
            value={backend}
            onChange={(event) =>
              onBackendChange(event.target.value)
            }
          >
            <option value="reference">
              Backend de referência
            </option>
          </select>

          <span className="field-help">
            Ambiente de destino utilizado na análise.
          </span>
        </div>

        {/* QUANTIDADE DE TRECHOS */}

        <div className="field-group">
          <label htmlFor="top-k">
            Trechos recuperados (top_k)
          </label>

          <select
            id="top-k"
            value={topK}
            onChange={(event) =>
              onTopKChange(event.target.value)
            }
          >
            <option value="3">3 trechos</option>
            <option value="5">5 trechos</option>
            <option value="8">8 trechos</option>
            <option value="10">10 trechos</option>
          </select>

          <span className="field-help">
            Quantidade de fragmentos da documentação
            que o sistema tentará recuperar.
          </span>
        </div>

      </div>

    </section>
  );
}