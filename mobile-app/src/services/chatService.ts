import { ref, push, set, get, update, query, orderByChild, equalTo } from 'firebase/database';
import { UserLocal, UserRole } from '../store/users/types';
import { database } from '../config/firebase.config';

/**
 * Create a new chat between two users
 * @param currentUserId - ID of the current user
 * @param otherUserId - ID of the other user
 * @param currentUserRole - Role of the current user (PRO or PARTICULIER)
 * @param otherUserRole - Role of the other user (PRO or PARTICULIER)
 * @returns The ID of the created chat
 */
export const createChat = async (
  currentUserId: string,
  otherUserId: string,
  currentUserRole: UserRole,
  otherUserRole: UserRole
): Promise<string> => {
  try {
    // Check if a chat already exists between these users
    const existingChatId = await findExistingChat(currentUserId, otherUserId);
    if (existingChatId) {
      return existingChatId;
    }

    // Create a new chat
    const timestamp = Date.now();
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    const chatId = newChatRef.key as string;

    // Set up the chat data
    const chatData = {
      participants: {
        [currentUserId]: {
          role: currentUserRole,
          lastRead: timestamp
        },
        [otherUserId]: {
          role: otherUserRole,
          lastRead: 0
        }
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Save the chat data
    await set(newChatRef, chatData);

    // Add references to this chat in each user's chats list
    await set(ref(database, `user-chats/${currentUserId}/${chatId}`), true);
    await set(ref(database, `user-chats/${otherUserId}/${chatId}`), true);

    return chatId;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

/**
 * Find an existing chat between two users
 * @param userId1 - ID of the first user
 * @param userId2 - ID of the second user
 * @returns The chat ID if found, null otherwise
 */
export const findExistingChat = async (
  userId1: string,
  userId2: string
): Promise<string | null> => {
  try {
    // Get all chats for the first user
    const userChatsRef = ref(database, `user-chats/${userId1}`);
    const userChatsSnapshot = await get(userChatsRef);
    
    if (!userChatsSnapshot.exists()) {
      return null;
    }

    const userChats = userChatsSnapshot.val();
    const chatIds = Object.keys(userChats);

    // Check each chat to see if the second user is a participant
    for (const chatId of chatIds) {
      const chatRef = ref(database, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);
      
      if (chatSnapshot.exists()) {
        const chat = chatSnapshot.val();
        if (chat.participants && chat.participants[userId2]) {
          return chatId;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding existing chat:', error);
    return null;
  }
};

/**
 * Get user's total unread messages count across all chats
 * @param userId - ID of the user
 * @returns Total number of unread messages
 */
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    let totalUnread = 0;
    
    // Get all chats for the user
    const userChatsRef = ref(database, `user-chats/${userId}`);
    const userChatsSnapshot = await get(userChatsRef);
    
    if (!userChatsSnapshot.exists()) {
      return 0;
    }

    const userChats = userChatsSnapshot.val();
    const chatIds = Object.keys(userChats);

    // For each chat, count unread messages
    for (const chatId of chatIds) {
      const chatRef = ref(database, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);
      
      if (chatSnapshot.exists()) {
        const chat = chatSnapshot.val();
        const userLastRead = chat.participants[userId]?.lastRead || 0;
        
        // Get messages that are newer than the user's last read timestamp
        const messagesRef = ref(database, `messages/${chatId}`);
        const messagesSnapshot = await get(messagesRef);
        
        if (messagesSnapshot.exists()) {
          const messages = messagesSnapshot.val();
          
          Object.values(messages).forEach((message: any) => {
            if (message.senderId !== userId && message.timestamp > userLastRead) {
              totalUnread++;
            }
          });
        }
      }
    }

    return totalUnread;
  } catch (error) {
    console.error('Error getting total unread count:', error);
    return 0;
  }
};

/**
 * Send a message in a chat
 * @param chatId - ID of the chat
 * @param senderId - ID of the sender
 * @param text - Text message content
 * @param imageUrl - Optional image URL
 * @returns ID of the sent message
 */
export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  text?: string, 
  imageUrl?: string
): Promise<string> => {
  try {
    if (!text && !imageUrl) {
      throw new Error('Message must have either text or image');
    }

    const timestamp = Date.now();
    const messagesRef = ref(database, `messages/${chatId}`);
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key as string;

    // Create message data
    const messageData: any = {
      senderId,
      timestamp,
      read: false
    };

    if (text) {
      messageData.text = text;
    }

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    // Save message
    await set(newMessageRef, messageData);

    // Update chat last message and timestamp
    const chatRef = ref(database, `chats/${chatId}`);
    await update(chatRef, {
      lastMessage: {
        text: text || 'Image',
        timestamp,
        senderId
      },
      updatedAt: timestamp
    });

    return messageId;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Initialize a chat with a professional
 * @param currentUserId - ID of the current user (PARTICULIER)
 * @param proUserId - ID of the professional user
 * @returns The chat ID
 */
export const initializeChatWithPro = async (
  currentUserId: string,
  proUserId: string
): Promise<string> => {
  // Get user roles from database or context
  const userRef = ref(database, `users/${currentUserId}`);
  const proRef = ref(database, `users/${proUserId}`);
  
  const [userSnapshot, proSnapshot] = await Promise.all([
    get(userRef),
    get(proRef)
  ]);
  
  if (!userSnapshot.exists() || !proSnapshot.exists()) {
    throw new Error('One or both users do not exist');
  }
  
  const userData = userSnapshot.val() as UserLocal;
  const proData = proSnapshot.val() as UserLocal;
  
  // Create or get existing chat
  return createChat(currentUserId, proUserId, userData.role as UserRole.PARTICULIER, proData.role as UserRole.PRO);
};

/**
 * Mark all messages in a chat as read
 * @param chatId - ID of the chat
 * @param userId - ID of the user marking as read
 */
export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    const timestamp = Date.now();
    const userChatRef = ref(database, `chats/${chatId}/participants/${userId}`);
    await update(userChatRef, {
      lastRead: timestamp
    });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    throw error;
  }
};