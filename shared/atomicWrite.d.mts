export function atomicWriteFile(filePath: string, data: string | Uint8Array, options?: { encoding?: BufferEncoding; mode?: number; flag?: string }): Promise<void>;
export function atomicWriteFileSync(filePath: string, data: string | Uint8Array, options?: { encoding?: BufferEncoding; mode?: number; flag?: string }): void;
