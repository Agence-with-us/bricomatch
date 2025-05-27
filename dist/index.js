"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("./config/redis");
const stripe_1 = require("./config/stripe");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const appointmentRoutes_1 = __importDefault(require("./routes/appointmentRoutes"));
const invoiceRoutes_1 = __importDefault(require("./routes/invoiceRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY:", ((_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + "..."); // Pour ne pas afficher toute la clé
// Initialize services
require("./config/firebase"); // This alone initializes Firebase
const clientErrorMiddleware_1 = require("./middleware/clientErrorMiddleware");
const cronService_1 = require("./services/cronService");
(0, redis_1.initializeRedis)();
(0, stripe_1.initializeStripe)();
// Démarrer les jobs cron
const cronService = cronService_1.CronService.getInstance();
cronService.startAllJobs();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
// Routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/api/appointments', appointmentRoutes_1.default);
app.use('/api/invoices', invoiceRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Bricomatch API is running' });
});
// Error handling middleware
app.use(clientErrorMiddleware_1.clientErrorMiddleware);
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
exports.default = app;
