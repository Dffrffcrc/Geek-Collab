import leoProfanity from 'leo-profanity';

// Load built-in profanity words once for the app runtime.
leoProfanity.loadDictionary();

const tokenizeWordRegex = /\b([a-zA-Z]+)\b/g;

const normalizeBlockedWords = (blockedWords = []) => {
  if (!Array.isArray(blockedWords)) return new Set();
  return new Set(
    blockedWords
      .map((word) => String(word || '').trim().toLowerCase())
      .filter(Boolean)
  );
};

export const moderateText = (text, blockedWords = []) => {
  const source = String(text || '');
  if (!source) {
    return { sanitized: '', blockedCount: 0 };
  }

  const customBlocked = normalizeBlockedWords(blockedWords);
  let blockedCount = 0;

  const sanitized = source.replace(tokenizeWordRegex, (token) => {
    const lower = token.toLowerCase();
    const shouldBlock = customBlocked.has(lower) || leoProfanity.check(lower);
    if (!shouldBlock) return token;
    blockedCount += 1;
    return '*'.repeat(token.length);
  });

  return { sanitized, blockedCount };
};

export const hasModerationMatch = (text, blockedWords = []) => {
  const result = moderateText(text, blockedWords);
  return result.blockedCount > 0;
};