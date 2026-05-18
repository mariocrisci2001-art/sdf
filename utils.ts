import { get, set, keys, del } from 'idb-keyval';
import { Score, Folder } from '../types';

const METADATA_KEY = 'note-score-metadata';
const FOLDERS_KEY = 'note-score-folders';

export async function getScoresMetadata(): Promise<Score[]> {
  return (await get(METADATA_KEY)) || [];
}

export async function saveScoresMetadata(metadata: Score[]) {
  // We strip the blobs before saving metadata to keep it light
  const lightMetadata = metadata.map(score => ({
    ...score,
    blob: undefined // Don't store blob in metadata list
  })) as Score[];
  await set(METADATA_KEY, lightMetadata);
}

export async function getScoreBlob(id: string): Promise<Blob | undefined> {
  return await get(`blob-${id}`);
}

export async function saveScoreBlob(id: string, blob: Blob) {
  await set(`blob-${id}`, blob);
}

export async function deleteScore(id: string) {
  const metadata = await getScoresMetadata();
  const updatedMetadata = metadata.filter(s => s.id !== id);
  await saveScoresMetadata(updatedMetadata);
  await del(`blob-${id}`);
}

export async function getFolders(): Promise<Folder[]> {
  return (await get(FOLDERS_KEY)) || [];
}

export async function saveFolders(folders: Folder[]) {
  await set(FOLDERS_KEY, folders);
}
