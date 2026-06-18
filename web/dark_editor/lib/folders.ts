// Local folder storage using JSON file
// This provides folder management without requiring Go backend changes

import fs from 'fs';
import path from 'path';

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'folders.json');

function ensureDataFile(): Folder[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // Create empty folders file - folders will be created by the user
      const initialFolders: Folder[] = [];
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialFolders, null, 2));
      return initialFolders;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading folders:', error);
    return [];
  }
}

function saveFolders(folders: Folder[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(folders, null, 2));
  } catch (error) {
    console.error('Error saving folders:', error);
  }
}

export function listFolders(): Folder[] {
  return ensureDataFile();
}

export function createFolder(name: string, parentId: string | null = null): Folder {
  const folders = ensureDataFile();
  const newFolder: Folder = {
    id: Date.now().toString(),
    name,
    parent_id: parentId,
    created_at: new Date().toISOString(),
  };
  folders.push(newFolder);
  saveFolders(folders);
  return newFolder;
}

export function updateFolder(id: string, updates: { name?: string; parent_id?: string | null }): Folder | null {
  const folders = ensureDataFile();
  const index = folders.findIndex(f => f.id === id);
  if (index === -1) return null;
  
  if (updates.name !== undefined) folders[index].name = updates.name;
  if (updates.parent_id !== undefined) folders[index].parent_id = updates.parent_id;
  
  saveFolders(folders);
  return folders[index];
}

export function deleteFolder(id: string): boolean {
  const folders = ensureDataFile();
  const filtered = folders.filter(f => f.id !== id);
  if (filtered.length === folders.length) return false;
  
  saveFolders(filtered);
  return true;
}

export function getFolder(id: string): Folder | null {
  const folders = ensureDataFile();
  return folders.find(f => f.id === id) || null;
}
