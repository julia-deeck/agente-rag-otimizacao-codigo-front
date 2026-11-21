export type EditorLanguage = "qasm" | "python";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  language: "OpenQASM 2" | "Python / Qiskit";
  createdAt: string;
  isPinned?: boolean;
};

export type AttachmentRecord = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type EditorFileRecord = {
  id: string;
  name: string;
  language: EditorLanguage;
  content: string;
  isDirty?: boolean;
};

export type AnalysisResultRecord = {
  summary: string;
  suggestions: Array<{
    title: string;
    description: string;
    rationale: string;
    code?: string;
  }>;
  sources: Array<{
    title: string;
    origin?: string;
    excerpt?: string;
    url?: string;
  }>;
  metrics?: {
    depthBefore?: number;
    depthAfter?: number;
    gatesBefore?: number;
    gatesAfter?: number;
  };
  warnings?: string[];
  requestId?: string;
};

export type ConversationRecord = {
  id: string;
  title: string;
  prompt: string;
  qasmCode: string;
  pythonCode: string;
  activeLanguage: EditorLanguage;
  backend: string;
  topK: string;
  createdAt?: string;
  isPinned?: boolean;
  projectId?: string;
  attachments?: AttachmentRecord[];
  codeFiles?: EditorFileRecord[];
  analysisResult?: AnalysisResultRecord;
};
