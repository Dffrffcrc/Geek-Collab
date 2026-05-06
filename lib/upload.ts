import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Strip risky characters from filenames before they hit Storage paths.
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

// Upload a single file to a deterministic path under the given prefix and
// return the public download URL.
export async function uploadPostMedia(
  forumSlug: string,
  postSlug: string,
  index: number,
  file: File,
): Promise<string> {
  const path = `forum-posts/${forumSlug}/${postSlug}/${index}-${sanitizeFilename(file.name)}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}
