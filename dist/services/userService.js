"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ensureDeletedAccountExists = exports.deleteUserAccount = exports.getUsersByIds = exports.getUserById = void 0;
const firebase_1 = require("../config/firebase");
const ClientError_1 = require("../helpers/ClientError");
// import { getCachedData, setCachedData } from '../config/redis';
const firebase_admin_1 = __importStar(require("firebase-admin"));
// Get user by ID
//@ts-ignore
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // // Check cache first
        // const cacheKey = `user:${id}`;
        // const cachedUser = await getCachedData<UserLocal>(cacheKey);
        // if (cachedUser) {
        //   return cachedUser;
        // }
        // // If not in cache, fetch from Firestore
        const doc = yield firebase_1.usersCollection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const user = Object.assign({ id: doc.id }, doc.data());
        // // Store in cache
        // await setCachedData(cacheKey, user);
        return user;
    }
    catch (error) {
        console.error(`Error fetching user with ID ${id}:`, error);
        throw error;
    }
});
exports.getUserById = getUserById;
// Get multiple users by their IDs
//@ts-ignore
const getUsersByIds = (ids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // if (!ids.length) {
        //   return [];
        // }
        // // Try to get users from cache first
        // const cachedUsers: (UserLocal | null)[] = await Promise.all(
        //   ids.map(id => getCachedData<UserLocal>(`user:${id}`))
        // );
        // // Filter out the ones we couldn't find in cache
        // const missingIds = ids.filter((id, index) => !cachedUsers[index]);
        // let firestoreUsers: UserLocal[] = [];
        // if (missingIds.length) {
        //   // Fetch missing users from Firestore
        //   const snapshot = await usersCollection
        //     .where('__name__', 'in', missingIds)
        //     .get();
        //   firestoreUsers = snapshot.docs.map(doc => ({
        //     id: doc.id,
        //     ...doc.data()
        //   } as UserLocal));
        //   // Cache the newly fetched users
        //   await Promise.all(
        //     firestoreUsers.map(user => 
        //       setCachedData(`user:${user.id}`, user)
        //     )
        //   );
        // }
        // // Combine cached and freshly fetched users
        // const allUsers = [...cachedUsers.filter(Boolean) as UserLocal[], ...firestoreUsers];
        // // Return users in the same order as the input IDs
        // return ids.map(id => allUsers.find(user => user.id === id))
        //   .filter(Boolean) as UserLocal[];
    }
    catch (error) {
        console.error('Error fetching users by IDs:', error);
        throw error;
    }
});
exports.getUsersByIds = getUsersByIds;
// Service pour supprimer complètement un utilisateur
const deleteUserAccount = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🗑️ Début suppression compte utilisateur: ${userId}`);
        // 1. Récupérer les données de l'utilisateur
        const userDoc = yield firebase_1.usersCollection.doc(userId).get();
        if (!userDoc.exists) {
            throw new ClientError_1.ClientError('Utilisateur introuvable', 404);
        }
        const user = Object.assign({ id: userDoc.id }, userDoc.data());
        console.log(`📋 Utilisateur trouvé: ${user}`);
        // 2. Supprimer l'utilisateur de Firebase Auth
        try {
            yield firebase_admin_1.default.auth().deleteUser(userId);
            console.log(`✅ Utilisateur supprimé de Firebase Auth: ${userId}`);
        }
        catch (authError) {
            if (authError.code !== 'auth/user-not-found') {
                console.error(`❌ Erreur suppression Auth:`, authError);
                throw authError;
            }
            console.log(`ℹ️ Utilisateur déjà supprimé de Firebase Auth: ${userId}`);
        }
        // 3. Supprimer le document des disponibilités (ID = userId)
        try {
            const availabilityDoc = yield firebase_1.availabilitiesCollection.doc(userId).get();
            if (availabilityDoc.exists) {
                yield firebase_1.availabilitiesCollection.doc(userId).delete();
                console.log(`✅ Disponibilités supprimées: ${userId}`);
            }
            else {
                console.log(`ℹ️ Aucune disponibilité trouvée pour: ${userId}`);
            }
        }
        catch (availError) {
            console.error(`❌ Erreur suppression disponibilités:`, availError);
            throw availError;
        }
        // 4. Supprimer la photo de profil depuis Storage
        if (user.photoUrl) {
            try {
                // Extraire le chemin du fichier depuis l'URL
                const photoPath = extractStoragePath(user.photoUrl);
                if (photoPath) {
                    //@ts-ignore
                    const fileRef = firebase_admin_1.storage.file(photoPath);
                    yield fileRef.delete();
                    console.log(`✅ Photo supprimée du Storage: ${photoPath}`);
                }
            }
            catch (storageError) {
                console.error(`❌ Erreur suppression photo:`, storageError);
                // Ne pas faire échouer tout le processus pour une erreur de photo
            }
        }
        // 5. Remplacer les références dans les rendez-vous
        yield replaceUserInAppointments(userId);
        // 6. Supprimer le document utilisateur de Firestore
        yield firebase_1.usersCollection.doc(userId).delete();
        console.log(`✅ Document utilisateur supprimé de Firestore: ${userId}`);
        console.log(`🎉 Suppression complète du compte terminée: ${userId}`);
    }
    catch (error) {
        console.error(`❌ Erreur lors de la suppression du compte ${userId}:`, error);
        throw error;
    }
});
exports.deleteUserAccount = deleteUserAccount;
// Fonction pour remplacer les références utilisateur dans les rendez-vous
const replaceUserInAppointments = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const batch = (0, firebase_1.getFirestore)().batch();
        let updateCount = 0;
        // Rechercher les rendez-vous où l'utilisateur est client
        const clientAppointments = yield firebase_1.appointmentsCollection
            .where('clientId', '==', userId)
            .get();
        clientAppointments.docs.forEach(doc => {
            batch.update(doc.ref, {
                clientId: 'deleted-account',
                updatedAt: firebase_admin_1.default.firestore.Timestamp.now()
            });
            updateCount++;
        });
        // Rechercher les rendez-vous où l'utilisateur est professionnel
        const proAppointments = yield firebase_1.appointmentsCollection
            .where('proId', '==', userId)
            .get();
        proAppointments.docs.forEach(doc => {
            batch.update(doc.ref, {
                proId: 'deleted-account',
                updatedAt: firebase_admin_1.default.firestore.Timestamp.now()
            });
            updateCount++;
        });
        // Exécuter toutes les mises à jour
        if (updateCount > 0) {
            yield batch.commit();
            console.log(`✅ ${updateCount} rendez-vous mis à jour avec deleted-account`);
        }
        else {
            console.log(`ℹ️ Aucun rendez-vous trouvé pour l'utilisateur: ${userId}`);
        }
    }
    catch (error) {
        console.error(`❌ Erreur mise à jour rendez-vous:`, error);
        throw error;
    }
});
// Fonction utilitaire pour extraire le chemin du fichier depuis une URL Firebase Storage
const extractStoragePath = (photoUrl) => {
    try {
        // Exemple d'URL Firebase Storage:
        // https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=...
        const url = new URL(photoUrl);
        if (url.hostname === 'firebasestorage.googleapis.com') {
            const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
            if (pathMatch) {
                // Décoder l'URL pour obtenir le vrai chemin
                return decodeURIComponent(pathMatch[1]);
            }
        }
        return null;
    }
    catch (error) {
        console.error('Erreur extraction chemin photo:', error);
        return null;
    }
};
// Service pour vérifier si le compte deleted-account existe
const ensureDeletedAccountExists = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedAccountDoc = yield firebase_1.usersCollection.doc('deleted-account').get();
        if (!deletedAccountDoc.exists) {
            // Créer le compte deleted-account
            yield firebase_1.usersCollection.doc('deleted-account').set({
                email: 'deleted-account@system.local',
                nom: 'Compte Supprimé',
                prenom: 'Utilisateur',
                telephone: '',
                photoUrl: '',
                userType: 'deleted',
                isActive: false,
                createdAt: firebase_admin_1.default.firestore.Timestamp.now(),
                updatedAt: firebase_admin_1.default.firestore.Timestamp.now()
            });
            console.log('✅ Compte deleted-account créé');
        }
    }
    catch (error) {
        console.error('❌ Erreur création compte deleted-account:', error);
        throw error;
    }
});
exports.ensureDeletedAccountExists = ensureDeletedAccountExists;
