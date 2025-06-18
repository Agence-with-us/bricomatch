import { useState, useEffect } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { database } from '../../../config/firebase.config';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

/**
 * Custom hook for tracking unread messages across all chats
 * @returns An object containing unread message counts and loading status
 */
export const useUnreadMessages = () => {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByChat, setUnreadByChat] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userChatsRef = ref(database, `user-chats/${currentUser.id}`);

    const unsubscribe = onValue(userChatsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setTotalUnread(0);
        setUnreadByChat({});
        setLoading(false);
        return;
      }

      const chatIds = Object.keys(snapshot.val());
      let newTotalUnread = 0;
      const newUnreadByChat: Record<string, number> = {};

      // For each chat, set up a listener for unread messages
      await Promise.all(chatIds.map(async (chatId) => {
        try {
          // Get user's last read timestamp for this chat
          const userChatRef = ref(database, `chats/${chatId}/participants/${currentUser.id}`);
          const userChatSnapshot = await get(userChatRef);
          const lastRead = userChatSnapshot.exists() ? userChatSnapshot.val().lastRead || 0 : 0;

          // Get all messages in this chat
          const messagesRef = ref(database, `messages/${chatId}`);
          const messagesSnapshot = await get(messagesRef);
          
          if (messagesSnapshot.exists()) {
            const messages = messagesSnapshot.val();
            let chatUnreadCount = 0;
            
            // Count unread messages
            Object.values(messages).forEach((message: any) => {
              if (message.senderId !== currentUser.id && message.timestamp > lastRead) {
                chatUnreadCount++;
              }
            });
            
            newUnreadByChat[chatId] = chatUnreadCount;
            newTotalUnread += chatUnreadCount;
          } else {
            newUnreadByChat[chatId] = 0;
          }
        } catch (error) {
          console.error(`Error counting unread messages for chat ${chatId}:`, error);
          newUnreadByChat[chatId] = 0;
        }
      }));

      setUnreadByChat(newUnreadByChat);
      setTotalUnread(newTotalUnread);
      setLoading(false);
    });

    return () => {
      off(userChatsRef);
    };
  }, [currentUser]);

  return {
    totalUnread,
    unreadByChat,
    loading
  };
};