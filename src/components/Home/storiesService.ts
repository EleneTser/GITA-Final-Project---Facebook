import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import mockData from '../../data.json';

export interface StoryItem {
  id: string;
  userId: string;
  image?: string | null;
  text?: string | null;
  backgroundColor?: string | null;
  title?: string;
  createdAt?: unknown;
}

export const STORY_EXPIRY_HOURS = 24;

const toDate = (createdAt: unknown): Date | null => {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (typeof (createdAt as any).toDate === 'function') return (createdAt as any).toDate();
  return null;
};

const isExpired = (createdAt: unknown): boolean => {
  const date = toDate(createdAt);
  if (!date) return false;
  return Date.now() - date.getTime() > STORY_EXPIRY_HOURS * 60 * 60 * 1000;
};

/**
 * Streams the combined list of demo (data.json) stories and any
 * live stories created by real users, newest-first for live ones.
 * Live stories older than STORY_EXPIRY_HOURS are filtered out of the
 * feed immediately, and are also deleted from Firestore in the
 * background so they don't just linger unseen in the database.
 */
export const fetchAllStories = (onUpdate: (stories: StoryItem[]) => void) => {
  type MockStory = { id: string; userId: string; image: string; title: string };
  const mockStories: StoryItem[] = ((mockData.stories || []) as MockStory[]).map((s) => ({
    id: s.id,
    userId: s.userId,
    image: s.image,
    title: s.title,
  }));

  try {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const freshLiveStories: StoryItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Omit<StoryItem, 'id'>;
          if (isExpired(data.createdAt)) {
            deleteDoc(doc(db, 'stories', docSnap.id)).catch(() => {});
            return;
          }
          freshLiveStories.push({ id: docSnap.id, ...data });
        });
        onUpdate([...freshLiveStories, ...mockStories]);
      },
      (err) => {
        console.error('Error listening to stories:', err);
        onUpdate(mockStories);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to stories:', err);
    onUpdate(mockStories);
    return () => {};
  }
};

const VIEWED_STORIES_KEY = 'fb_viewed_story_ids';

/** Loads the set of story ids this browser has already viewed. */
export const loadViewedStoryIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(VIEWED_STORIES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

/** Persists the set of viewed story ids for this browser. */
export const saveViewedStoryIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
  }
};

/** Persists a new story (photo or text) for the given user. */
export const createStory = async (
  userId: string,
  data: { image?: string | null; text?: string | null; backgroundColor?: string | null; title?: string }
) => {
  await addDoc(collection(db, 'stories'), {
    userId,
    image: data.image || null,
    text: data.text || null,
    backgroundColor: data.backgroundColor || null,
    title: data.title || '',
    createdAt: serverTimestamp(),
  });
};
