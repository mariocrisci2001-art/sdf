export interface Annotation {
  id: string;
  type: 'pen' | 'eraser';
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  thickness: number;
  page: number;
}

export interface Score {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  blob: Blob;
  thumbnail?: string;
  dateImported: number;
  folderId?: string;
  isFavorite: boolean;
  baseSize: number; // For sheet resizing
  annotations: Annotation[];
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

export type ViewType = 'library' | 'reader' | 'converter';

export interface AppState {
  currentView: ViewType;
  selectedScoreId?: string;
  searchQuery: string;
  sortBy: 'date' | 'name';
  isGridView: boolean;
}
