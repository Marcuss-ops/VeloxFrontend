export interface FileSystemPort {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: 'utf-8'): string;
  writeFileSync(path: string, data: string | Buffer): void;
  unlinkSync(path: string): void;
}
