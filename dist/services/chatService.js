"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markChatAsRead = exports.getChatDetails = exports.createOrActivateChat = void 0;
// services/chatService.ts (Backend avec SDK Admin)
const database_1 = require("firebase-admin/database");
const firebase_1 = require("../config/firebase");
/**
 * Créer ou activer une discussion entre un PRO et un particulier
 */
const createOrActivateChat = (proId, clientId, appointmentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Vérifier s'il existe déjà une discussion entre ces deux utilisateurs
        const existingChatId = yield findExistingChat(proId, clientId);
        if (existingChatId) {
            // Réactiver la discussion existante
            yield activateExistingChat(existingChatId, appointmentId);
            return existingChatId;
        }
        // 2. Créer une nouvelle discussion
        const newChatId = yield createNewChat(proId, clientId, appointmentId);
        return newChatId;
    }
    catch (error) {
        console.error('Erreur lors de la création/activation du chat:', error);
        throw error;
    }
});
exports.createOrActivateChat = createOrActivateChat;
/**
 * Chercher une discussion existante entre deux utilisateurs
 */
const findExistingChat = (proId, clientId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupérer les chats du PRO
        const proChatsRef = (0, database_1.getDatabase)().ref(`user-chats/${proId}`);
        const proChatsSnapshot = yield proChatsRef.once('value');
        if (!proChatsSnapshot.exists()) {
            return null;
        }
        const proChatIds = Object.keys(proChatsSnapshot.val());
        // Vérifier chaque chat pour voir s'il inclut le client
        for (const chatId of proChatIds) {
            const chatRef = (0, database_1.getDatabase)().ref(`chats/${chatId}`);
            const chatSnapshot = yield chatRef.once('value');
            const chatData = chatSnapshot.val();
            if (chatData && chatData.participants) {
                const participantIds = Object.keys(chatData.participants);
                if (participantIds.includes(proId) && participantIds.includes(clientId)) {
                    return chatId;
                }
            }
        }
        return null;
    }
    catch (error) {
        console.error('Erreur lors de la recherche de chat existant:', error);
        return null;
    }
});
/**
 * Activer une discussion existante
 */
const activateExistingChat = (chatId, appointmentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chatRef = (0, database_1.getDatabase)().ref(`chats/${chatId}`);
        const chatSnapshot = yield chatRef.once('value');
        yield chatRef.update({
            isActive: true,
            appointmentId,
            updatedAt: database_1.ServerValue.TIMESTAMP
        });
        // Ajouter un message système pour indiquer la réactivation
        yield addSystemMessage(chatId, 'La discussion a été réactivée suite à la confirmation de votre rendez-vous.');
    }
    catch (error) {
        console.error('Erreur lors de l\'activation du chat:', error);
        throw error;
    }
});
/**
 * Créer une nouvelle discussion
 */
const createNewChat = (proId, clientId, appointmentId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Récupérer les informations des utilisateurs depuis Firestore
        const [proDoc, clientDoc] = yield Promise.all([
            (0, firebase_1.getFirestore)().collection('users').doc(proId).get(),
            (0, firebase_1.getFirestore)().collection('users').doc(clientId).get()
        ]);
        const proData = proDoc.exists ? proDoc.data() : null;
        const clientData = clientDoc.exists ? clientDoc.data() : null;
        if (!proData || !clientData) {
            throw new Error('Impossible de récupérer les données des utilisateurs');
        }
        // Créer le chat dans Realtime getDatabase()
        const chatsRef = (0, database_1.getDatabase)().ref('chats');
        const newChatRef = chatsRef.push();
        const chatId = newChatRef.key;
        const chatData = {
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
        yield newChatRef.set(chatData);
        // Ajouter les références dans user-chats pour chaque utilisateur
        const updates = {
            [`user-chats/${proId}/${chatId}`]: true,
            [`user-chats/${clientId}/${chatId}`]: true
        };
        yield (0, database_1.getDatabase)().ref().update(updates);
        // Ajouter un message de bienvenue
        const welcomeMessage = `Bonjour ! Cette discussion a été créée suite à la confirmation de votre rendez-vous. ${proData.nom} ${proData.prenom} et ${clientData.nom} ${clientData.prenom}, vous pouvez maintenant échanger directement.`;
        yield addSystemMessage(chatId, welcomeMessage);
        return chatId;
    }
    catch (error) {
        console.error('Erreur lors de la création du chat:', error);
        throw error;
    }
});
/**
 * Ajouter un message système
 */
const addSystemMessage = (chatId, text) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messagesRef = (0, database_1.getDatabase)().ref(`messages/${chatId}`);
        const newMessageRef = messagesRef.push();
        const messageData = {
            id: newMessageRef.key,
            text,
            senderId: 'system',
            timestamp: Date.now(),
            type: 'system'
        };
        yield newMessageRef.set(messageData);
        // Mettre à jour le dernier message du chat
        const chatRef = (0, database_1.getDatabase)().ref(`chats/${chatId}`);
        yield chatRef.update({
            lastMessage: {
                text,
                senderId: 'system',
                timestamp: Date.now()
            },
            updatedAt: Date.now()
        });
    }
    catch (error) {
        console.error('Erreur lors de l\'ajout du message système:', error);
        throw error;
    }
});
/**
 * Récupérer les détails d'une discussion
 */
const getChatDetails = (chatId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const chatRef = (0, database_1.getDatabase)().ref(`chats/${chatId}`);
        const snapshot = yield chatRef.once('value');
        return snapshot.exists() ? Object.assign(Object.assign({}, snapshot.val()), { id: chatId }) : null;
    }
    catch (error) {
        console.error('Erreur lors de la récupération des détails du chat:', error);
        return null;
    }
});
exports.getChatDetails = getChatDetails;
/**
 * Marquer une discussion comme lue pour un utilisateur
 */
const markChatAsRead = (chatId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const participantRef = (0, database_1.getDatabase)().ref(`chats/${chatId}/participants/${userId}/lastRead`);
        yield participantRef.set(Date.now());
    }
    catch (error) {
        console.error('Erreur lors du marquage comme lu:', error);
        throw error;
    }
});
exports.markChatAsRead = markChatAsRead;
