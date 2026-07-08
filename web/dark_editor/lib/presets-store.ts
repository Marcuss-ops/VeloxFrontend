// Local presets storage using JSON file
// Server-side only (Next.js API routes)

import fs from 'fs';
import path from 'path';

export interface StoredPreset {
  id: string;
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'presets.json');

function ensureDataFile(): StoredPreset[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading presets:', error);
    return [];
  }
}

function savePresets(presets: StoredPreset[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(presets, null, 2));
  } catch (error) {
    console.error('Error saving presets:', error);
  }
}

export function listPresets(): StoredPreset[] {
  return ensureDataFile();
}

export function getPreset(id: string): StoredPreset | null {
  const presets = ensureDataFile();
  return presets.find((p) => p.id === id) || null;
}

export function createPreset(preset: {
  name: string;
  type: 'complete' | 'text';
  description?: string;
  objects?: Record<string, unknown>[];
  textObjects?: Record<string, unknown>[];
  previewUrl?: string;
}): StoredPreset {
  const presets = ensureDataFile();
  const now = new Date().toISOString();
  const newPreset: StoredPreset = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: preset.name,
    type: preset.type,
    description: preset.description,
    objects: preset.objects,
    textObjects: preset.textObjects,
    previewUrl: preset.previewUrl,
    createdAt: now,
    updatedAt: now,
  };
  presets.push(newPreset);
  savePresets(presets);
  return newPreset;
}

export function updatePreset(id: string, updates: Partial<StoredPreset>): StoredPreset | null {
  const presets = ensureDataFile();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) return null;

  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  savePresets(presets);
  return presets[index];
}

export function deletePreset(id: string): boolean {
  const presets = ensureDataFile();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  savePresets(filtered);
  return true;
}
