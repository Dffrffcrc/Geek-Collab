import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import { storage } from './firebase';



export type Attachment = {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  kind: AttachmentKind;
};

export type AttachmentKind = 'image' | 'pdf' | 'pptx' | 'other';



export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const AVATAR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PDF_TYPE = 'application/pdf';
const PPTX_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const ALLOWED_UPLOAD_TYPES = [...IMAGE_TYPES, PDF_TYPE, PPTX_TYPE];
export const ALLOWED_AVATAR_TYPES = AVATAR_IMAGE_TYPES;

export const UPLOAD_ACCEPT =
  ALLOWED_UPLOAD_TYPES.join(',') + ',.png,.jpg,.jpeg,.gif,.webp,.pdf,.pptx';
export const AVATAR_ACCEPT =
  ALLOWED_AVATAR_TYPES.join(',') + ',.png,.jpg,.jpeg,.webp';

export function classifyKind(contentType: string): AttachmentKind {
  if (IMAGE_TYPES.includes(contentType)) return 'image';
  if (contentType === PDF_TYPE) return 'pdf';
  if (contentType === PPTX_TYPE) return 'pptx';
  return 'other';
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}


function sanitizeFilename(name: string): string {
  const trimmed = name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
  return trimmed || 'file';
}



export function pickFiles(options: {
  accept: string;
  multiple?: boolean;
}): Promise<File[]> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    input.multiple = options.multiple ?? true;
    input.onchange = () => {
      resolve(input.files ? Array.from(input.files) : []);
    };

    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 5000);
  });
}

export function validateFile(
  file: File,
  opts: { allowedTypes: string[]; maxBytes: number },
): string | null {
  if (!opts.allowedTypes.includes(file.type)) {
    return `"${file.name}" is not a supported file type.`;
  }
  if (file.size > opts.maxBytes) {
    return `"${file.name}" is ${formatSize(file.size)}; max is ${formatSize(opts.maxBytes)}.`;
  }
  return null;
}

export function uploadFile(params: {
  file: File;
  uid: string;
  pathPrefix: 'uploads' | 'avatars';
  onProgress?: (percent: number) => void;
}): { attachment: Promise<Attachment>; cancel: () => void; task: UploadTask } {
  const { file, uid, pathPrefix, onProgress } = params;
  const safeName = sanitizeFilename(file.name);
  const path = `${pathPrefix}/${uid}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

  const attachment = new Promise<Attachment>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (!onProgress || snap.totalBytes === 0) return;
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            path,
            name: file.name,
            size: file.size,
            contentType: file.type,
            kind: classifyKind(file.type),
          });
        } catch (err) {
          reject(err);
        }
      },
    );
  });

  return { attachment, cancel: () => task.cancel(), task };
}



export async function deleteAttachment(attachment: Attachment): Promise<void> {
  try {
    await deleteObject(ref(storage, attachment.path));
  } catch (err) {
    console.warn('[uploads] delete failed for', attachment.path, err);
  }
}
