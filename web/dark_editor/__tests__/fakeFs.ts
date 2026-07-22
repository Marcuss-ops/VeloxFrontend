import type { FileSystemPort } from '@/lib/fs';

export function createFakeFileSystem(): FileSystemPort & { records: Record<string, string> } {
  const records: Record<string, string> = {};

  const readFileSync = ((path: string, encoding?: 'utf-8'): Buffer | string => {
    if (!(path in records)) {
      throw new Error(`ENOENT: ${path}`);
    }
    if (encoding === 'utf-8') return records[path];
    return Buffer.from(records[path]);
  }) as FileSystemPort['readFileSync'];

  return {
    records,
    existsSync(path: string) {
      return path in records;
    },
    mkdirSync() {
      // no-op in memory
    },
    readFileSync,
    writeFileSync(path: string, data: string | Buffer) {
      records[path] = typeof data === 'string' ? data : data.toString('utf-8');
    },
    unlinkSync(path: string) {
      delete records[path];
    },
  };
}
