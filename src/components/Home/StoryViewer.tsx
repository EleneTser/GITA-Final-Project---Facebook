import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth } from '../../firebase';
import { createNotification } from './notificationsService';
import type { StoryItem } from './storiesService';

export interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  isOwn?: boolean;
  stories: StoryItem[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
}

const STORY_DURATION_MS = 5000;
const TICK_MS = 50;
const STORY_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export const StoryViewer: React.FC<StoryViewerProps> = ({
  groups,
  initialGroupIndex,
  initialStoryIndex = 0,
  onClose,
  onStoryViewed,
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<{ emoji: string; id: number } | null>(null);
  const [reactedEmoji, setReactedEmoji] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  useEffect(() => {
    if (currentStory) onStoryViewed?.(currentStory.id);
    setReactedEmoji(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory?.id]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const reactToStory = (emoji: string) => {
    if (!currentGroup || currentGroup.isOwn) return;
    setReactedEmoji(emoji);
    const burstId = Date.now();
    setReactionBurst({ emoji, id: burstId });
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setReactionBurst(null), 900);

    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const actorName = currentUser.displayName || 'Someone';
    createNotification({
      recipientId: currentGroup.userId,
      type: 'story_reaction',
      actorId: currentUser.uid,
      actorName,
      actorAvatar: currentUser.photoURL,
      text: `${actorName} reacted ${emoji} to your story.`,
    });
  };

  const goToGroup = useCallback((newGroupIndex: number, atEnd = false) => {
    if (newGroupIndex < 0 || newGroupIndex >= groups.length) {
      onClose();
      return;
    }
    setGroupIndex(newGroupIndex);
    const targetStories = groups[newGroupIndex]?.stories || [];
    setStoryIndex(atEnd ? Math.max(0, targetStories.length - 1) : 0);
    setProgress(0);
  }, [groups, onClose]);

  const nextStory = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
    } else {
      goToGroup(groupIndex + 1);
    }
  }, [currentGroup, storyIndex, groupIndex, goToGroup]);

  const prevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
    } else {
      goToGroup(groupIndex - 1, true);
    }
  }, [storyIndex, groupIndex, goToGroup]);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          return p;
        }
        const next = p + (TICK_MS / STORY_DURATION_MS) * 100;
        if (next >= 100) {
          return 100;
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, groupIndex, storyIndex]);

  useEffect(() => {
    if (progress < 100) return;
    const timeoutId = setTimeout(() => {
      nextStory();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextStory, prevStory, onClose]);

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center select-none">
      {/* Prev user arrow (desktop) */}
      {groupIndex > 0 && (
        <button
          onClick={() => goToGroup(groupIndex - 1)}
          aria-label="Previous user's stories"
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white cursor-pointer"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button
          onClick={() => goToGroup(groupIndex + 1)}
          aria-label="Next user's stories"
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white cursor-pointer"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      )}

      {/* Story card */}
      <div className="relative w-full h-full sm:h-[92vh] sm:w-auto sm:aspect-[9/16] bg-gray-900 overflow-hidden sm:rounded-xl">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%`,
                  transition: i === storyIndex ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-2 right-2 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shrink-0">
              <img src={currentGroup.userAvatar} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-white text-sm font-semibold drop-shadow">
              {currentGroup.isOwn ? 'Your story' : currentGroup.userName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close story"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.image ? (
            <img
              src={currentStory.image}
              alt={currentStory.title || 'Story'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center px-8"
              style={{ backgroundColor: currentStory.backgroundColor || '#1877f2' }}
            >
              <p className="text-white text-2xl sm:text-3xl font-bold text-center leading-snug break-words">
                {currentStory.text}
              </p>
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.title && currentStory.image && (
          <div className="absolute bottom-16 left-3 right-3 z-20">
            <p className="text-white text-sm font-medium drop-shadow bg-black/30 rounded-lg px-3 py-2">
              {currentStory.title}
            </p>
          </div>
        )}

        {/* Quick emoji reactions (Instagram/Facebook-style) */}
        {!currentGroup.isOwn && (
          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-center gap-1.5 sm:gap-2">
            {STORY_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                aria-label={`React with ${emoji}`}
                onClick={(e) => {
                  e.stopPropagation();
                  reactToStory(emoji);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl backdrop-blur-sm transition cursor-pointer active:scale-90 ${
                  reactedEmoji === emoji ? 'bg-white/30 scale-110' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Floating burst shown right after picking a reaction */}
        <AnimatePresence>
          {reactionBurst && (
            <motion.div
              key={reactionBurst.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -80, scale: 1.4 }}
              exit={{ opacity: 0, y: -110, scale: 1.2 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-40 text-4xl"
            >
              {reactionBurst.emoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap zones for prev/next + hold to pause */}
        <button
          aria-label="Previous story"
          onClick={prevStory}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="absolute left-0 top-0 h-[85%] w-1/3 z-10 cursor-pointer bg-transparent"
        />
        <button
          aria-label="Next story"
          onClick={nextStory}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="absolute right-0 top-0 h-[85%] w-2/3 z-10 cursor-pointer bg-transparent"
        />
      </div>
    </div>
  );
};

export default StoryViewer;
