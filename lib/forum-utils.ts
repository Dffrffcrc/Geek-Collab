import { Timestamp } from 'firebase/firestore';

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function toMillis(d: Timestamp | Date | number | null | undefined): number {
  if (!d) return 0;
  if (typeof d === 'number') return d;
  if (d instanceof Date) return d.getTime();
  // Firestore Timestamp
  if (typeof (d as Timestamp).toMillis === 'function') return (d as Timestamp).toMillis();
  return 0;
}

export function isClosed(closesAt: Timestamp | Date | number): boolean {
  return toMillis(closesAt) <= Date.now();
}

export function timeRemaining(closesAt: Timestamp | Date | number): string {
  const ms = toMillis(closesAt) - Date.now();
  if (ms <= 0) return 'Closed';
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHr = Math.floor(totalMin / 60);
  const days = Math.floor(totalHr / 24);
  const hr = totalHr % 24;
  const min = totalMin % 60;
  const sec = totalSec % 60;
  if (days > 0) return `${days}d ${hr}h left`;
  if (totalHr > 0) return `${totalHr}h ${min}m left`;
  if (totalMin > 0) return `${totalMin}m ${sec}s left`;
  return `${totalSec}s left`;
}

export function timeAgo(d: Timestamp | Date | number): string {
  const ms = Date.now() - toMillis(d);
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Popularity = likes + (engagement-comments * weight).
// "Engagement comments" = non-author comments only (the author replying to
// their own thread shouldn't inflate popularity). Older posts that don't have
// `nonAuthorCommentCount` fall back to total `commentCount`.
const COMMENT_WEIGHT = 3;
export function popularity(post: {
  likeCount?: number;
  commentCount?: number;
  nonAuthorCommentCount?: number;
}): number {
  const likes = post.likeCount ?? 0;
  const engagement = post.nonAuthorCommentCount ?? post.commentCount ?? 0;
  return likes + engagement * COMMENT_WEIGHT;
}

// Trim a body for the forum-list preview card.
export function previewText(body: string, max = 160): string {
  if (!body) return '';
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
}
