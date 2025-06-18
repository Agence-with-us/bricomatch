import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '../types';
import { createStripeConnectAccount, deleteMyAccount } from '../controllers/userController';

const router = express.Router();


router.post('/create-stripe-connect', authenticate, authorizeRoles(UserRole.PRO), createStripeConnectAccount);
router.delete('/delete-my-account', authenticate, deleteMyAccount);

export default router;