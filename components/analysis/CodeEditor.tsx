
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function CodeEditor({
  value,
  onChange,
  placeholder,
}: CodeEditorProps) {
  return (
    <div className="code-editor">
      <CodeMirror
        value={value}
        height="370px"
        theme="light"
        extensions={[python()]}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={true}
        indentWithTab={true}
      />
    </div>
  );
}