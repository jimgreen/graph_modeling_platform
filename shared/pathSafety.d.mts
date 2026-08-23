export function isPathInside(parentDir: string, childPath: string): boolean;
export function safeJoin(base: string, ...segments: unknown[]): string | null;
export function sanitizeSegment(value: unknown, fallback?: string, maxLength?: number): string;
