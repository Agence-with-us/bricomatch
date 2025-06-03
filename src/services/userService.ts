import { appointmentsCollection, availabilitiesCollection, getFirestore, usersCollection } from '../config/firebase';
import { ClientError } from '../helpers/ClientError';
import { UserLocal } from '../types';
// import { getCachedData, setCachedData } from '../config/redis';
import admin, { storage } from 'firebase-admin';


// Get user by ID
//@ts-ignore
export const getUserById = async (id: string): Promise<UserLocal | null> => {
  try {
    // // Check cache first
    // const cacheKey = `user:${id}`;
    // const cachedUser = await getCachedData<UserLocal>(cacheKey);
    
    // if (cachedUser) {
    //   return cachedUser;
    // }
    
    // // If not in cache, fetch from Firestore
    const doc = await usersCollection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const user = { id: doc.id, ...doc.data() } as UserLocal;
    
    // // Store in cache
    // await setCachedData(cacheKey, user);
    
    return user;
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    throw error;
  }
};

// Get multiple users by their IDs
//@ts-ignore
export const getUsersByIds = async (ids: string[]): Promise<UserLocal[]> => {
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
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    throw error;
  }
};



// Service pour supprimer complètement un utilisateur
export const deleteUserAccount = async (userId: string): Promise<void> => {
  try {
    console.log(`🗑️ Début suppression compte utilisateur: ${userId}`);

    // 1. Récupérer les données de l'utilisateur
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      throw new ClientError('Utilisateur introuvable',404);
    }

    const user = { id: userDoc.id, ...userDoc.data() } as UserLocal;
    console.log(`📋 Utilisateur trouvé: ${user}`);

    // 2. Supprimer l'utilisateur de Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
      console.log(`✅ Utilisateur supprimé de Firebase Auth: ${userId}`);
    } catch (authError: any) {
      if (authError.code !== 'auth/user-not-found') {
        console.error(`❌ Erreur suppression Auth:`, authError);
        throw authError;
      }
      console.log(`ℹ️ Utilisateur déjà supprimé de Firebase Auth: ${userId}`);
    }

    // 3. Supprimer le document des disponibilités (ID = userId)
    try {
      const availabilityDoc = await availabilitiesCollection.doc(userId).get();
      if (availabilityDoc.exists) {
        await availabilitiesCollection.doc(userId).delete();
        console.log(`✅ Disponibilités supprimées: ${userId}`);
      } else {
        console.log(`ℹ️ Aucune disponibilité trouvée pour: ${userId}`);
      }
    } catch (availError) {
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
          const fileRef = storage.file(photoPath);
          await fileRef.delete();
          console.log(`✅ Photo supprimée du Storage: ${photoPath}`);
        }
      } catch (storageError) {
        console.error(`❌ Erreur suppression photo:`, storageError);
        // Ne pas faire échouer tout le processus pour une erreur de photo
      }
    }

    // 5. Remplacer les références dans les rendez-vous
    await replaceUserInAppointments(userId);

    // 6. Supprimer le document utilisateur de Firestore
    await usersCollection.doc(userId).delete();
    console.log(`✅ Document utilisateur supprimé de Firestore: ${userId}`);

    console.log(`🎉 Suppression complète du compte terminée: ${userId}`);

  } catch (error) {
    console.error(`❌ Erreur lors de la suppression du compte ${userId}:`, error);
    throw error;
  }
};

// Fonction pour remplacer les références utilisateur dans les rendez-vous
const replaceUserInAppointments = async (userId: string): Promise<void> => {
  try {
    const batch = getFirestore().batch();
    let updateCount = 0;

    // Rechercher les rendez-vous où l'utilisateur est client
    const clientAppointments = await appointmentsCollection
      .where('clientId', '==', userId)
      .get();

    clientAppointments.docs.forEach(doc => {
      batch.update(doc.ref, {
        clientId: 'deleted-account',
        updatedAt: admin.firestore.Timestamp.now()
      });
      updateCount++;
    });

    // Rechercher les rendez-vous où l'utilisateur est professionnel
    const proAppointments = await appointmentsCollection
      .where('proId', '==', userId)
      .get();

    proAppointments.docs.forEach(doc => {
      batch.update(doc.ref, {
        proId: 'deleted-account',
        updatedAt: admin.firestore.Timestamp.now()
      });
      updateCount++;
    });

    // Exécuter toutes les mises à jour
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ ${updateCount} rendez-vous mis à jour avec deleted-account`);
    } else {
      console.log(`ℹ️ Aucun rendez-vous trouvé pour l'utilisateur: ${userId}`);
    }

  } catch (error) {
    console.error(`❌ Erreur mise à jour rendez-vous:`, error);
    throw error;
  }
};

// Fonction utilitaire pour extraire le chemin du fichier depuis une URL Firebase Storage
const extractStoragePath = (photoUrl: string): string | null => {
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
  } catch (error) {
    console.error('Erreur extraction chemin photo:', error);
    return null;
  }
};

// Service pour vérifier si le compte deleted-account existe
export const ensureDeletedAccountExists = async (): Promise<void> => {
  try {
    const deletedAccountDoc = await usersCollection.doc('deleted-account').get();
    
    if (!deletedAccountDoc.exists) {
      // Créer le compte deleted-account
      await usersCollection.doc('deleted-account').set({
        email: 'deleted-account@system.local',
        nom: 'Compte Supprimé',
        prenom: 'Utilisateur',
        telephone: '',
        photoUrl: '',
        userType: 'deleted',
        isActive: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ Compte deleted-account créé');
    }
  } catch (error) {
    console.error('❌ Erreur création compte deleted-account:', error);
    throw error;
  }
};