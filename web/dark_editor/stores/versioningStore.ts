import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CanvasObject } from './editorStore';

export interface Version {
  id: string;
  name: string;
  timestamp: number;
  objects: CanvasObject[];
  projectId: string;
}

export interface VersioningState {
  // Versions for current project
  versions: Version[];
  currentVersionId: string | null;
  autoSaveInterval: number;
  isAutoSaving: boolean;
  
  // Actions
  addVersion: (name: string, objects: CanvasObject[], projectId: string) => void;
  loadVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  getVersionsForProject: (projectId: string) => Version[];
  enableAutoSave: (interval: number) => void;
  disableAutoSave: () => void;
  saveCurrentState: (objects: CanvasObject[], projectId: string) => void;
  compareVersions: (versionId1: string, versionId2: string) => { diff: any; changes: string[] };
}

export const useVersioningStore = create<VersioningState>()(
  persist(
    (set, get) => ({
      versions: [],
      currentVersionId: null,
      autoSaveInterval: 30000, // 30 seconds
      isAutoSaving: false,
      
      addVersion: (name, objects, projectId) => {
        const version: Version = {
          id: Date.now().toString(),
          name,
          timestamp: Date.now(),
          objects: JSON.parse(JSON.stringify(objects)),
          projectId,
        };
        
        set((state) => ({
          versions: [...state.versions, version],
          currentVersionId: version.id,
        }));
      },
      
      loadVersion: (versionId) => {
        const { versions } = get();
        const version = versions.find(v => v.id === versionId);
        if (version) {
          set({ currentVersionId: versionId });
          // This would trigger loading in the editor store
          // For now, we just update the state
        }
      },
      
      deleteVersion: (versionId) => {
        set((state) => ({
          versions: state.versions.filter(v => v.id !== versionId),
          currentVersionId: state.currentVersionId === versionId ? null : state.currentVersionId,
        }));
      },
      
      getVersionsForProject: (projectId) => {
        const { versions } = get();
        return versions
          .filter(v => v.projectId === projectId)
          .sort((a, b) => b.timestamp - a.timestamp);
      },
      
      enableAutoSave: (interval) => {
        set({ autoSaveInterval: interval, isAutoSaving: true });
      },
      
      disableAutoSave: () => {
        set({ isAutoSaving: false });
      },
      
      saveCurrentState: (objects, projectId) => {
        const { currentVersionId, versions } = get();
        
        // Check if we should create a new version (if enough time has passed)
        const lastVersion = versions.find(v => v.id === currentVersionId);
        const timeSinceLastSave = lastVersion ? Date.now() - lastVersion.timestamp : Infinity;
        
        if (!currentVersionId || timeSinceLastSave > 5000) { // 5 seconds
          get().addVersion(`Auto-save ${new Date().toLocaleTimeString()}`, objects, projectId);
        } else {
          // Update existing version
          set((state) => ({
            versions: state.versions.map(v => 
              v.id === currentVersionId 
                ? { ...v, objects: JSON.parse(JSON.stringify(objects)), timestamp: Date.now() }
                : v
            ),
          }));
        }
      },
      
      compareVersions: (versionId1, versionId2) => {
        const { versions } = get();
        const v1 = versions.find(v => v.id === versionId1);
        const v2 = versions.find(v => v.id === versionId2);
        
        if (!v1 || !v2) {
          return { diff: null, changes: [] };
        }
        
        const changes: string[] = [];
        const diff = {
          added: [] as CanvasObject[],
          removed: [] as CanvasObject[],
          modified: [] as { id: string; changes: string[] }[],
        };
        
        // Find added objects
        const v2Ids = new Set(v2.objects.map(o => o.id));
        diff.added = v1.objects.filter(o => !v2Ids.has(o.id));
        
        // Find removed objects
        const v1Ids = new Set(v1.objects.map(o => o.id));
        diff.removed = v2.objects.filter(o => !v1Ids.has(o.id));
        
        // Find modified objects
        v1.objects.forEach(obj1 => {
          const obj2 = v2.objects.find(o => o.id === obj1.id);
          if (obj2) {
            const changes: string[] = [];
            
            // Compare properties
            if (obj1.x !== obj2.x) changes.push(`x: ${obj1.x} → ${obj2.x}`);
            if (obj1.y !== obj2.y) changes.push(`y: ${obj1.y} → ${obj2.y}`);
            if (obj1.width !== obj2.width) changes.push(`width: ${obj1.width} → ${obj2.width}`);
            if (obj1.height !== obj2.height) changes.push(`height: ${obj1.height} → ${obj2.height}`);
            if (obj1.rotation !== obj2.rotation) changes.push(`rotation: ${obj1.rotation} → ${obj2.rotation}`);
            if (obj1.opacity !== obj2.opacity) changes.push(`opacity: ${obj1.opacity} → ${obj2.opacity}`);
            if (obj1.text !== obj2.text) changes.push(`text: "${obj1.text}" → "${obj2.text}"`);
            if (obj1.fill !== obj2.fill) changes.push(`fill: ${obj1.fill} → ${obj2.fill}`);
            
            if (changes.length > 0) {
              diff.modified.push({ id: obj1.id, changes });
            }
          }
        });
        
        // Generate human-readable changes
        if (diff.added.length > 0) changes.push(`+ ${diff.added.length} object(s) added`);
        if (diff.removed.length > 0) changes.push(`- ${diff.removed.length} object(s) removed`);
        if (diff.modified.length > 0) changes.push(`~ ${diff.modified.length} object(s) modified`);
        
        return { diff, changes };
      },
    }),
    {
      name: 'dark-editor-versioning',
      partialize: (state) => ({
        versions: state.versions,
        currentVersionId: state.currentVersionId,
        autoSaveInterval: state.autoSaveInterval,
      }),
    }
  )
);