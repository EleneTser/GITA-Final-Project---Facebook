
export interface SavedPost {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  createdAt?: unknown;
  likes?: (string | { id: string })[];
  visibility?: 'public' | 'friends' | 'only_me';
  taggedFriends?: { uid: string; firstName: string; lastName?: string }[];
  savedAt: number;
}

const storageKey = (userId: string) => `fb_saved_posts_${userId}`;

export const getSavedPosts = (userId: string): SavedPost[] => {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read saved posts:', err);
    return [];
  }
};

export const isPostSaved = (userId: string, postId: string): boolean => {
  return getSavedPosts(userId).some((p) => p.id === postId);
};

/** Toggles a post's saved state for the given user. Returns the new saved state. */
export const toggleSavedPost = (userId: string, post: Omit<SavedPost, 'savedAt'>): boolean => {
  if (!userId) return false;
  const existing = getSavedPosts(userId);
  const alreadySaved = existing.some((p) => p.id === post.id);

  const updated = alreadySaved
    ? existing.filter((p) => p.id !== post.id)
    : [{ ...post, savedAt: Date.now() }, ...existing];

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update saved posts:', err);
  }

  return !alreadySaved;
};
