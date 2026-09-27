import React, { useState, useEffect, useRef } from 'react';
import { 
  doc, 
  deleteDoc, 
  updateDoc, 
  collection, 
  addDoc,
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useUserAvatar } from './useUserAvatar';
import { isPostSaved, toggleSavedPost } from './savedPostsStore';
import { fetchAcceptedFriends, type FriendSummary } from './friendsHelper';
import { createNotification } from './notificationsService';
import Pfp from '../../assets/PFP.png';

interface CommentMention {
  uid: string;
  name: string;
}

interface Comment {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar?: string;
  content?: string;
  text?: string;
  createdAt?: any;
  mentions?: CommentMention[];
}

interface TaggedFriend {
  uid: string;
  firstName: string;
  lastName?: string;
}

interface SharedPostSnapshot {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar?: string;
  content?: string;
  image?: string;
  createdAt?: any;
}

interface Post {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  createdAt?: any;
  likes?: (string | { id: string })[];
  comments?: Comment[];
  visibility?: 'public' | 'friends' | 'only_me';
  taggedFriends?: TaggedFriend[];
  sharedPost?: SharedPostSnapshot;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onProfileClick?: (userId: string) => void;
}

const VISIBILITY_META: Record<string, { icon: string; label: string }> = {
  public: { icon: 'public', label: 'Public' },
  friends: { icon: 'group', label: 'Friends' },
  only_me: { icon: 'lock', label: 'Only me' },
};

interface ReactionMeta {
  key: string;
  emoji: string;
  label: string;
  color: string;
}

const REACTIONS: ReactionMeta[] = [
  { key: 'like', emoji: '👍', label: 'Like', color: 'text-blue-600' },
  { key: 'love', emoji: '❤️', label: 'Love', color: 'text-red-600' },
  { key: 'care', emoji: '🥰', label: 'Care', color: 'text-yellow-500' },
  { key: 'haha', emoji: '😆', label: 'Haha', color: 'text-yellow-500' },
  { key: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
  { key: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];

const LONG_PRESS_MS = 450;

export const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onProfileClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const [friendsList, setFriendsList] = useState<FriendSummary[]>([]);
  const [mentionedFriends, setMentionedFriends] = useState<CommentMention[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<FriendSummary[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const likeNotifiedRef = useRef(false);

  const initialLikes = post.likes || [];
  const [likes, setLikes] = useState<string[]>(
    initialLikes.map(l => (typeof l === 'string' ? l : l.id))
  );
  
  const hasLiked = likes.includes(currentUserId);
  const isAuthor = currentUserId === post.userId;
  const isMockPost = post.id.startsWith('post_');

  const [myReaction, setMyReaction] = useState<string | null>(hasLiked ? 'like' : null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const likeButtonWrapRef = useRef<HTMLDivElement>(null);
  const [reactionBurst, setReactionBurst] = useState<{ id: number; emoji: string } | null>(null);
  const [popKey, setPopKey] = useState(0);
  const [heartBurstId, setHeartBurstId] = useState<number | null>(null);
  const reactionBarRef = useRef<HTMLDivElement>(null);

  const currentReactionMeta = REACTIONS.find((r) => r.key === myReaction) || null;

  const [isSaved, setIsSaved] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // "..." post options menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [notifyOnPost, setNotifyOnPost] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hiddenStatus, setHiddenStatus] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<'why' | 'embed' | null>(null);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const authorFirstName = post.userDisplayName?.split(' ')[0] || 'this person';

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showOptionsMenu]);

  useEffect(() => {
    if (!showShareMenu) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showShareMenu]);

  useEffect(() => {
    setIsSaved(isPostSaved(currentUserId, post.id));
  }, [currentUserId, post.id]);

  useEffect(() => {
    if (!showComments || friendsList.length > 0) return;
    let cancelled = false;
    fetchAcceptedFriends(currentUserId)
      .then((friends) => {
        if (!cancelled) setFriendsList(friends);
      })
      .catch((err) => console.error('Error loading friends for tagging:', err));
    return () => {
      cancelled = true;
    };
  }, [showComments, currentUserId, friendsList.length]);

  const handleToggleSave = () => {
    const nowSaved = toggleSavedPost(currentUserId, {
      id: post.id,
      userId: post.userId,
      userDisplayName: post.userDisplayName,
      userAvatar: post.userAvatar,
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
      likes: post.likes,
      visibility: post.visibility,
      taggedFriends: post.taggedFriends,
    });
    setIsSaved(nowSaved);
  };

  const authorAvatar = useUserAvatar(post.userId, post.userAvatar);
  const myAvatar = useUserAvatar(currentUserId);
  const visibilityMeta = VISIBILITY_META[post.visibility || 'public'];
  const taggedFriends = post.taggedFriends || [];

  useEffect(() => {
    if (isMockPost) return;

    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentList);
    });
    return () => unsubscribe();
  }, [post.id, isMockPost]);

  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        likeButtonWrapRef.current &&
        !likeButtonWrapRef.current.contains(target) &&
        (!reactionBarRef.current || !reactionBarRef.current.contains(target))
      ) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showReactionPicker]);

  const notifyLike = () => {
    if (likeNotifiedRef.current || isMockPost || post.userId === currentUserId) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    likeNotifiedRef.current = true;
    const actorName = currentUser.displayName || 'Facebook User';
    createNotification({
      recipientId: post.userId,
      type: 'like',
      actorId: currentUserId,
      actorName,
      actorAvatar: currentUser.photoURL,
      text: `${actorName} liked your post.`,
      postId: post.id,
    });
  };

  const applyReaction = (key: string) => {
    if (myReaction === key) {
      setMyReaction(null);
      setLikes(likes.filter((id) => id !== currentUserId));
    } else {
      setMyReaction(key);
      if (!likes.includes(currentUserId)) {
        setLikes([...likes, currentUserId]);
      }
      notifyLike();
      const emoji = REACTIONS.find((r) => r.key === key)?.emoji || '👍';
      setReactionBurst({ id: Date.now(), emoji });
      setPopKey((k) => k + 1);
    }
    setShowReactionPicker(false);
    cancelLongPress();
  };

  const startLongPress = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setShowReactionPicker(true);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLikeButtonClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (myReaction) {
      setMyReaction(null);
      setLikes(likes.filter((id) => id !== currentUserId));
    } else {
      setMyReaction('like');
      setLikes([...likes, currentUserId]);
      notifyLike();
      setReactionBurst({ id: Date.now(), emoji: '👍' });
      setPopKey((k) => k + 1);
    }
  };

  const handleImageDoubleClick = () => {
    if (!myReaction) {
      setMyReaction('like');
      setLikes([...likes, currentUserId]);
      notifyLike();
    }
    setHeartBurstId(Date.now());
  };

  // Handle Delete Post
  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        if (!isMockPost) {
          await deleteDoc(doc(db, 'posts', post.id));
        } else {
          window.location.reload(); 
        }
      } catch (err) {
        console.error("Error deleting post:", err);
      }
    }
  };

  const handleInterested = () => {
    setShowOptionsMenu(false);
    showToast("You'll see more posts like this.");
  };
  const handleNotInterested = () => {
    setShowOptionsMenu(false);
    showToast("You'll see fewer posts like this.");
  };
  const handleToggleNotify = () => {
    setShowOptionsMenu(false);
    setNotifyOnPost((prev) => {
      const next = !prev;
      showToast(next ? "You'll be notified when there's activity on this post." : 'Notifications turned off for this post.');
      return next;
    });
  };
  const handleHidePost = () => {
    setShowOptionsMenu(false);
    setHiddenStatus('Post hidden.');
  };
  const handleSnooze = () => {
    setShowOptionsMenu(false);
    setHiddenStatus(`You won't see posts from ${authorFirstName} for 30 days.`);
  };
  const handleUnfollow = () => {
    setShowOptionsMenu(false);
    setHiddenStatus(`You unfollowed ${authorFirstName}. You won't see their posts in your feed anymore.`);
  };
  const handleShareNow = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('You need to be signed in to share posts.');
      return;
    }
    setIsSharing(true);
    try {
      const original = post.sharedPost
        ? post.sharedPost
        : {
            id: post.id,
            userId: post.userId,
            userDisplayName: post.userDisplayName,
            userAvatar: post.userAvatar,
            content: post.content,
            image: post.image,
            createdAt: post.createdAt,
          };

      await addDoc(collection(db, 'posts'), {
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || 'Facebook User',
        userAvatar: myAvatar,
        content: '',
        image: null,
        visibility: 'public',
        taggedFriends: [],
        sharedPost: original,
        createdAt: serverTimestamp(),
      });

      setShowShareMenu(false);
      showToast('Post shared to your feed.');
    } catch (err) {
      console.error('Error sharing post:', err);
      showToast('Could not share this post. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/profile/${post.userId}`;
    const shareText = post.content ? post.content.slice(0, 120) : `${post.userDisplayName}'s post`;
    setShowShareMenu(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Facebook post', text: shareText, url: shareUrl });
        return;
      }
    } catch (err) {
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard.');
    } catch (err) {
      showToast('Could not copy the link.');
    }
  };

  const handleReportReason = () => {
    setShowReportPanel(false);
    setShowOptionsMenu(false);
    showToast("Thanks for letting us know. We'll review this post.");
  };
  const handleConfirmBlock = () => {
    setShowBlockConfirm(false);
    setShowOptionsMenu(false);
    setHiddenStatus(`You blocked ${authorFirstName}. You won't be able to see or contact each other.`);
  };

  // Handle Update Post
  const handleUpdatePost = async () => {
    if (!editContent.trim()) return;
    try {
      if (!isMockPost) {
        await updateDoc(doc(db, 'posts', post.id), {
          content: editContent.trim()
        });
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating post:", err);
    }
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);

    const match = value.match(/@([a-zA-Z]*)$/);
    if (match && friendsList.length > 0) {
      const q = match[1].toLowerCase();
      const suggestions = friendsList
        .filter((f) => `${f.firstName} ${f.lastName || ''}`.toLowerCase().trim().replace(/\s+/g, ' ').includes(q) || f.firstName.toLowerCase().startsWith(q))
        .slice(0, 5);
      setMentionSuggestions(suggestions);
      setShowMentionPicker(suggestions.length > 0);
    } else {
      setShowMentionPicker(false);
    }
  };

  const selectMention = (friend: FriendSummary) => {
    const fullName = `${friend.firstName}${friend.lastName ? ' ' + friend.lastName : ''}`;
    setNewComment((prev) => prev.replace(/@([a-zA-Z]*)$/, `@${fullName} `));
    setMentionedFriends((prev) => (prev.some((m) => m.uid === friend.uid) ? prev : [...prev, { uid: friend.uid, name: fullName }]));
    setShowMentionPicker(false);
  };

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const commentText = newComment.trim();
    const taggedInComment = mentionedFriends.filter((m) => commentText.includes(`@${m.name}`));
    const authorName = currentUser.displayName || 'Facebook User';
    const authorAvatar = currentUser.photoURL || Pfp;

    const newCommentObj: Comment = {
      id: 'comment_' + Date.now(),
      userId: currentUser.uid,
      userDisplayName: authorName,
      userAvatar: authorAvatar,
      content: commentText,
      createdAt: new Date(),
      mentions: taggedInComment,
    };

    try {
      if (!isMockPost) {
        await addDoc(collection(db, 'posts', post.id, 'comments'), {
          userId: currentUser.uid,
          userDisplayName: authorName,
          userAvatar: authorAvatar,
          content: commentText,
          mentions: taggedInComment,
          createdAt: serverTimestamp(),
        });

        if (post.userId !== currentUser.uid && !taggedInComment.some((m) => m.uid === post.userId)) {
          createNotification({
            recipientId: post.userId,
            type: 'comment',
            actorId: currentUser.uid,
            actorName: authorName,
            actorAvatar: authorAvatar,
            text: `${authorName} commented on your post.`,
            postId: post.id,
          });
        }

        taggedInComment.forEach((m) => {
          if (m.uid === currentUser.uid) return;
          createNotification({
            recipientId: m.uid,
            type: 'mention',
            actorId: currentUser.uid,
            actorName: authorName,
            actorAvatar: authorAvatar,
            text: `${authorName} tagged you in a comment.`,
            postId: post.id,
          });
        });
      } else {
        setComments([...comments, newCommentObj]);
      }
      setNewComment('');
      setMentionedFriends([]);
      setShowMentionPicker(false);
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'FB';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderCommentText = (text: string, mentions?: CommentMention[]) => {
    if (!mentions || mentions.length === 0) return text;
    const tokens = mentions.map((m) => `@${m.name}`).sort((a, b) => b.length - a.length);
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'g');
    return text.split(regex).map((part, idx) => {
      const match = mentions.find((m) => `@${m.name}` === part);
      if (match) {
        return (
          <span
            key={idx}
            className="text-[#1877f2] font-semibold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick?.(match.uid);
            }}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  if (hiddenStatus) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 mb-4 p-4 flex items-center justify-between gap-3 text-[#050505]">
        <p className="text-sm text-gray-700">{hiddenStatus}</p>
        <button
          onClick={() => setHiddenStatus(null)}
          className="text-[#1877f2] font-semibold text-sm hover:underline cursor-pointer shrink-0"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl shadow border border-gray-200 mb-4 text-[#050505]">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 pb-2 gap-2">
        <div 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0" 
          onClick={() => onProfileClick?.(post.userId)}
        >
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
            {authorAvatar ? (
              <img src={authorAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(post.userDisplayName)
            )}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[#1c1e21] group-hover:underline">
              {post.userDisplayName}
              {taggedFriends.length > 0 && (
                <span className="font-normal text-gray-500">
                  {' '}with{' '}
                  {taggedFriends.map((f, idx) => (
                    <span key={f.uid}>
                      <span
                        className="font-semibold text-[#1c1e21] hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProfileClick?.(f.uid);
                        }}
                      >
                        {f.firstName}
                      </span>
                      {idx < taggedFriends.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>
                {typeof post.createdAt === 'string' 
                  ? post.createdAt 
                  : post.createdAt?.toDate 
                  ? post.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : 'Just now'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5" title={visibilityMeta.label}>
                <span className="material-symbols-outlined text-[13px]">{visibilityMeta.icon}</span>
                {visibilityMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* "..." Post Options Menu */}
        <div className="relative shrink-0" ref={optionsMenuRef}>
          <button
            onClick={() => setShowOptionsMenu((v) => !v)}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer"
            title="More options"
          >
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-1 w-72 max-w-[85vw] bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-30">
              {!isAuthor && (
                <>
                  <OptionMenuItem
                    icon="thumb_up"
                    title="Interested"
                    subtitle="More of your posts will be like this."
                    onClick={handleInterested}
                  />
                  <OptionMenuItem
                    icon="thumb_down"
                    title="Not interested"
                    subtitle="Less of your posts will be like this."
                    onClick={handleNotInterested}
                  />
                  <div className="h-px bg-gray-100 my-1" />
                </>
              )}

              <OptionMenuItem
                icon={isSaved ? 'bookmark' : 'bookmark_border'}
                title={isSaved ? 'Remove from saved' : 'Save post'}
                subtitle="Add this to your saved items"
                onClick={() => {
                  handleToggleSave();
                  setShowOptionsMenu(false);
                }}
              />
              <OptionMenuItem
                icon={notifyOnPost ? 'notifications_active' : 'notifications'}
                title={notifyOnPost ? 'Turn off notifications for this post' : 'Turn on notifications for this post'}
                onClick={handleToggleNotify}
              />
              <OptionMenuItem
                icon="info"
                title="Why am I seeing this post?"
                onClick={() => {
                  setInfoModal('why');
                  setShowOptionsMenu(false);
                }}
              />
              <OptionMenuItem
                icon="code"
                title="Embed"
                onClick={() => {
                  setInfoModal('embed');
                  setShowOptionsMenu(false);
                }}
              />

              {isAuthor ? (
                <>
                  <div className="h-px bg-gray-100 my-1" />
                  <OptionMenuItem icon="edit" title="Edit post" onClick={() => { setIsEditing(!isEditing); setShowOptionsMenu(false); }} />
                  <OptionMenuItem icon="delete" title="Delete post" danger onClick={() => { setShowOptionsMenu(false); handleDeletePost(); }} />
                </>
              ) : (
                <>
                  <div className="h-px bg-gray-100 my-1" />
                  <OptionMenuItem
                    icon="visibility_off"
                    title="Hide post"
                    subtitle="See fewer posts like this."
                    onClick={handleHidePost}
                  />
                  <OptionMenuItem
                    icon="schedule"
                    title={`Snooze ${authorFirstName} for 30 days`}
                    subtitle="Temporarily stop seeing posts."
                    onClick={handleSnooze}
                  />
                  <OptionMenuItem
                    icon="person_remove"
                    title={`Unfollow ${authorFirstName}`}
                    subtitle="Stop seeing posts from them. They won't be notified."
                    onClick={handleUnfollow}
                  />
                  <OptionMenuItem
                    icon="flag"
                    title="Report post"
                    subtitle={`We won't let ${authorFirstName} know who reported it.`}
                    onClick={() => {
                      setShowReportPanel(true);
                      setShowOptionsMenu(false);
                    }}
                  />
                  <OptionMenuItem
                    icon="block"
                    title={`Block ${authorFirstName}'s profile`}
                    subtitle="You won't be able to see or contact each other."
                    danger
                    onClick={() => {
                      setShowBlockConfirm(true);
                      setShowOptionsMenu(false);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Body / Content */}
      <div className="px-3 sm:px-4 py-2">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-3 py-1 bg-gray-200 rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePost} 
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          post.content ? <p className="text-sm text-[#1c1e21] whitespace-pre-wrap">{post.content}</p> : null
        )}
      </div>

      {/* Embedded original post — shown when this post is a share/repost */}
      {post.sharedPost && (
        <div className="mx-3 sm:mx-4 mb-2 border border-gray-200 rounded-xl overflow-hidden">
          <div
            onClick={() => onProfileClick?.(post.sharedPost!.userId)}
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition"
          >
            <img
              src={post.sharedPost.userAvatar || Pfp}
              alt={post.sharedPost.userDisplayName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1c1e21] truncate hover:underline">
                {post.sharedPost.userDisplayName}
              </p>
              <p className="text-xs text-gray-500">
                {typeof post.sharedPost.createdAt === 'string'
                  ? post.sharedPost.createdAt
                  : post.sharedPost.createdAt?.toDate
                  ? post.sharedPost.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </p>
            </div>
          </div>
          {post.sharedPost.content && (
            <p className="px-3 pb-2 text-sm text-[#1c1e21] whitespace-pre-wrap">{post.sharedPost.content}</p>
          )}
          {post.sharedPost.image && (
            <img
              src={post.sharedPost.image}
              alt="Shared post media"
              className="w-full max-h-[400px] object-cover"
            />
          )}
        </div>
      )}

      {/* Post Image (if any) — click to open full-screen */}
      {post.image && (
        <div
          onClick={() => setIsLightboxOpen(true)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleImageDoubleClick();
          }}
          className="relative mt-2 bg-black max-h-[500px] flex items-center justify-center overflow-hidden cursor-zoom-in"
        >
          <img src={post.image} alt="Post media" className="w-full object-contain max-h-[500px]" />
          {heartBurstId && (
            <div
              key={heartBurstId}
              onAnimationEnd={() => setHeartBurstId(null)}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-7xl heart-pop drop-shadow-lg">❤️</span>
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      {isLightboxOpen && post.image && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[26px]">close</span>
          </button>
          <img
            src={post.image}
            alt="Post media enlarged"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Reactions & Comments Count Summary */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-b border-gray-100 mx-3">
        <span>{currentReactionMeta ? currentReactionMeta.emoji : '👍'} {likes.length}</span>
        <button onClick={() => setShowComments(!showComments)} className="hover:underline cursor-pointer">
          {comments.length} comments
        </button>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 mx-2">
        <div className="relative flex-1" ref={likeButtonWrapRef}>
          {reactionBurst && (
            <span
              key={reactionBurst.id}
              onAnimationEnd={() => setReactionBurst(null)}
              className="reaction-burst"
            >
              {reactionBurst.emoji}
            </span>
          )}
          {/* Reaction Picker (opens on long-press / press-and-hold) */}
          {showReactionPicker && (
            <div
              ref={reactionBarRef}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-0.5 sm:gap-1 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1.5 z-20"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => applyReaction(r.key)}
                  title={r.label}
                  className="text-2xl sm:text-3xl leading-none hover:-translate-y-1 hover:scale-125 transition-transform duration-150 cursor-pointer px-0.5"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleLikeButtonClick}
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            className={`w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg font-semibold text-xs sm:text-sm transition cursor-pointer select-none ${
              currentReactionMeta ? currentReactionMeta.color : 'text-gray-600'
            }`}
          >
            {currentReactionMeta ? (
              <span key={popKey} className="text-[18px] leading-none reaction-pop">{currentReactionMeta.emoji}</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">thumb_up</span>
            )}
            {currentReactionMeta ? currentReactionMeta.label : 'Like'}
          </button>
        </div>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-semibold text-xs sm:text-sm transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">chat</span>
          Comment
        </button>
        <div className="relative flex-1" ref={shareMenuRef}>
          <button
            onClick={() => setShowShareMenu((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg text-gray-600 font-semibold text-xs sm:text-sm transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">share</span>
            Share
          </button>

          {showShareMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-20">
              <button
                onClick={handleShareNow}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 text-left cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px] text-gray-600">send</span>
                <span>
                  <span className="block text-sm font-semibold text-[#1c1e21]">
                    {isSharing ? 'Sharing...' : 'Share now'}
                  </span>
                  <span className="block text-xs text-gray-500">Post this to your own feed</span>
                </span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-gray-600">link</span>
                <span>
                  <span className="block text-sm font-semibold text-[#1c1e21]">Copy link</span>
                  <span className="block text-xs text-gray-500">Send it anywhere you like</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-3 bg-gray-50 rounded-b-xl space-y-3">
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2 relative">
            {/* @mention suggestions */}
            {showMentionPicker && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-56 max-w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20">
                {mentionSuggestions.map((f) => (
                  <button
                    type="button"
                    key={f.uid}
                    onClick={() => selectMention(f)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-left cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {f.profileImage ? (
                        <img src={f.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        f.firstName?.[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#1c1e21] truncate">
                      {f.firstName} {f.lastName}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={newComment}
              onChange={handleCommentInputChange}
              placeholder="Write a comment... (@ to tag a friend)"
              className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-1.5 text-xs outline-none focus:border-blue-500"
            />
            <button type="submit" className="text-blue-600 font-semibold text-xs px-3 cursor-pointer">Post</button>
          </form>

          {/* Comment List */}
          <div className="space-y-2 pt-1">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                onProfileClick={onProfileClick}
                getInitials={getInitials}
                renderText={renderCommentText}
              />
            ))}
          </div>
        </div>
      )}

      {/* Toast confirmation for menu actions */}
      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 bg-[#1c1e21] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-40 whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* "Why am I seeing this / Embed" info modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setInfoModal(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1c1e21]">
                {infoModal === 'why' ? 'Why am I seeing this post?' : 'Embed post'}
              </h3>
              <button onClick={() => setInfoModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 text-sm text-gray-700 space-y-3">
              {infoModal === 'why' ? (
                <>
                  <p>This post is showing in your feed because:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>You're friends with {post.userDisplayName}, or their post is public.</li>
                    <li>You've interacted with posts like this before.</li>
                    <li>It was posted recently.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-gray-600">Paste this code to embed this post on your own website.</p>
                  <textarea
                    readOnly
                    value={`<iframe src="https://www.facebook.com/plugins/post.php?href=post/${post.id}" width="500" height="600" style="border:none;overflow:hidden" scrolling="no" frameborder="0"></iframe>`}
                    className="w-full h-24 border border-gray-200 rounded-lg p-2 text-xs font-mono text-gray-700 resize-none outline-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report post reasons */}
      {showReportPanel && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowReportPanel(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1c1e21]">Report post</h3>
              <button onClick={() => setShowReportPanel(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="py-2">
              {['Spam', 'Nudity', 'Hate speech or symbols', 'False information', 'Bullying or harassment', 'Something else'].map((reason) => (
                <button
                  key={reason}
                  onClick={handleReportReason}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-[#1c1e21] cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Block confirmation */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowBlockConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1c1e21] mb-2">Block {authorFirstName}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Once you block {authorFirstName}, you won't be able to see or contact each other on Facebook anymore.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm cursor-pointer"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OptionMenuItem: React.FC<{
  icon: string;
  title: React.ReactNode;
  subtitle?: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, title, subtitle, onClick, danger }) => (
  <button onClick={onClick} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-100 text-left cursor-pointer">
    <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${danger ? 'text-red-600' : 'text-[#050505]'}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className={`block font-semibold text-[14px] ${danger ? 'text-red-600' : 'text-[#1c1e21]'}`}>{title}</span>
      {subtitle && <span className="block text-[12px] text-gray-500 mt-0.5">{subtitle}</span>}
    </span>
  </button>
);

const CommentRow: React.FC<{
  comment: Comment;
  onProfileClick?: (userId: string) => void;
  getInitials: (name: string) => string;
  renderText: (text: string, mentions?: CommentMention[]) => React.ReactNode;
}> = ({ comment, onProfileClick, getInitials, renderText }) => {
  const avatar = useUserAvatar(comment.userId, comment.userAvatar);

  return (
    <div className="flex items-start gap-2 text-xs">
      <div 
        className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
        onClick={() => onProfileClick?.(comment.userId)}
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          getInitials(comment.userDisplayName)
        )}
      </div>
      <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 flex-1">
        <span 
          className="font-semibold block text-[#1c1e21] cursor-pointer hover:underline"
          onClick={() => onProfileClick?.(comment.userId)}
        >
          {comment.userDisplayName}
        </span>
        <p className="text-gray-700 mt-0.5">{renderText(comment.content || comment.text || '', comment.mentions)}</p>
      </div>
    </div>
  );
};