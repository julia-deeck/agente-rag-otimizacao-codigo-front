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
};
