/// <reference types="vite/client" />

declare function showGlobalMessage(text: string): void;
declare function showGlobalConfirm(text: string): Promise<boolean>;
declare function showGlobalPrompt(text: string, defaultValue?: string): Promise<string | null>;
