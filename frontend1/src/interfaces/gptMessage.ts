// File path: code_tutor/frontend/src/interfaces/gptMessage.ts

export interface GptMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }
