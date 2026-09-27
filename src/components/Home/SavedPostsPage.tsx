import React, { useEffect, useState } from 'react';
import { PostCard } from './PostCard';
import { getSavedPosts, type SavedPost } from './savedPostsStore';

interface SavedPostsPageProps {
  currentUserId: string;
  onProfileClick: (userId: string) => void;
}

export const SavedPostsPage: React.FC<SavedPostsPageProps> = ({ currentUserId, onProfileClick }) => {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSavedPosts(getSavedPosts(currentUserId));
  }, [currentUserId]);

  const handleRefresh = () => setSavedPosts(getSavedPosts(currentUserId));

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 flex justify-center">
      <div className="w-full max-w-[680px]">
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1877f2] text-[26px]">bookmark</span>
          <div>
            <h1 className="text-lg font-bold text-[#1c1e21]">Saved</h1>
            <p className="text-xs text-gray-500">Posts you saved for later, kept on this device.</p>
          </div>
        </div>

        {savedPosts.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-gray-300">bookmark_border</span>
            <h2 className="text-lg font-bold text-gray-700 mt-2">Nothing saved yet</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Tap the bookmark icon on any post to save it here for later.
            </p>
          </div>
        ) : (
          <div onClick={handleRefresh}>
            {savedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onProfileClick={onProfileClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPostsPage;
