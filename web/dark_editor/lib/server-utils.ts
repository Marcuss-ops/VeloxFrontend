// Server-side utilities for InstaEditor API
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Base directories — use env var so upload and fetch always use the same absolute path
const DATA_DIR = process.env.DARK_EDITOR_DATA_DIR || path.join(process.cwd(), 'data');
const TEMP_DIR = path.join(DATA_DIR, 'temp');

// Ensure directories exist
export function ensureDirectories() {
  [DATA_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Generate unique filename
export function generateFilename(extension: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}_${random}.${extension}`;
}

// Get temp directory path
export function getTempDir(): string {
  ensureDirectories();
  return TEMP_DIR;
}

// Save file to temp
export async function saveToTemp(file: File): Promise<string> {
  ensureDirectories();
  const ext = file.name.split('.').pop() || 'bin';
  const filename = generateFilename(ext);
  const filepath = path.join(TEMP_DIR, filename);
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  fs.writeFileSync(filepath, buffer);
  
  return filename;
}

// Get file from temp
export function getTempFile(filename: string): Buffer | null {
  const filepath = path.join(TEMP_DIR, filename);
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath);
  }
  return null;
}

// Get a relative temp asset path; the browser resolves it through the editor runtime.
export function getTempFileUrl(filename: string): string {
  return `temp/${filename}`;
}

// NVIDIA API configuration
export function getNvidiaApiKey(): string | null {
  return process.env.NVIDIA_API_KEY || null;
}