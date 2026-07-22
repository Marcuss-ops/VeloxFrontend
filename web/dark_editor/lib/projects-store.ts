// Local projects storage using JSON file
// Server-side only (Next.js API routes)

import path from 'path';
import { defaultFileSystem, type FileSystemPort } from './fs';

export interface StoredProject {
  id: string;
  name: string;
  type: string;
  canvas_json: Record<string, unknown>;
  preview_url: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');

function ensureDataFile(fileSystem: FileSystemPort = defaultFileSystem): StoredProject[] {
  try {
    if (!fileSystem.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fileSystem.existsSync(dir)) {
        fileSystem.mkdirSync(dir, { recursive: true });
      }
      fileSystem.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fileSystem.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
}

function saveProjects(projects: StoredProject[], fileSystem: FileSystemPort = defaultFileSystem): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fileSystem.existsSync(dir)) {
      fileSystem.mkdirSync(dir, { recursive: true });
    }
    fileSystem.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error saving projects:', error);
  }
}

export function listProjects(type?: string, fileSystem: FileSystemPort = defaultFileSystem): StoredProject[] {
  const projects = ensureDataFile(fileSystem);
  if (type) {
    return projects.filter((p) => p.type === type);
  }
  return projects;
}

export function getProject(id: string, fileSystem: FileSystemPort = defaultFileSystem): StoredProject | null {
  const projects = ensureDataFile(fileSystem);
  return projects.find((p) => p.id === id) || null;
}

export function createProject(
  project: {
    id?: string;
    name: string;
    type?: string;
    canvas_json: Record<string, unknown>;
    preview_filename?: string;
  },
  fileSystem: FileSystemPort = defaultFileSystem
): StoredProject {
  const projects = ensureDataFile(fileSystem);
  const now = new Date().toISOString();

  // Upsert: if id is provided and exists, update instead of creating duplicate
  if (project.id) {
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    if (existingIndex !== -1) {
      projects[existingIndex] = {
        ...projects[existingIndex],
        name: project.name,
        type: project.type || projects[existingIndex].type,
        canvas_json: project.canvas_json,
        preview_url: project.preview_filename || projects[existingIndex].preview_url,
        updated_at: now,
      };
      saveProjects(projects, fileSystem);
      return projects[existingIndex];
    }
  }

  const newProject: StoredProject = {
    id: project.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: project.name,
    type: project.type || 'custom',
    canvas_json: project.canvas_json,
    preview_url: project.preview_filename || '',
    folder_id: null,
    created_at: now,
    updated_at: now,
  };
  projects.push(newProject);
  saveProjects(projects, fileSystem);
  return newProject;
}

export function updateProject(
  id: string,
  updates: Partial<StoredProject>,
  fileSystem: FileSystemPort = defaultFileSystem
): StoredProject | null {
  const projects = ensureDataFile(fileSystem);
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveProjects(projects, fileSystem);
  return projects[index];
}

export function deleteProject(id: string, fileSystem: FileSystemPort = defaultFileSystem): boolean {
  const projects = ensureDataFile(fileSystem);
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  saveProjects(filtered, fileSystem);
  return true;
}

export function assignProjectToFolder(
  projectId: string,
  folderId: string | null,
  fileSystem: FileSystemPort = defaultFileSystem
): StoredProject | null {
  return updateProject(projectId, { folder_id: folderId }, fileSystem);
}
