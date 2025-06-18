// config/firebase.ts

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (admin.apps.length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
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
export const getFirestore = (): admin.firestore.Firestore => admin.firestore();
export const getStorage = (): admin.storage.Storage => admin.storage();
export const getAuth = (): admin.auth.Auth => admin.auth();

export const appointmentsCollection = getFirestore().collection('appointments');
export const notificationsCollection = getFirestore().collection('notifications');
export const usersCollection = getFirestore().collection('users');
export const availabilitiesCollection = getFirestore().collection('availabilities');

