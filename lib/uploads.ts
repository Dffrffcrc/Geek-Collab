import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import { storage } from './firebase';

// Shape stored on post/comment/users docs and rendered by AttachmentStrip.
// `path` is retained so we can call deleteObject() if an author later removes
// an attachment or a mod cleans up a deleted post.
export type Attachment = {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  kind: AttachmentKind;
};

export type AttachmentKind = 'image' | 'pdf' | 'pptx' | 'other';

// Must stay in sync with storage.rules — the rules are the source of truth,
// but validating client-side gives an immediate error instead of a rule reject
// midway through an upload.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const AVATAR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PDF_TYPE = 'application/pdf';
const PPTX_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const ALLOWED_UPLOAD_TYPES = [...IMAGE_TYPES, PDF_TYPE, PPTX_TYPE];
export const ALLOWED_AVATAR_TYPES = AVATAR_IMAGE_TYPES;

// `accept` attribute values for the <input type="file"> element.
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

// Human-readable size for the UI (KB / MB, one decimal above 1 MB).
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

// Strip path separators and control chars so a hostile filename can't escape
// the uid/ scope. Preserves extension so contentType inference stays sane on
// re-download. Truncates to 100 chars — Firebase Storage's own limit is much
// higher, but long filenames just make the download URL ugly.
function sanitizeFilename(name: string): string {
  const trimmed = name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
  return trimmed || 'file';
}

// Programmatic web file picker. We deliberately don't use expo-image-picker /
// expo-document-picker — those pull in native modules that inflate the web
// bundle and this app is web-only per CLAUDE.md.
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
    // Some browsers (older Safari) need the input in the DOM to fire the
    // dialog. Attach hidden, click, remove after change.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.click();
    // Cleanup after a beat — the file list is already captured by the closure.
    setTimeout(() => input.remove(), 5000);
  });
}

// Validate a single file against the allowlist + size cap. Returns an error
// message string on rejection, or null on pass.
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

// Resumable upload with progress callbacks. Returns the final Attachment once
// the write completes and we have a fresh download URL.
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

// Best-effort delete — used when a post/comment is removed or an attachment is
// dropped from the composer before submit. Never throws (rules-blocked or
// already-deleted objects shouldn't crash the caller).
export async function deleteAttachment(attachment: Attachment): Promise<void> {
  try {
    await deleteObject(ref(storage, attachment.path));
  } catch (err) {
    console.warn('[uploads] delete failed for', attachment.path, err);
  }
}
