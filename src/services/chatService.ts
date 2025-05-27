// services/chatService.ts (Backend avec SDK Admin)
import { getDatabase, ServerValue } from 'firebase-admin/database';
import { getFirestore } from '../config/firebase';

export interface ChatParticipant {
  id: string;
  lastRead: number;
  joinedAt: number;
}

export interface ChatData {
  participants: { [userId: string]: ChatParticipant };
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  appointmentId?: string; // Lien avec le RDV
  isActive: boolean;
}

/**
 * Créer ou activer une discussion entre un PRO et un particulier
 */
export const createOrActivateChat = async (
  proId: string, 
  clientId: string, 
  appointmentId: string
): Promise<string> => {
  try {
    // 1. Vérifier s'il existe déjà une discussion entre ces deux utilisateurs
    const existingChatId = await findExistingChat(proId, clientId);
    
    if (existingChatId) {
      // Réactiver la discussion existante
      await activateExistingChat(existingChatId, appointmentId);
      return existingChatId;
    }

    // 2. Créer une nouvelle discussion
    const newChatId = await createNewChat(proId, clientId, appointmentId);
    return newChatId;

  } catch (error) {
    console.error('Erreur lors de la création/activation du chat:', error);
    throw error;
  }
};

/**
 * Chercher une discussion existante entre deux utilisateurs
 */
const findExistingChat = async (proId: string, clientId: string): Promise<string | null> => {
  try {
    // Récupérer les chats du PRO
    const proChatsRef = getDatabase().ref(`user-chats/${proId}`);
    const proChatsSnapshot = await proChatsRef.once('value');
    
    if (!proChatsSnapshot.exists()) {
      return null;
    }

    const proChatIds = Object.keys(proChatsSnapshot.val());

    // Vérifier chaque chat pour voir s'il inclut le client
    for (const chatId of proChatIds) {
      const chatRef = getDatabase().ref(`chats/${chatId}`);
      const chatSnapshot = await chatRef.once('value');
      const chatData = chatSnapshot.val();

      if (chatData && chatData.participants) {
        const participantIds = Object.keys(chatData.participants);
        if (participantIds.includes(proId) && participantIds.includes(clientId)) {
          return chatId;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la recherche de chat existant:', error);
    return null;
  }
};

/**
 * Activer une discussion existante
 */
const activateExistingChat = async (chatId: string, appointmentId: string): Promise<void> => {
  try {
    const chatRef = getDatabase().ref(`chats/${chatId}`);
    const chatSnapshot = await chatRef.once('value');
    
    await chatRef.update({
      isActive: true,
      appointmentId,
      updatedAt: ServerValue.TIMESTAMP
    });

    // Ajouter un message système pour indiquer la réactivation
    await addSystemMessage(chatId, 'La discussion a été réactivée suite à la confirmation de votre rendez-vous.');
    
  } catch (error) {
    console.error('Erreur lors de l\'activation du chat:', error);
    throw error;
  }
};

/**
 * Créer une nouvelle discussion
 */
const createNewChat = async (proId: string, clientId: string, appointmentId: string): Promise<string> => {
  try {
    // Récupérer les informations des utilisateurs depuis Firestore
    const [proDoc, clientDoc] = await Promise.all([
      getFirestore().collection('users').doc(proId).get(),
      getFirestore().collection('users').doc(clientId).get()
    ]);

    const proData = proDoc.exists ? proDoc.data() : null;
    const clientData = clientDoc.exists ? clientDoc.data() : null;

    if (!proData || !clientData) {
      throw new Error('Impossible de récupérer les données des utilisateurs');
    }

    // Créer le chat dans Realtime getDatabase()
    const chatsRef = getDatabase().ref('chats');
    const newChatRef = chatsRef.push();
    const chatId = newChatRef.key!;

    const chatData: ChatData = {
      participants: {
        [proId]: {
          id: proId,
          lastRead: Date.now(),
          joinedAt: Date.now()
        },
        [clientId]: {
          id: clientId,
          lastRead: Date.now(),
          joinedAt: Date.now()
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      appointmentId,
      isActive: true
    };

    await newChatRef.set(chatData);

    // Ajouter les références dans user-chats pour chaque utilisateur
    const updates: Record<string, boolean> = {
      [`user-chats/${proId}/${chatId}`]: true,
      [`user-chats/${clientId}/${chatId}`]: true
    };
    
    await getDatabase().ref().update(updates);

    // Ajouter un message de bienvenue
    const welcomeMessage = `Bonjour ! Cette discussion a été créée suite à la confirmation de votre rendez-vous. ${proData.nom} ${proData.prenom} et ${clientData.nom} ${clientData.prenom}, vous pouvez maintenant échanger directement.`;
    
    await addSystemMessage(chatId, welcomeMessage);

    return chatId;

  } catch (error) {
    console.error('Erreur lors de la création du chat:', error);
    throw error;
  }
};

/**
 * Ajouter un message système
 */
const addSystemMessage = async (chatId: string, text: string): Promise<void> => {
  try {
    const messagesRef = getDatabase().ref(`messages/${chatId}`);
    const newMessageRef = messagesRef.push();
    
    const messageData = {
      id: newMessageRef.key,
      text,
      senderId: 'system',
      timestamp: Date.now(),
      type: 'system'
    };

    await newMessageRef.set(messageData);

    // Mettre à jour le dernier message du chat
    const chatRef = getDatabase().ref(`chats/${chatId}`);
    await chatRef.update({
      lastMessage: {
        text,
        senderId: 'system',
        timestamp: Date.now()
      },
      updatedAt: Date.now()
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du message système:', error);
    throw error;
  }
};

/**
 * Récupérer les détails d'une discussion
 */
export const getChatDetails = async (chatId: string): Promise<ChatData | null> => {
  try {
    const chatRef = getDatabase().ref(`chats/${chatId}`);
    const snapshot = await chatRef.once('value');
    
    return snapshot.exists() ? { ...snapshot.val(), id: chatId } : null;
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du chat:', error);
    return null;
  }
};

/**
 * Marquer une discussion comme lue pour un utilisateur
 */
export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    const participantRef = getDatabase().ref(`chats/${chatId}/participants/${userId}/lastRead`);
    await participantRef.set(Date.now());
  } catch (error) {
    console.error('Erreur lors du marquage comme lu:', error);
    throw error;
  }
};