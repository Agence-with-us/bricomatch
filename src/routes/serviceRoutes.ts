import express from 'express';
import { getAllServices, getServiceById } from '../controllers/serviceController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get all services
router.get('/', authenticate, getAllServices);

// Get service by ID
router.get('/:id', authenticate, getServiceById);

export default router;