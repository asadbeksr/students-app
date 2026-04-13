// Modified from polito/students-app — 2026-04-13
export interface CourseFile {
  id: string;
  name: string;
  type: 'file' | 'directory';
  mimeType?: string;
  sizeInKiloBytes?: number;
  createdAt?: Date;
  lastModifiedAt?: Date;
  url?: string;
  children?: CourseFile[];
}
