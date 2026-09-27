import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { uploadImageToCloudinary } from './cloudinaryService';
import { EmojiPicker } from './EmojiPicker';
import { useUserAvatar, DEFAULT_AVATAR } from './useUserAvatar';

import VoiceCall from '../../assets/Icons/VoiceCall.png';
import VideoCall from '../../assets/Icons/VideoCall.png';
import VoiceMessage from '../../assets/Icons/VoiceMessage.png';
import Photos from '../../assets/Icons/Photos.png';
import Sticker from '../../assets/Icons/Sticker.png';
import GIF from '../../assets/Icons/GIF.png';
import Emoji from '../../assets/Icons/Emoji.png';
import Like from '../../assets/Icons/Like.png';

interface FloatingChatBoxProps {
  friend: {
    uid: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  onClose: () => void;
}

export const FloatingChatBox: React.FC<FloatingChatBoxProps> = ({
  friend,
  onClose,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = auth.currentUser?.uid;
  const friendAvatar = useUserAvatar(friend.uid, friend.profileImage);

  useEffect(() => {
    if (!currentUserId) return;

    const chatId = [currentUserId, friend.uid].sort().join('_');

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
        });
      }, 100);
    });

    return () => unsubscribe();
  }, [friend.uid, currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !currentUserId) return;

    const chatId = [currentUserId, friend.uid].sort().join('_');

    const textToSend = newMessage;

    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUserId,
        text: textToSend,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUserId) return;

    const chatId = [currentUserId, friend.uid].sort().join('_');

    setIsUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUserId,
        text: '',
        imageUrl: url,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) {
      setNewMessage((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(next);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + emoji.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="fixed bottom-12 md:bottom-0 right-0 sm:right-6 z-50 flex h-[70vh] sm:h-[455px] w-[92vw] sm:w-[328px] max-w-[328px] flex-col overflow-hidden rounded-t-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        
        <div className="flex min-w-0 items-center gap-2">
          
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-sm font-bold text-white">
              {friendAvatar && friendAvatar !== DEFAULT_AVATAR ? (
                <img
                  src={friendAvatar}
                  alt={`${friend.firstName} ${friend.lastName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                friend.firstName?.[0]?.toUpperCase()
              )}
            </div>

            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#31a24c]" />
          </div>

          {/* Name and status */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-0.5">
              <span className="max-w-[190px] truncate text-[14px] font-bold text-[#1c1e21]">
                {friend.firstName} {friend.lastName}
              </span>

              <span className="material-symbols-outlined text-[16px] text-[#a85be8]">
                expand_more
              </span>
            </div>

            <span className="text-[12px] text-[#65676b]">
              Active now
            </span>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex flex-shrink-0 items-center gap-3 text-[#b15ce5]">
          
          <button
            type="button"
            className="transition hover:opacity-70"
          >
            <img
              src={VoiceCall}
              alt="Voice call"
              className="h-[18px] w-[18px] object-contain"
            />
          </button>

          <button
            type="button"
            className="transition hover:opacity-70"
          >
            <img
              src={VideoCall}
              alt="Video call"
              className="h-[18px] w-[18px] object-contain"
            />
          </button>

          <button
            type="button"
            className="text-[20px] font-bold leading-none transition hover:opacity-70"
          >
            −
          </button>

          <button
            onClick={onClose}
            type="button"
            className="flex h-6 w-6 items-center justify-center transition hover:opacity-70"
          >
            <span className="material-symbols-outlined text-[22px]">
              close
            </span>
          </button>
        </div>
      </div>

      {/* ================= MESSAGES ================= */}
      <div className="flex-1 space-y-1.5 overflow-y-auto bg-white px-3 py-2.5 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-1.5 ${
                isMe ? 'justify-end' : 'justify-start'
              }`}
            >
              
              {/* Friend avatar */}
              {!isMe && (
                <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-gray-300">
                  {friendAvatar && friendAvatar !== DEFAULT_AVATAR ? (
                    <img
                      src={friendAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                      {friend.firstName?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Message bubble */}
              {msg.imageUrl ? (
                <div
                  className={`max-w-[75%] overflow-hidden ${
                    isMe ? 'rounded-[16px] rounded-br-[4px]' : 'rounded-[16px] rounded-bl-[4px]'
                  }`}
                >
                  <img src={msg.imageUrl} alt="Sent photo" className="max-h-52 w-full object-cover" />
                  {msg.text && (
                    <div
                      className={`px-3 py-1.5 text-[13px] leading-[1.35] ${
                        isMe
                          ? 'bg-gradient-to-br from-[#913de4] to-[#3f5ed7] text-white'
                          : 'bg-[#e4e6eb] text-[#1c1e21]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`max-w-[75%] break-words px-3 py-1.5 text-[13px] leading-[1.35] ${
                    isMe
                      ? 'rounded-[16px] rounded-br-[4px] bg-gradient-to-br from-[#913de4] to-[#3f5ed7] text-white'
                      : 'rounded-[16px] rounded-bl-[4px] bg-[#e4e6eb] text-[#1c1e21]'
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

{/* ================= INPUT AREA ================= */}
<form
  onSubmit={handleSend}
  className="flex-shrink-0 border-t border-gray-200 bg-white px-2 py-2"
>
  <div className="flex w-full min-w-0 items-center gap-0.5">
    
    {/* Voice */}
    <button
      type="button"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb]"
    >
      <img
        src={VoiceMessage}
        alt="Voice message"
        className="h-[18px] w-[18px] object-contain"
      />
    </button>

    {/* Photos */}
    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleSendPhoto}
    />
    <button
      type="button"
      onClick={() => photoInputRef.current?.click()}
      disabled={isUploadingPhoto}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb] disabled:opacity-50"
      title="Send photo"
    >
      <img
        src={Photos}
        alt="Photos"
        className="h-[18px] w-[18px] object-contain"
      />
    </button>

    {/* Sticker */}
    <button
      type="button"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb]"
    >
      <img
        src={Sticker}
        alt="Sticker"
        className="h-[18px] w-[18px] object-contain"
      />
    </button>

    {/* GIF */}
    <button
      type="button"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb]"
    >
      <img
        src={GIF}
        alt="GIF"
        className="h-[18px] w-[18px] object-contain"
      />
    </button>

    {/* Input */}
    <div className="ml-0.5 flex min-w-0 flex-1 items-center rounded-full bg-[#f0f2f5] px-3">
      <input
        ref={messageInputRef}
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Aa"
        className="h-8 min-w-0 flex-1 bg-transparent text-[14px] text-[#1c1e21] outline-none placeholder:text-[#65676b]"
      />

      {/* Emoji */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb]"
        >
          <img
            src={Emoji}
            alt="Emoji"
            className="h-[18px] w-[18px] object-contain"
          />
        </button>
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={(emoji) => handleInsertEmoji(emoji)}
            onClose={() => setShowEmojiPicker(false)}
            className="right-0 bottom-full mb-2"
          />
        )}
      </div>
    </div>

    {/* Send / Like */}
    {newMessage.trim() ? (
      <button
        type="submit"
        className="ml-0.5 flex h-8 flex-shrink-0 items-center justify-center rounded-full px-2.5 text-[13px] font-semibold text-[#7b45e5] transition hover:bg-[#e4e6eb]"
      >
        Send
      </button>
    ) : (
      <button
        type="button"
        className="ml-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-[#e4e6eb]"
      >
        <img
          src={Like}
          alt="Like"
          className="h-5 w-5 object-contain"
        />
      </button>
    )}
  </div>
</form>
    </div>
  );
};