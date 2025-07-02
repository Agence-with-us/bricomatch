import express from 'express';
import { sendChatMessageNotificationController } from '../controllers/notificationController';

const router = express.Router();

// Route pour envoyer une notification push lors d'un message de chat
router.post('/chat-message', sendChatMessageNotificationController);

export default router; 