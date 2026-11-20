
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language: "qasm" | "python";
};

const qasmKeywords = new Set([
  "OPENQASM", "include", "qreg", "creg", "gate",
  "opaque", "if", "measure", "reset", "barrier", "U", "CX",
]);

const qasmGates = new Set([
  "id", "x", "y", "z", "h", "s", "sdg", "t", "tdg",
  "rx", "ry", "rz", "u1", "u2", "u3", "cx", "cy",
  "cz", "ch", "crz", "cu1", "cu3", "swap", "ccx", "cswap",
]);

const qasmBuiltins = new Set([
  "pi", "sin", "cos", "tan", "exp", "ln", "sqrt",
]);

const qasmLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return "string";

    if (stream.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)) {
      return "number";
    }

    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = stream.current();

      if (qasmKeywords.has(word)) return "keyword";
      if (qasmGates.has(word)) return "atom";
      if (qasmBuiltins.has(word)) return "builtin";

      return "variableName";
    }

    if (stream.match(/->|==|<=|>=|[=+\-*/^<>]/)) {
      return "operator";
    }

    if (stream.match(/[()[\]{},;.]/)) return "punctuation";

    stream.next();
    return null;
  },
});

const quantumTheme = EditorView.theme(
  {
    "&": {
      height: "370px",
      backgroundColor: "#100d18",
      color: "#e6def2",
      fontSize: "13px",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-geist-mono), Consolas, monospace",
      lineHeight: "1.75",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "#b58aff",
      padding: "12px 0",
    },
    ".cm-line": {
      padding: "0 12px",
    },
    ".cm-gutters": {
      backgroundColor: "#15111f",
      color: "#777087",
      borderRight: "1px solid rgba(190, 164, 230, 0.16)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(181, 138, 255, 0.055)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(120, 59, 219, 0.12)",
      color: "#b58aff",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-cursor": {
      borderLeftColor: "#b58aff",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(120, 59, 219, 0.35) !important",
    },
  },
  { dark: true }
);

export default function CodeEditor({
  value,
  onChange,
  language,
}: CodeEditorProps) {
  const languageExtension =
    language === "python" ? python() : qasmLanguage;

  return (
    <div className="code-editor">
      <CodeMirror
        value={value}
        height="370px"
        theme={quantumTheme}
        extensions={[
          languageExtension,
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        ]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}