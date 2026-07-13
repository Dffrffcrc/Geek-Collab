import type { User } from 'firebase/auth';

export function requiresEmailVerification(user: User | null) {
  if (!user) return false;
  const providers = user.providerData.map((provider) => provider.providerId).filter(Boolean);
  if (providers.length === 0) return !user.emailVerified;
  return providers.includes('password');
}

