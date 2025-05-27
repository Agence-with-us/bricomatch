import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeRedis } from './config/redis';
import { initializeStripe } from './config/stripe';
import userRoutes from './routes/userRoutes';
import serviceRoutes from './routes/serviceRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import invoiceRoutes from './routes/invoiceRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 20) + "..."); // Pour ne pas afficher toute la clé

// Initialize services
import './config/firebase'; // This alone initializes Firebase
import { clientErrorMiddleware } from './middleware/clientErrorMiddleware';
import { CronService } from './services/cronService';
initializeRedis();
initializeStripe();

// Démarrer les jobs cron
const cronService = CronService.getInstance();
cronService.startAllJobs();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Bricomatch API is running' });
});

// Error handling middleware
app.use(clientErrorMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;