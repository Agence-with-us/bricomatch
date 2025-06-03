"use strict";
// config/firebase.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilitiesCollection = exports.usersCollection = exports.notificationsCollection = exports.appointmentsCollection = exports.getAuth = exports.getStorage = exports.getFirestore = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (firebase_admin_1.default.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase initialized');
}
// Export services directly
const getFirestore = () => firebase_admin_1.default.firestore();
exports.getFirestore = getFirestore;
const getStorage = () => firebase_admin_1.default.storage();
exports.getStorage = getStorage;
const getAuth = () => firebase_admin_1.default.auth();
exports.getAuth = getAuth;
exports.appointmentsCollection = (0, exports.getFirestore)().collection('appointments');
exports.notificationsCollection = (0, exports.getFirestore)().collection('notifications');
exports.usersCollection = (0, exports.getFirestore)().collection('users');
exports.availabilitiesCollection = (0, exports.getFirestore)().collection('availabilities');
