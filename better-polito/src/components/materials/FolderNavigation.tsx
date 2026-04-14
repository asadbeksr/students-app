'use client';
import { useState } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Folder,
  File,
  FileText,
  CheckCircle2,
  Circle,
  MoreVertical,
  FolderPlus,
  FilePlus,
  Upload,
  Trash2,
  ChevronRight,
  Home,
} from 'lucide-react';
import type { Folder as FolderType, Material } from '@/types';
import CreateFolderDialog from './CreateFolderDialog';
import CreateNoteDialog from './CreateNoteDialog';
import { useToast } from '@/hooks/use-toast';

interface FolderNavigationProps {
  courseId: string;
  onSelectMaterial?: (material: Material) => void;
  onUploadClick?: () => void;
}

export default function FolderNavigation({ courseId, onSelectMaterial, onUploadClick }: FolderNavigationProps) {
  const { folders, materials, deleteFolder, deleteMaterial, toggleComplete } = useMaterialStore();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const { toast } = useToast();

  const getFolderPath = (folderId: string | null): FolderType[] => {
    if (!folderId) return [];
    const path: FolderType[] = [];
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined;
    }
    return path;
  };

  const currentPath = getFolderPath(currentFolderId);
  const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
  const currentMaterials = materials.filter((m) => m.folderId === currentFolderId);

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSelectedMaterialId(null);
  };

  const handleMaterialClick = (material: Material) => {
    setSelectedMaterialId(material.id);
    onSelectMaterial?.(material);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm('Delete this folder and all its contents?')) {
      try {
        await deleteFolder(folderId);
        if (currentFolderId === folderId) setCurrentFolderId(null);
        toast({ title: 'Deleted', description: 'Folder deleted successfully' });
      } catch {
        toast({ title: 'Error', description: 'Failed to delete folder', variant: 'destructive' });
      }
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (confirm('Delete this material?')) {
      try {
        await deleteMaterial(materialId);
        if (selectedMaterialId === materialId) {
          setSelectedMaterialId(null);
          onSelectMaterial?.(null as any);
        }
        toast({ title: 'Deleted', description: 'Material deleted successfully' });
      } catch {
        toast({ title: 'Error', description: 'Failed to delete material', variant: 'destructive' });
      }
    }
  };

  const handleToggleComplete = async (materialId: string) => {
    try {
      await toggleComplete(materialId);
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 shrink-0"
            onClick={() => setCurrentFolderId(null)}
          >
            <Home className="h-3.5 w-3.5" />
            <span className="text-xs">Root</span>
          </Button>
          {currentPath.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <span className="text-xs">{folder.name}</span>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Files and Folders List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* Folders */}
          {currentFolders.map((folder) => {
            const itemCount =
              folders.filter((f) => f.parentId === folder.id).length +
              materials.filter((m) => m.folderId === folder.id).length;

            return (
              <div
                key={folder.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors"
              >
                <div
                  className="flex-1 flex items-center gap-2 cursor-pointer"
                  onClick={() => handleFolderClick(folder.id)}
                >
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                  {itemCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleFolderClick(folder.id)}>
                      <Folder className="h-4 w-4 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteFolder(folder.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {/* Materials */}
          {currentMaterials.map((material) => {
            const isSelected = selectedMaterialId === material.id;
            return (
              <div
                key={material.id}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/60'
                }`}
                onClick={() => handleMaterialClick(material)}
              >
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {material.type === 'pdf' ? (
                    <File className="h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                  )}
                  <span className="text-sm truncate">{material.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(material.id);
                    }}
                    className="ml-auto shrink-0 p-0.5 hover:bg-muted/80 rounded"
                  >
                    {material.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleMaterialClick(material)}>
                      {material.type === 'pdf' ? (
                        <File className="h-4 w-4 mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleComplete(material.id)}>
                      {material.isCompleted ? (
                        <>
                          <Circle className="h-4 w-4 mr-2" /> Mark Incomplete
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteMaterial(material.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {/* Empty State */}
          {currentFolders.length === 0 && currentMaterials.length === 0 && (
            <div className="py-12 px-4">
              <div className="text-center mb-6">
                <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <Folder className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">This folder is empty</h3>
                <p className="text-sm text-muted-foreground">Get started by adding your first item</p>
              </div>

              <div className="grid gap-3 max-w-sm mx-auto">
                <CreateFolderDialog courseId={courseId} parentId={currentFolderId}>
                  <button className="group flex items-center gap-4 p-4 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-lg transition-all text-left">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 rounded-lg flex items-center justify-center transition-colors">
                      <FolderPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">New Folder</h4>
                      <p className="text-xs text-muted-foreground">Organize materials into folders</p>
                    </div>
                  </button>
                </CreateFolderDialog>

                <CreateNoteDialog courseId={courseId} folderId={currentFolderId}>
                  <button className="group flex items-center gap-4 p-4 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-lg transition-all text-left">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 rounded-lg flex items-center justify-center transition-colors">
                      <FilePlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">Create Note</h4>
                      <p className="text-xs text-muted-foreground">Write notes in Markdown</p>
                    </div>
                  </button>
                </CreateNoteDialog>

                <button
                  onClick={onUploadClick}
                  className="group flex items-center gap-4 p-4 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-lg transition-all text-left"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 rounded-lg flex items-center justify-center transition-colors">
                    <Upload className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">Upload PDF</h4>
                    <p className="text-xs text-muted-foreground">Add lecture slides or textbooks</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
