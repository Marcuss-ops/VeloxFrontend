import fs from 'fs';
import type { FileSystemPort } from './FileSystemPort';

export class NodeFsAdapter implements FileSystemPort {
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(path, options);
  }

  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: 'utf-8'): string;
  readFileSync(path: string, encoding?: 'utf-8'): Buffer | string {
    if (encoding) {
      return fs.readFileSync(path, encoding);
    }
    return fs.readFileSync(path);
  }

  writeFileSync(path: string, data: string | Buffer): void {
    fs.writeFileSync(path, data);
  }

  unlinkSync(path: string): void {
    fs.unlinkSync(path);
  }
}

export const defaultFileSystem = new NodeFsAdapter();
