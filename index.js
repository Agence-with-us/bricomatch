const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).send('Non autorisé');

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).send('Token invalide');
    }
};

// Firebase Admin SDK init
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
const db = admin.firestore();

// Route sécurisée
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

app.listen(3000, () => {
    console.log('Backend démarré sur port 3000');
});
