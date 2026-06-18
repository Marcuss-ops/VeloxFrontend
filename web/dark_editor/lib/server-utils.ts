// Server-side utilities for Dark Editor API
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Base directories
const DATA_DIR = path.join(process.cwd(), 'data');
const TEMP_DIR = path.join(DATA_DIR, 'temp');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

// Ensure directories exist
export function ensureDirectories() {
  [DATA_DIR, TEMP_DIR, PROJECTS_DIR].forEach(dir => {
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

// Get projects directory path
export function getProjectsDir(): string {
  ensureDirectories();
  return PROJECTS_DIR;
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

// Delete file from temp
export function deleteTempFile(filename: string): boolean {
  const filepath = path.join(TEMP_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  }
  return false;
}

// Parse JSON body from request
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  const body = await request.json();
  return body as T;
}

// NVIDIA API configuration
export function getNvidiaApiKey(): string | null {
  return process.env.NVIDIA_API_KEY || null;
}

// Image processing utilities using sharp (will be installed)
export async function processImage(
  inputPath: string,
  operations: {
    filter?: { type: string; value: number };
    crop?: [number, number, number, number];
    resize?: [number, number];
    format?: string;
    quality?: number;
  }
): Promise<string> {
  // Dynamic import for sharp (server-side only)
  const sharp = (await import('sharp')).default;
  
  let image = sharp(inputPath);
  const metadata = await image.metadata();
  
  // Apply crop
  if (operations.crop) {
    const [left, top, right, bottom] = operations.crop;
    const width = right - left;
    const height = bottom - top;
    image = image.extract({ left, top, width, height });
  }
  
  // Apply resize
  if (operations.resize) {
    const [width, height] = operations.resize;
    image = image.resize(width, height);
  }
  
  // Apply filters
  if (operations.filter) {
    switch (operations.filter.type) {
      case 'brightness':
        image = image.modulate({ brightness: operations.filter.value });
        break;
      case 'contrast':
        image = image.linear(operations.filter.value, -(128 * operations.filter.value) + 128);
        break;
      case 'saturation':
        image = image.modulate({ saturation: operations.filter.value });
        break;
      case 'blur':
        image = image.blur(operations.filter.value * 10);
        break;
      case 'sharpen':
        image = image.sharpen(operations.filter.value * 5);
        break;
      case 'grayscale':
        image = image.grayscale();
        break;
      case 'sepia':
        image = image.tint({ r: 112, g: 66, b: 20 });
        break;
      case 'invert':
        image = image.negate();
        break;
    }
  }
  
  // Determine output format
  const format = operations.format || 'png';
  const outputFilename = generateFilename(format);
  const outputPath = path.join(TEMP_DIR, outputFilename);
  
  // Apply format and quality
  if (format === 'jpg' || format === 'jpeg') {
    image = image.jpeg({ quality: operations.quality || 90 });
  } else if (format === 'webp') {
    image = image.webp({ quality: operations.quality || 90 });
  } else {
    image = image.png();
  }
  
  await image.toFile(outputPath);
  return outputFilename;
}