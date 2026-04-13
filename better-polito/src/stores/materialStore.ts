import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Material, Folder } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface MaterialStore {
  materials: Material[];
  folders: Folder[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMaterials: (courseId: string) => Promise<void>;
  fetchFolders: (courseId: string) => Promise<void>;
  createFolder: (data: {
    courseId: string;
    name: string;
    parentId: string | null;
  }) => Promise<Folder>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  createMaterial: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'lastAccessedAt'>) => Promise<Material>;
  createMaterialFromAttachment: (courseId: string, file: File) => Promise<Material>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  materials: [],
  folders: [],
  loading: false,
  error: null,

  fetchMaterials: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const materials = await db.materials
        .where('courseId')
        .equals(courseId)
        .toArray();
      set({ materials, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchFolders: async (courseId) => {
    try {
      const folders = await db.folders
        .where('courseId')
        .equals(courseId)
        .toArray();
      set({ folders });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createFolder: async (data) => {
    const folders = await db.folders
      .where('courseId')
      .equals(data.courseId)
      .and(f => f.parentId === data.parentId)
      .toArray();

    const folder: Folder = {
      id: uuidv4(),
      ...data,
      order: folders.length,
      createdAt: new Date().toISOString(),
    };

    await db.folders.add(folder);
    await get().fetchFolders(data.courseId);
    return folder;
  },

  updateFolder: async (id, updates) => {
    await db.folders.update(id, updates);
    const folder = await db.folders.get(id);
    if (folder) {
      await get().fetchFolders(folder.courseId);
    }
  },

  deleteFolder: async (id) => {
    const folder = await db.folders.get(id);
    if (!folder) return;

    // Delete folder and all materials in it
    await db.transaction('rw', [db.folders, db.materials], async () => {
      // Delete child folders recursively
      const childFolders = await db.folders
        .where('parentId')
        .equals(id)
        .toArray();
      
      for (const child of childFolders) {
        await get().deleteFolder(child.id);
      }

      // Delete materials in this folder
      await db.materials.where('folderId').equals(id).delete();
      
      // Delete the folder itself
      await db.folders.delete(id);
    });

    await get().fetchFolders(folder.courseId);
  },

  createMaterial: async (data) => {
    const now = new Date().toISOString();
    const material: Material = {
      ...data,
      id: uuidv4(),
      isCompleted: false,
      lastAccessedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.materials.add(material);
    await get().fetchMaterials(data.courseId);
    return material;
  },

  updateMaterial: async (id, updates) => {
    await db.materials.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    const material = await db.materials.get(id);
    if (material) {
      await get().fetchMaterials(material.courseId);
    }
  },

  deleteMaterial: async (id) => {
    const material = await db.materials.get(id);
    if (!material) return;

    await db.materials.delete(id);
    await get().fetchMaterials(material.courseId);
  },

  createMaterialFromAttachment: async (courseId, file) => {
    // Find or create Uploads folder
    const folders = await db.folders
      .where('courseId')
      .equals(courseId)
      .toArray();

    let uploadsFolder = folders.find(f => f.name === 'Uploads');

    if (!uploadsFolder) {
      // Create Uploads folder if it doesn't exist (for old courses)
      uploadsFolder = await get().createFolder({
        courseId,
        name: 'Uploads',
        parentId: null,
      });
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Determine type based on MIME type
    const type = file.type.startsWith('image/') || file.type === 'application/pdf' 
      ? 'pdf' 
      : 'note';

    // Create material
    const material = await get().createMaterial({
      courseId,
      folderId: uploadsFolder.id,
      type,
      name: `[Chat] ${file.name}`,
      fileName: file.name,
      fileData: arrayBuffer,
      fileSize: file.size,
    });

    return material;
  },

  toggleComplete: async (id) => {
    const material = await db.materials.get(id);
    if (!material) return;

    await db.materials.update(id, {
      isCompleted: !material.isCompleted,
      updatedAt: new Date().toISOString(),
    });

    await get().fetchMaterials(material.courseId);
  },
}));
