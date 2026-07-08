// Local projects storage using JSON file
// Server-side only (Next.js API routes)

import fs from 'fs';
import path from 'path';

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

function ensureDataFile(): StoredProject[] {
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
    console.error('Error reading projects:', error);
    return [];
  }
}

function saveProjects(projects: StoredProject[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error saving projects:', error);
  }
}

export function listProjects(type?: string): StoredProject[] {
  const projects = ensureDataFile();
  if (type) {
    return projects.filter((p) => p.type === type);
  }
  return projects;
}

export function getProject(id: string): StoredProject | null {
  const projects = ensureDataFile();
  return projects.find((p) => p.id === id) || null;
}

export function createProject(project: {
  id?: string;
  name: string;
  type?: string;
  canvas_json: Record<string, unknown>;
  preview_filename?: string;
}): StoredProject {
  const projects = ensureDataFile();
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
      saveProjects(projects);
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
  saveProjects(projects);
  return newProject;
}

export function updateProject(id: string, updates: Partial<StoredProject>): StoredProject | null {
  const projects = ensureDataFile();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveProjects(projects);
  return projects[index];
}

export function deleteProject(id: string): boolean {
  const projects = ensureDataFile();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  saveProjects(filtered);
  return true;
}

export function assignProjectToFolder(projectId: string, folderId: string | null): StoredProject | null {
  return updateProject(projectId, { folder_id: folderId });
}
