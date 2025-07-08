const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fetch = require('node-fetch'); // ajoute si node < 18 (sinon natif)
const app = express();

app.use(express.json());
app.use(cors({
    origin: [
        "https://dashboard-2019.brico-match.com",
        "http://localhost:3000"
    ],
    credentials: true
}));
// Initialisation Firebase Admin SDK
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

// Middleware d’authentification
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

// Middleware admin
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).send('Non autorisé');

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        if (!decoded.admin) {
            return res.status(403).send('Accès refusé : admin requis');
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).send('Token invalide');
    }
};

// Route pour vérifier admin via Firebase (existant)
app.get('/api/checkAdmin', authenticateAdmin, (req, res) => {
    res.json({ ok: true, uid: req.user.uid });
});

// **Exemple** route qui appelle une API externe configurée via .env
app.get('/api/externalCheckAdmin', async (req, res) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).send('Non autorisé');

    try {
        const response = await fetch(`${apiBaseUrl}/api/checkAdmin`, {
            headers: { Authorization: authHeader },
        });

        if (!response.ok) {
            return res.status(response.status).send('Erreur API externe');
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});
// Route sécurisée
app.get('/api/users', authenticate, async (req, res) => {
    if (!req.user.admin) {
        return res.status(403).send('Accès refusé : admin requis');
    }

    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

app.get('/api/invoices/stats', authenticate, async (req, res) => {
    try {
        const usersSnapshot = await db.collection('users').where('role', '==', 'PRO').get();
        const proUserIds = usersSnapshot.docs.map(doc => doc.id);

        const invoicesSnapshot = await db.collection('invoices').get();

        let total = 0;
        let vat = 0;
        let platform = 0;
        let count = 0;

        invoicesSnapshot.forEach(doc => {
            const data = doc.data();
            if (proUserIds.includes(data.userId)) {
                total += data.totalAmount || 0;
                vat += data.vatAmount || 0;
                platform += data.platformFee || 0;
                count++;
            }
        });

        res.json({
            totalAmount: total,
            vatAmount: vat,
            platformFees: platform,
            invoiceCount: count,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur serveur');
    }
});

app.get('/api/invoices', authenticate, async (req, res) => {
    try {
        const { userId, userRole, lastInvoiceId } = req.query;

        let invoicesQuery = db.collection('invoices');

        if (userId) {
            invoicesQuery = invoicesQuery.where('userId', '==', userId);
        }

        if (userRole) {
            invoicesQuery = invoicesQuery.where('userRole', '==', userRole);
        }

        invoicesQuery = invoicesQuery.orderBy('invoiceNumber', 'desc').limit(20);

        if (lastInvoiceId) {
            const lastDoc = await db.collection('invoices').doc(lastInvoiceId).get();
            if (lastDoc.exists) {
                invoicesQuery = invoicesQuery.startAfter(lastDoc);
            }
        }

        const snapshot = await invoicesQuery.get();

        const invoices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = snapshot.docs[snapshot.docs.length - 1]?.id || null;

        res.json({
            invoices,
            lastVisible,
            hasMore: !snapshot.empty,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur serveur');
    }
});


app.get('/api/appointments/count', authenticateAdmin, async (req, res) => {
    try {
        const { status, from, to, userId, userType } = req.query;

        let q = db.collection('appointments');
        const conditions = [];

        if (status && status !== 'all') {
            conditions.push(['status', '==', status]);
        }

        if (userId && userType) {
            const userField = userType === 'client' ? 'clientId' : 'proId';
            conditions.push([userField, '==', userId]);
        }

        if (from) {
            conditions.push(['dateTime', '>=', from]);
        }

        if (to) {
            conditions.push(['dateTime', '<=', to]);
        }

        if (conditions.length) {
            conditions.forEach(([field, op, val]) => {
                q = q.where(field, op, val);
            });
        }

        const snapshot = await q.get();
        res.json({ count: snapshot.size });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});
app.get('/api/appointments/:id', authenticate, async (req, res) => {
    const appointmentId = req.params.id;
    const uid = req.user.uid;

    try {
        // Récupérer le rdv
        const apptDoc = await db.collection('appointments').doc(appointmentId).get();

        if (!apptDoc.exists) {
            return res.status(404).send('Rendez-vous introuvable');
        }

        const apptData = apptDoc.data();

        // Vérifier que l'utilisateur a accès (admin ou client/pro concerné)
        if (
            !req.user.admin && // admin flag dans token custom claim
            uid !== apptData.clientId &&
            uid !== apptData.proId
        ) {
            return res.status(403).send('Accès refusé');
        }

        // Récupérer client et pro
        const [clientDoc, proDoc] = await Promise.all([
            db.collection('users').doc(apptData.clientId).get(),
            db.collection('users').doc(apptData.proId).get(),
        ]);

        res.json({
            appointment: { id: apptDoc.id, ...apptData },
            client: clientDoc.exists ? clientDoc.data() : null,
            pro: proDoc.exists ? proDoc.data() : null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur serveur');
    }
});
app.get('/api/users/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists) return res.status(404).send('Utilisateur introuvable');
        res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

app.get('/api/notifications/unread-count', authenticate, async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('processed', '==', false)
            .get();

        res.json({ unreadCount: snapshot.size });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

app.listen(3000, () => {
    console.log('Backend démarré sur port 3000');
});
