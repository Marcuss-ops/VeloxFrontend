import { describe, it, expect, beforeEach } from 'vitest';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  assignProjectToFolder,
  type StoredProject,
} from '@/lib/projects-store';
import { createFakeFileSystem } from './fakeFs';

const makeProject = (name: string, type: string): StoredProject => ({
  id: `id-${name}`,
  name,
  type,
  canvas_json: { foo: 1 },
  preview_url: '',
  folder_id: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
});

describe('projects-store', () => {
  let fs: ReturnType<typeof createFakeFileSystem>;

  beforeEach(() => {
    fs = createFakeFileSystem();
  });

  it('lists all projects', () => {
    createProject(makeProject('A', 'custom'), fs);
    createProject(makeProject('B', 'banner'), fs);
    expect(listProjects(undefined, fs)).toHaveLength(2);
  });

  it('filters projects by type', () => {
    createProject(makeProject('A', 'custom'), fs);
    createProject(makeProject('B', 'banner'), fs);
    expect(listProjects('banner', fs)).toHaveLength(1);
  });

  it('retrieves a project by id', () => {
    createProject(makeProject('A', 'custom'), fs);
    const found = getProject('id-A', fs);
    expect(found?.name).toBe('A');
  });

  it('updates a project', () => {
    createProject(makeProject('A', 'custom'), fs);
    const updated = updateProject('id-A', { name: 'Renamed' }, fs);
    expect(updated?.name).toBe('Renamed');
    expect(getProject('id-A', fs)?.name).toBe('Renamed');
  });

  it('deletes a project', () => {
    createProject(makeProject('A', 'custom'), fs);
    expect(deleteProject('id-A', fs)).toBe(true);
    expect(getProject('id-A', fs)).toBeNull();
  });

  it('assigns a project to a folder', () => {
    createProject(makeProject('A', 'custom'), fs);
    const updated = assignProjectToFolder('id-A', 'folder-1', fs);
    expect(updated?.folder_id).toBe('folder-1');
  });

  it('upserts an existing project when id is provided', () => {
    createProject(makeProject('A', 'custom'), fs);
    const result = createProject({ id: 'id-A', name: 'Updated', canvas_json: { bar: 2 } }, fs);
    expect(result.name).toBe('Updated');
    expect(listProjects(undefined, fs)).toHaveLength(1);
  });
});
