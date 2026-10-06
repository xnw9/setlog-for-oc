export interface ExportFile {
  name: string;
  blob: Blob;
}

export type SaveMethod = 'folder' | 'share' | 'download';

type DirectoryPicker = (options?: { mode?: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;

const directoryPicker = () =>
  (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

const toFiles = (files: ExportFile[]) =>
  files.map(({ name, blob }) => new File([blob], name, { type: blob.type }));

/**
 * How to save: phones and tablets use the share sheet (so images can go to Photos); desktop
 * Chrome/Edge write several images into a folder picked once; everything else downloads.
 */
export function saveMethodFor(files: ExportFile[]): SaveMethod {
  if (isTouchDevice() && navigator.canShare?.({ files: toFiles(files) })) return 'share';
  if (files.length > 1 && directoryPicker()) return 'folder';
  return 'download';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function download(file: ExportFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Saves the files. Must run straight from a click: the share sheet and folder picker need a user
 * gesture. Resolves to false if the user cancelled the picker or share sheet.
 */
export async function saveFiles(files: ExportFile[], method: SaveMethod): Promise<boolean> {
  try {
    if (method === 'share') {
      await navigator.share({ files: toFiles(files) });
    } else if (method === 'folder') {
      const folder = await directoryPicker()!({ mode: 'readwrite' });
      for (const file of files) {
        const handle = await folder.getFileHandle(file.name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(file.blob);
        await writable.close();
      }
    } else {
      for (const file of files) {
        download(file);
        await sleep(300); // browsers drop downloads started in the same instant
      }
    }
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}
