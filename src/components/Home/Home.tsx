import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { FriendsPage } from './FriendsPage';
import { ProfilePage } from './ProfilePage';
import { GroupsPage } from './GroupsPage'; 
import { ReelsPage } from './ReelsPage';   
import { CreatePostModal } from './CreatePostModal';
import { PostCard } from './PostCard';
import { StoriesBar } from './StoriesBar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { SavedPostsPage } from './SavedPostsPage';
import { SearchResultsPage } from './SearchResultsPage';
import { fetchAllPosts } from './postsService';
import { fetchAcceptedFriendIds } from './friendsHelper';
import { useUserAvatar } from './useUserAvatar';
import Vid from '../../assets/Icons/VideoCam.png'
import photos from '../../assets/Icons/imagesgreen.png'
import emoji from '../../assets/Icons/activity.png'

interface HomeProps {
  userDisplayName: string;
  currentUserId: string;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ userDisplayName, currentUserId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [openChatRequest, setOpenChatRequest] = useState<{ friend: any; ts: number } | null>(null);

  const currentUserAvatar = useUserAvatar(currentUserId);

  useEffect(() => {
    const unsubscribe = fetchAllPosts((updatedPosts) => {
      setAllPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    fetchAcceptedFriendIds(currentUserId)
      .then((ids) => {
        if (!cancelled) setFriendIds(ids);
      })
      .catch((err) => console.error('Error loading friend list for feed filtering:', err));
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const visiblePosts = allPosts.filter((post) => {
    if (post.userId === currentUserId) return true;
    const visibility = post.visibility || 'public';
    if (visibility === 'only_me') return false;
    if (visibility === 'friends') return friendIds.includes(post.userId);
    return true;
  });

  const getActiveTab = () => {
    if (location.pathname.startsWith('/friends')) return 'friends';
    if (location.pathname.startsWith('/profile')) return 'profile';
    if (location.pathname.startsWith('/groups')) return 'groups';
    if (location.pathname.startsWith('/reels')) return 'reels';
    if (location.pathname.startsWith('/search')) return 'search';
    return 'home';
  };

  const goHome = () => navigate('/home');
  const isHomeTab = getActiveTab() === 'home';

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#1c1e21]">
      <Navbar
        currentUserId={currentUserId}
        userDisplayName={userDisplayName}
        userAvatar={currentUserAvatar}
        onLogout={onLogout}
        openChatRequest={openChatRequest}
        activeTab={getActiveTab()}
        setActiveTab={(tab) => {
          if (tab === 'home') goHome();
          if (tab === 'friends') navigate('/friends');
          if (tab === 'groups') navigate('/groups');
          if (tab === 'reels') navigate('/reels');
        }}
        onProfileClick={() => navigate(`/profile/${currentUserId}`)}
        onSelectUser={(userId: string) => navigate(`/profile/${userId}`)}
        onOpenCreatePost={() => setIsPostModalOpen(true)}
      />

      {/* Fixed side rails, pinned to the true edges of the viewport. Rendered
          as direct siblings of <main> (not nested inside any centered/flex
          wrapper) so nothing can throw off their left-0 / right-0 anchoring. */}
      {isHomeTab && (
        <>
          <LeftSidebar
            userDisplayName={userDisplayName}
            userAvatar={currentUserAvatar}
            onProfileClick={() => navigate(`/profile/${currentUserId}`)}
          />
          <RightSidebar
            currentUserId={currentUserId}
            onOpenChat={(friend) => setOpenChatRequest({ friend, ts: Date.now() })}
          />
        </>
      )}

      <main className="pt-4 pb-8">
        <Routes>
          <Route 
            path="/home" 
            element={
              <div className="flex justify-center px-2 sm:px-4 lg:ml-[300px] xl:mr-[300px]">
                <div className="w-full max-w-[680px]">
                  {/* Create Post Card Trigger */}
                  <div className="bg-white rounded-xl shadow px-3 sm:px-4 pt-3 pb-3 mb-4">
                    <div className="flex gap-2 sm:gap-3 items-center">
                      <div 
                        onClick={() => navigate(`/profile/${currentUserId}`)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer hover:opacity-90 overflow-hidden"
                      >
                        {currentUserAvatar ? (
                          <img src={currentUserAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          userDisplayName ? userDisplayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'FB'
                        )}
                      </div>

                      <button
                        onClick={() => setIsPostModalOpen(true)}
                        className="flex-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-left px-3 sm:px-4 py-2.5 rounded-full text-gray-500 transition-colors cursor-pointer text-sm sm:text-base truncate"
                      >
                        What's on your mind, {userDisplayName.split(' ')[0]}?
                      </button>

                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <div 
                          onClick={() => setIsPostModalOpen(true)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <img src={Vid} alt="Live Video" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                        </div>

                        <div 
                          onClick={() => setIsPostModalOpen(true)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors hidden xs:flex"
                        >
                          <img src={photos} alt="Photo" className="w-5 h-5 sm:w-6 sm:h-6 object-contain filter hue-rotate-[50deg] saturate-150" />
                        </div>

                        <div 
                          onClick={() => setIsPostModalOpen(true)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors hidden xs:flex"
                        >
                          <img src={emoji} alt="Emoji" className="w-5 h-5 sm:w-6 sm:h-6 object-contain filter saturate-200 brightness-110" />
                        </div>
                      </div>
                    </div> 
                  </div>

                  {/* STORIES BAR INSERTED HERE */}
                  <StoriesBar 
                    currentUserId={currentUserId}
                    currentUserAvatar={currentUserAvatar}
                    userDisplayName={userDisplayName}
                  />

                  {/* News Feed Stream */}
                  {visiblePosts.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-8 text-center">
                      <h2 className="text-lg font-bold text-gray-700">No posts yet!</h2>
                      <p className="text-gray-500 mt-1 text-sm">Be the first to share something on your news feed.</p>
                    </div>
                  ) : (
                    visiblePosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUserId={currentUserId} 
                        onProfileClick={(authorId) => navigate(`/profile/${authorId}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            } 
          />
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route 
            path="/friends" 
            element={
              <FriendsPage 
                currentUserId={currentUserId} 
                onProfileClick={(friendId: string) => navigate(`/profile/${friendId}`)}
              />
            } 
          />

          <Route 
            path="/groups" 
            element={<GroupsPage currentUserId={currentUserId} />} 
          />

          <Route 
            path="/reels" 
            element={<ReelsPage currentUserId={currentUserId} />} 
          />

          <Route
            path="/saved"
            element={
              <SavedPostsPage
                currentUserId={currentUserId}
                onProfileClick={(userId: string) => navigate(`/profile/${userId}`)}
              />
            }
          />

          <Route
            path="/profile/:userId"
            element={
              <ProfileRouteWrapper
                currentUserId={currentUserId}
                onOpenCreatePost={() => setIsPostModalOpen(true)}
              />
            }
          />

          <Route
            path="/search"
            element={
              <SearchResultsPage
                currentUserId={currentUserId}
                userDisplayName={userDisplayName}
                onProfileClick={(userId: string) => navigate(`/profile/${userId}`)}
              />
            }
          />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        userDisplayName={userDisplayName}
        onPostCreated={() => {}}
      />
    </div>
  );
};

const ProfileRouteWrapper: React.FC<{ currentUserId: string; onOpenCreatePost?: () => void }> = ({
  currentUserId,
  onOpenCreatePost,
}) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  return (
    <ProfilePage
      currentUserId={currentUserId}
      profileUserId={userId || currentUserId}
      onProfileClick={(clickedUserId: string) => navigate(`/profile/${clickedUserId}`)}
      onOpenCreatePost={onOpenCreatePost}
    />
  );
};

export default Home;