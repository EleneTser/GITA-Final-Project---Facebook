import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import { fetchAllStories, loadViewedStoryIds, saveViewedStoryIds, type StoryItem } from './storiesService';
import { StoryViewer, type StoryGroup } from './StoryViewer';
import { CreateStoryModal } from './CreateStoryModal';
import mockData from '../../data.json';

interface User {
  id: string;
  name: string;
  profileImage: string;
}

interface StoriesBarProps {
  currentUserId: string;
  currentUserAvatar: string | null;
  userDisplayName: string;
}

const DEFAULT_AVATAR = '/images/users/default.jpg';

export const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId, currentUserAvatar, userDisplayName }) => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewer, setViewer] = useState<{ groups: StoryGroup[]; groupIndex: number } | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => loadViewedStoryIds());
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const map: Record<string, User> = {};
    (mockData.users || []).forEach((u: User) => {
      map[u.id] = u;
    });
    setUsersMap(map);

    const unsubscribe = fetchAllStories(setStories);
    return () => unsubscribe();
  }, []);

  const markStoryViewed = (storyId: string) => {
    setViewedIds((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      saveViewedStoryIds(next);
      return next;
    });
  };

  const myStories = useMemo(
    () => stories.filter((s) => s.userId === currentUserId),
    [stories, currentUserId]
  );

  const otherGroups = useMemo(() => {
    const order: string[] = [];
    const byUser: Record<string, StoryItem[]> = {};
    stories.forEach((s) => {
      if (s.userId === currentUserId) return;
      if (!byUser[s.userId]) {
        byUser[s.userId] = [];
        order.push(s.userId);
      }
      byUser[s.userId].push(s);
    });
    return order.map((userId) => {
      const user = usersMap[userId];
      return {
        userId,
        userName: user ? user.name : 'Facebook User',
        userAvatar: user ? user.profileImage : DEFAULT_AVATAR,
        stories: byUser[userId],
      } as StoryGroup;
    });
  }, [stories, usersMap, currentUserId]);

  const ownGroup: StoryGroup | null = myStories.length
    ? {
        userId: currentUserId,
        userName: userDisplayName,
        userAvatar: currentUserAvatar || DEFAULT_AVATAR,
        isOwn: true,
        stories: myStories,
      }
    : null;

  const allGroups: StoryGroup[] = ownGroup ? [ownGroup, ...otherGroups] : otherGroups;

  const openOwnStory = () => {
    if (!ownGroup) return;
    setViewer({ groups: allGroups, groupIndex: 0 });
  };

  const openOtherStory = (userId: string) => {
    const idx = allGroups.findIndex((g) => g.userId === userId);
    if (idx === -1) return;
    setViewer({ groups: allGroups, groupIndex: idx });
  };

  const isGroupFullyViewed = (group: StoryGroup) => group.stories.every((s) => viewedIds.has(s.id));

  return (
    <div className="bg-white rounded-xl shadow p-2 sm:p-4 mb-4 overflow-hidden relative group/stories">
      {/* Custom Prev/Next Arrows (desktop only — mobile relies on touch swipe) */}
      <button
        onClick={() => swiperRef.current?.slidePrev()}
        aria-label="Scroll stories left"
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center opacity-0 group-hover/stories:opacity-100 transition-opacity disabled:hidden"
      >
        <span className="material-symbols-outlined text-[18px] text-[#050505]">chevron_left</span>
      </button>
      <button
        onClick={() => swiperRef.current?.slideNext()}
        aria-label="Scroll stories right"
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center opacity-0 group-hover/stories:opacity-100 transition-opacity disabled:hidden"
      >
        <span className="material-symbols-outlined text-[18px] text-[#050505]">chevron_right</span>
      </button>

      <Swiper
        modules={[Navigation]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        slidesPerView="auto"
        spaceBetween={8}
        freeMode
        className="!pb-1 !overflow-visible"
      >
        {/* Create Story Card — always just your profile picture + the
            add (+) button, never replaced by whatever you've posted. */}
        <SwiperSlide style={{ width: 110 }}>
          <div
            onClick={() => setIsCreateOpen(true)}
            className="relative w-[110px] h-[200px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex flex-col cursor-pointer group shrink-0"
          >
            <div className="h-[140px] w-full overflow-hidden bg-gray-200 relative">
              {currentUserAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt="Create Story"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xl text-gray-500">
                  {userDisplayName?.[0]}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateOpen(true);
              }}
              aria-label="Create story"
              className="absolute top-[125px] left-1/2 -translate-x-1/2 w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full border-4 border-white flex items-center justify-center text-white text-lg font-bold shadow cursor-pointer transition-colors"
            >
              +
            </button>

            <div className="flex-1 bg-white flex items-end justify-center pb-2 px-1">
              <span className="text-xs font-semibold text-gray-800 text-center truncate w-full">
                Create story
              </span>
            </div>
          </div>
        </SwiperSlide>

        {/* Your Story bubble — only shown once you actually have an
            active story, styled exactly like everyone else's bubble and
            placed right before theirs. */}
        {ownGroup && (
          <SwiperSlide style={{ width: 110 }}>
            <StoryBubble
              group={ownGroup}
              label="Your story"
              ringClassName={isGroupFullyViewed(ownGroup) ? 'border-gray-300' : 'border-blue-600'}
              onClick={openOwnStory}
            />
          </SwiperSlide>
        )}

        {/* Everyone else's stories, grouped by user, showing their latest story */}
        {otherGroups.map((group) => (
          <SwiperSlide key={group.userId} style={{ width: 110 }}>
            <StoryBubble
              group={group}
              label={group.userName}
              ringClassName={isGroupFullyViewed(group) ? 'border-gray-300' : 'border-blue-600'}
              onClick={() => openOtherStory(group.userId)}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUserId={currentUserId}
        currentUserAvatar={currentUserAvatar}
        userDisplayName={userDisplayName}
      />

      {viewer && (
        <StoryViewer
          groups={viewer.groups}
          initialGroupIndex={viewer.groupIndex}
          onClose={() => setViewer(null)}
          onStoryViewed={markStoryViewed}
        />
      )}
    </div>
  );
};

const StoryBubble: React.FC<{
  group: StoryGroup;
  label: string;
  ringClassName: string;
  onClick: () => void;
}> = ({ group, label, ringClassName, onClick }) => {
  const preview = group.stories[0];

  return (
    <div
      onClick={onClick}
      className="relative w-[110px] h-[200px] rounded-xl overflow-hidden cursor-pointer group shrink-0 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Background Story Image */}
      {preview.image ? (
        <img
          src={preview.image}
          alt={preview.title || label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center p-3"
          style={{ backgroundColor: preview.backgroundColor || '#1877f2' }}
        >
          <span className="text-white text-xs font-bold text-center line-clamp-5">{preview.text}</span>
        </div>
      )}

      {/* Dark Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70"></div>

      {/* Multi-story indicator */}
      {group.stories.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/40 rounded-full px-1.5 py-0.5">
          <span className="text-white text-[10px] font-semibold">{group.stories.length}</span>
        </div>
      )}

      {/* User Profile Avatar Top-Left — blue while unseen, grey once viewed */}
      <div className={`absolute top-3 left-3 w-10 h-10 rounded-full border-4 overflow-hidden shadow transition-colors ${ringClassName}`}>
        <img src={group.userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
      </div>

      {/* Story Title Bottom */}
      <div className="absolute bottom-3 left-3 right-3">
        <span className="text-white text-xs font-semibold line-clamp-2 drop-shadow">
          {label}
        </span>
      </div>
    </div>
  );
};
