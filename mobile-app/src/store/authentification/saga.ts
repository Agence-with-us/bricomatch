import { takeLatest, put, call, all, fork, select, takeEvery } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';


import {
  ref,
  getDownloadURL,
  uploadBytes,
  deleteObject
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootState } from '../store';
import {
  loginSuccess,
  loginFailure,
  registerSuccess,
  registerFailure,
  logoutSuccess,
  logoutFailure,
  completeProfileSuccess,
  completeProfileFailure,
  navigateToCompleteProfile,
  updateProfileSuccess,
  updateProfileFailure,
  loginRequest,
  logoutRequest,
  registerRequest,
  checkAuthStatus,
  updateProfileRequest,
  completeProfileRequest,
  loginWithAppleRequest,
  loginWithGoogleRequest,
  setTempUserData,
} from './reducer';
import {
  LoginRequestPayload,
  RegisterRequestPayload,
  CompleteProfileRequestPayload,
  UpdateProfileRequestPayload,
  User,
} from './types';
import { auth, firestore, storage } from '../../config/firebase.config';
import { SagaIterator } from 'redux-saga';
import { navigate, reset } from '../../services/navigationService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { UserRole } from '../users/types';
import axiosInstance from '../../config/axiosInstance';
import NotificationService from '../../services/notificationService';
import { showToast } from '../../utils/toastNotification';

// Fonction pour convertir une image locale en Blob
const createBlobFromUri = async (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = (e) => reject(new TypeError('Network request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

// Fonction pour uploader une image sur Firebase Storage
const uploadImage = async (uri: string, userId: string): Promise<string | null> => {
  try {
    if (!uri.startsWith('file://')) {
      return uri; // Si l'image est déjà une URL HTTP, on la retourne directement
    }

    const blob = await createBlobFromUri(uri);
    const filename = `${userId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `photos-profils/${filename}`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error);
    return null;
  }
};

// Fonction helper pour supprimer une image du storage
function* deleteImage(imageUrl: string): SagaIterator {
  try {
    // Extraire le chemin de l'image depuis l'URL
    const imageRef = ref(storage, imageUrl);
    yield call(deleteObject, imageRef);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    throw error;
  }
}

// Fonction utilitaire pour enregistrer les données utilisateur localement
function* storeUserDataLocally(userData: User): SagaIterator {
  try {
    yield call(AsyncStorage.setItem, 'user', JSON.stringify(userData));
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement local des données utilisateur:', error);
  }
}

// Fonction utilitaire pour récupérer les données utilisateur locales
function* getLocalUserData(): SagaIterator {
  try {
    const userData = yield call(AsyncStorage.getItem, 'user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur locales:', error);
    return null;
  }
}

// Fonction utilitaire pour supprimer les données utilisateur locales
function* removeLocalUserData() {
  try {
    yield call(AsyncStorage.removeItem, 'user');
  } catch (error) {
    console.error('Erreur lors de la suppression des données utilisateur locales:', error);
  }
}

// Saga pour la connexion avec email/password
function* loginSaga(action: PayloadAction<LoginRequestPayload>): SagaIterator {
  try {
    const { email, password } = action.payload;

    console.log('🔐 Tentative de connexion pour:', email);

    // Timeout de sécurité pour éviter les blocages
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de connexion')), 15000); // 15 secondes
    });

    // Authentification avec Firebase avec timeout
    const userCredential = yield call(
      Promise.race,
      [
        signInWithEmailAndPassword(auth, email, password),
        timeoutPromise
      ]
    );

    console.log('✅ Authentification Firebase réussie');

    // Récupération des données utilisateur depuis Firestore avec timeout
    const userDoc = yield call(
      Promise.race,
      [
        getDoc(doc(firestore, 'users', userCredential.user.uid)),
        timeoutPromise
      ]
    );

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const completeUserData = {
        ...userData,
        id: userCredential.user.uid
      };

      console.log('✅ Données utilisateur récupérées:', completeUserData.id);

      // Enregistrer les données utilisateur localement
      yield call(storeUserDataLocally, completeUserData);

      // Dispatch de l'action success
      yield put(loginSuccess(completeUserData));

      console.log('✅ Connexion réussie, redirection...');

      // Redirection basée sur le rôle
      if (userData.role === UserRole.PRO) {
        navigate('Appointments');
      } else {
        navigate('Home');
      }

    } else {
      console.error('❌ Compte utilisateur non trouvé dans Firestore');
      yield put(loginFailure('Compte utilisateur non trouvé.'));
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la connexion:', error);
    let errorMessage = 'Erreur lors de la connexion.';

    // Gestion des erreurs Firebase Auth
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Aucun compte avec cet email.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Email ou Mot de passe incorrect';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Mot de passe incorrect.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Format d\'email invalide.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Ce compte a été désactivé.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Trop de tentatives, veuillez réessayer plus tard.';
        break;
      default:
        if (error.message === 'Timeout de connexion') {
          errorMessage = 'Connexion trop lente, veuillez réessayer.';
        }
        break;
    }
    yield put(loginFailure(errorMessage));
  }
}

function* registerSaga(action: PayloadAction<RegisterRequestPayload>): SagaIterator {
  let userCredential = null;

  try {
    const { email, password, nom, prenom, role, photoUrl, serviceTypeId } = action.payload;

    // Création du compte avec Firebase Auth
    userCredential = yield call(
      createUserWithEmailAndPassword,
      auth,
      email,
      password
    );

    const userId = userCredential.user.uid;

    // Télécharger l'image de profil si fournie
    let finalPhotoUrl = photoUrl;
    if (photoUrl) {
      finalPhotoUrl = yield call(uploadImage, photoUrl, userId);
    }

    // Préparer les données utilisateur pour Firestore
    const userData: User = {
      id: userId,
      email,
      nom,
      prenom,
      role,
      photoUrl: finalPhotoUrl || '',
      serviceTypeId: role === 'PRO' ? serviceTypeId : ''
    };

    try {
      const userDocRef = doc(firestore, 'users', userId);

      yield call(setDoc as any, userDocRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Enregistrer les données utilisateur localement
      yield call(storeUserDataLocally, userData);

      yield put(registerSuccess(userData));

      // **🚀 Appel à l'API Stripe si le rôle est PRO**
      if (role === 'PRO') {
        yield call(axiosInstance.post, `/users/create-stripe-connect`);
      }





    } catch (firestoreError) {
      console.error("Erreur Firestore:", firestoreError);

      // Si on a réussi à créer un compte Auth mais pas Firestore, 
      // on supprime le compte Auth pour éviter l'incohérence
      if (userCredential?.user) {
        yield call([userCredential.user, userCredential.user.delete]);
        console.log("Compte Auth supprimé suite à l'échec de création Firestore");
      }

      throw firestoreError; // Propager l'erreur pour la gestion d'erreur générale
    }

  } catch (error: any) {
    let errorMessage = 'Erreur lors de l\'inscription.';

    // Gestion des erreurs Firebase Auth
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Cet email est déjà utilisé par un autre compte.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Format d\'email invalide.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Cette opération n\'est pas autorisée.';
        break;
    }

    //console.error("Erreur d'inscription:", error);
    yield put(registerFailure(errorMessage));
  }
}

function* loginWithGoogleSaga(action: PayloadAction<any>): SagaIterator {
  try {
    const userData = action.payload.data;
    const role = action.payload.role;
    const { idToken } = userData;

    // ✅ Vérifier que le idToken est valide
    if (!idToken) {
      throw new Error("Token Google invalide.");
    }

    // 🔐 Création des credentials Google
    const credential = GoogleAuthProvider.credential(idToken);

    // 🔑 Connexion avec Firebase Auth
    const userCredential = yield call(signInWithCredential, auth, credential);
    const userId = userCredential.user.uid;

    // 🔎 Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = yield call(getDoc, doc(firestore, 'users', userId));
    let userDataToStore;

    if (userDoc.exists()) {
      // ✅ L'utilisateur existe dans Firestore - récupération des données existantes
      const firestoreData = userDoc.data() as User;
      userDataToStore = {
        ...firestoreData,
        id: userId
      };

      // Enregistrement du login dans Redux et stockage local
      yield put(loginSuccess(userDataToStore));
      yield call(storeUserDataLocally, userDataToStore);

      // **🚀 Appel à l'API Stripe si le rôle est PRO**
      if (role === 'PRO') {
        yield call(axiosInstance.post, `/users/create-stripe-connect`);
        console.log(`🔄 Compte Stripe Connect demandé pour le PRO ${userId}`);
      }
      
      // Redirection basée sur le rôle stocké dans Firestore
      if (userDataToStore.role === UserRole.PRO) {
        navigate('Appointments');
      } else {
        navigate('Home');
      }

    } else {
      // ❌ L'utilisateur n'existe pas dans Firestore
      if (role === UserRole.PRO) {
        // Pour un PRO, rediriger vers la complétion de profil
        console.warn("Nouvel utilisateur PRO. Redirection vers la complétion de profil.");

        const newUserData: User = {
          email: userCredential.user.email || '',
          nom: userData.user.givenName || '',
          prenom: userData.user.familyName || '',
          photoUrl: userData.user.photo || '',
          role,
          id: userId,
        };

        yield put(setTempUserData(newUserData));
        yield put(navigateToCompleteProfile());
        navigate('CompleteProfile');

      } else {
        // Pour un PARTICULIER, créer automatiquement le profil
        userDataToStore = {
          email: userCredential.user.email || '',
          nom: userData.user.givenName || '',
          prenom: userData.user.familyName || '',
          photoUrl: userData.user.photo || '',
          role: UserRole.PARTICULIER, // S'assurer que le rôle est bien PARTICULIER
          id: userId,
        };

        // Sauvegarde des données dans Firestore
        const userDocRef = doc(firestore, 'users', userId);
        yield call(setDoc as any, userDocRef, userDataToStore);
        console.log("Nouveau compte PARTICULIER créé automatiquement");

        // Enregistrement du login dans Redux et stockage local
        yield put(loginSuccess(userDataToStore));
        yield call(storeUserDataLocally, userDataToStore);

        // Redirection vers Home pour les PARTICULIER
        navigate('Home');
      }
    }
  } catch (error: any) {
    let errorMessage = "";

    // 🔎 Gestion détaillée des erreurs Firebase Auth
    switch (error.code) {
      case "auth/user-disabled":
        errorMessage = "Votre compte est désactivé. Contactez le support.";
        break;
      case "auth/user-not-found":
        errorMessage = "Aucun utilisateur correspondant trouvé.";
        break;
      case "auth/invalid-credential":
        errorMessage = "Les identifiants Google sont invalides.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Problème de connexion Internet. Veuillez réessayer.";
        break;
      case "auth/internal-error":
        errorMessage = "Erreur interne. Veuillez réessayer plus tard.";
        break;
      default:
        break;
    }

    yield put(loginFailure(errorMessage));
  }
}


// Saga pour la connexion avec Apple
function* loginWithAppleSaga(action: PayloadAction<any>): SagaIterator {
  try {
    const userData = action.payload.data;
    const role = action.payload.role;
    const { idToken } = userData;

    // ✅ Vérifier que le idToken est valide
    if (!idToken) {
      throw new Error("Token Apple invalide.");
    }

    // 🔐 Création des credentials Apple avec Firebase
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: idToken,
      rawNonce: '', // Si vous utilisez un nonce, ajoutez-le ici
    });

    // 🔑 Connexion avec Firebase Auth
    const userCredential = yield call(signInWithCredential, auth, credential);
    const userId = userCredential.user.uid;

    // 🔎 Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = yield call(getDoc, doc(firestore, 'users', userId));
    let userDataToStore;

    if (userDoc.exists()) {
      // ✅ L'utilisateur existe dans Firestore - récupération des données existantes
      userDataToStore = userDoc.data() as User;


      // Enregistrement du login dans Redux et stockage local
      yield put(loginSuccess({
        ...userDataToStore
      }));

      yield call(storeUserDataLocally, {
        ...userDataToStore
      });



      // Redirection basée sur le rôle stocké dans Firestore
      if (userDataToStore.role === UserRole.PRO) {
        navigate('Appointments');
      } else {
        navigate('Home');
      }

    } else {
      // ❌ L'utilisateur n'existe pas dans Firestore
      if (role === UserRole.PRO) {
        // Pour un PRO, rediriger vers la complétion de profil
        console.warn("Nouvel utilisateur PRO. Redirection vers la complétion de profil.");

        const newUserData: User = {
          id: userId,
          email: userCredential.user.email || '',
          nom: userData.user.familyName || '',
          prenom: userData.user.givenName || '',
          photoUrl: userData.user.photo || '',
          role,
        };

        yield put(setTempUserData(newUserData));
        yield put(navigateToCompleteProfile());
        navigate('CompleteProfile');

      } else {
        // Pour un PARTICULIER, créer automatiquement le profil
        userDataToStore = {
          id: userId,
          email: userCredential.user.email || '',
          nom: userData.user.familyName || '',
          prenom: userData.user.givenName || '',
          photoUrl: userData.user.photo || '',
          role: UserRole.PARTICULIER, // S'assurer que le rôle est bien PARTICULIER
          createdAt: new Date().toISOString(),
        };

        // Sauvegarde des données dans Firestore
        yield call(setDoc as any, doc(firestore, 'users', userId), userDataToStore);
        console.log("Nouveau compte PARTICULIER créé automatiquement");

        // Enregistrement du login dans Redux et stockage local
        yield put(loginSuccess({
          ...userDataToStore
        }));

        yield call(storeUserDataLocally, {
          ...userDataToStore
        });



        // Redirection vers Home pour les PARTICULIER
        navigate('Home');
      }
    }
  } catch (error: any) {
    let errorMessage = "";

    // 🔎 Gestion détaillée des erreurs Firebase Auth
    switch (error.code) {
      case "auth/user-disabled":
        errorMessage = "Votre compte est désactivé. Contactez le support.";
        break;
      case "auth/user-not-found":
        errorMessage = "Aucun utilisateur correspondant trouvé.";
        break;
      case "auth/invalid-credential":
        errorMessage = "Les identifiants Apple sont invalides.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Problème de connexion Internet. Veuillez réessayer.";
        break;
      case "auth/internal-error":
        errorMessage = "Erreur interne. Veuillez réessayer plus tard.";
        break;
      default:
        errorMessage = error.message || "Une erreur est survenue lors de la connexion.";
        break;
    }

    console.error("Erreur Apple Sign-In:", error);
    yield put(loginFailure(errorMessage));
  }
}

// Saga pour compléter le profil après connexion sociale
function* completeProfileSaga(action: PayloadAction<CompleteProfileRequestPayload>): SagaIterator {
  try {

    const userData = action.payload;
    const userId = userData.id;

    if (!userId) {
      throw new Error("ID utilisateur manquant");
    }

    // Préparation des données complètes de l'utilisateur
    const completeUserData: User = {
      id: userId,
      email: userData.email,
      nom: userData.nom,
      prenom: userData.prenom,
      photoUrl: userData.photoUrl,
      role: userData.role,
      serviceTypeId: userData.serviceTypeId,
    };

    // Mise à jour des données dans Firestore
    yield call(setDoc, doc(firestore, 'users', userId), {
      ...completeUserData,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Dispatch de l'action success
    yield put(completeProfileSuccess(completeUserData));

    // Stockage local des données utilisateur
    yield call(storeUserDataLocally, completeUserData);

    // Redirection vers l'écran d'accueil
    navigate('Home');

  } catch (error: any) {
    console.error("Erreur lors de la complétion du profil:", error);

    let errorMessage = "Erreur lors de la mise à jour du profil.";

    // Gestion des erreurs spécifiques
    if (error.code === 'permission-denied') {
      errorMessage = "Vous n'avez pas les droits nécessaires pour cette opération.";
    } else if (error.code === 'unavailable') {
      errorMessage = "Service temporairement indisponible. Veuillez réessayer plus tard.";
    }

    yield put(completeProfileFailure(errorMessage));
  }
}

function* updateProfileSaga(action: PayloadAction<UpdateProfileRequestPayload>): SagaIterator {
  try {
    const { nom, prenom, photoUrl, description } = action.payload;

    // Récupérer l'ID utilisateur actuel
    const { user } = yield select((state: RootState) => state.auth);

    if (!user || !user.id) {
      yield put(updateProfileFailure('Utilisateur non connecté'));
      return;
    }

    // Préparer les données à mettre à jour
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (nom) updateData.nom = nom;
    if (prenom) updateData.prenom = prenom;
    if (description) updateData.description = description;

    // Gérer la mise à jour de la photo de profil
    if (photoUrl && !photoUrl.startsWith('https://')) {
      // Supprimer l'ancienne photo si elle existe
      if (user.photoUrl && user.photoUrl.startsWith('https://')) {
        try {
          yield call(deleteImage, user.photoUrl);
        } catch (deleteError) {
          console.warn('Erreur lors de la suppression de l\'ancienne photo:', deleteError);
          // Ne pas arrêter le processus si la suppression échoue
        }
      }

      // Télécharger la nouvelle image
      const finalPhotoUrl = yield call(uploadImage, photoUrl, user.id);
      updateData.photoUrl = finalPhotoUrl;
    } else if (photoUrl && photoUrl.startsWith('https://')) {
      // Si c'est déjà une URL valide, l'utiliser directement
      updateData.photoUrl = photoUrl;
    }

    // Mettre à jour les données dans Firestore
    yield call(updateDoc, doc(firestore, 'users', user.id), updateData, { merge: true });

    // Récupérer les données complètes mises à jour
    const userDoc = yield call(getDoc, doc(firestore, 'users', user.id));
    const updatedUserData = userDoc.data() as User;

    // Créer l'objet utilisateur mis à jour (correction du problème d'ID dupliqué)
    const updatedUser = {
      ...updatedUserData,
      id: user.id // L'ID vient en dernier pour éviter l'écrasement
    };

    // Mettre à jour les données locales
    yield call(storeUserDataLocally, updatedUser);

    yield put(updateProfileSuccess(updatedUser));
    showToast('Profil mis à jour avec succès', 'Vous pouvez maintenant fermer cette page', 'success');
  } catch (error: any) {
    console.error('Erreur mise à jour profil:', error);
    yield put(updateProfileFailure('Erreur lors de la mise à jour du profil: ' + error.message));
  }
}


// Saga pour la déconnexion
function* logoutSaga() {
  try {
    

    // 🍎 Déconnexion Apple 
    // 🧹 Nettoyage local
    yield call(removeLocalUserData);
    yield call([NotificationService, NotificationService.removeCurrentToken]);

    // 🔒 Déconnexion Firebase Auth
    yield call(signOut, auth);

    // 🔓 Déconnexion Google
    try {
      yield call([GoogleSignin, GoogleSignin.signOut]);
    } catch (e) {
      console.warn('Erreur lors de la déconnexion Google:', e);
    }
    // ✅ Succès
    yield put(logoutSuccess());

    // Réinitialiser la navigation pour empêcher le retour en arrière
    yield call(reset, 'Login');
  } catch (error: any) {
    console.error('Erreur déconnexion:', error);
    yield put(logoutFailure('Erreur lors de la déconnexion: ' + error.message));
  }
}


// Saga pour vérifier l'état d'authentification
function* checkAuthStatusSaga(): SagaIterator {
  try {
    // Vérifier d'abord les données en local storage
    const userData = yield call(getLocalUserData);

    if (userData) {
      yield put(loginSuccess(userData));


    } else {
      // Si pas de données locales, vérifier l'état d'authentification Firebase
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Récupérer les données utilisateur depuis Firestore
        const userDoc = yield call(getDoc, doc(firestore, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const firestoreUserData = userDoc.data() as User;

          yield put(loginSuccess({
            ...firestoreUserData
          }));

          // Enregistrer les données utilisateur localement
          yield call(storeUserDataLocally, {
            ...firestoreUserData
          });

        } else {
          // L'utilisateur est authentifié mais n'a pas de profil complet
          yield put(navigateToCompleteProfile());
        }
      } else {
        // Pas d'utilisateur connecté
        yield put(logoutSuccess());
      }
    }
  } catch (error: any) {
    console.error('Erreur vérification état auth:', error);
    yield put(loginFailure('Erreur lors de la vérification de l\'authentification: ' + error.message));
  }
}
// Watcher saga pour surveiller les actions d'authentification
export function* watchAuthActions() {
  yield takeEvery(loginRequest.type, loginSaga);
  yield takeEvery(logoutRequest.type, logoutSaga);
  yield takeEvery(registerRequest.type, registerSaga);
  yield takeEvery(checkAuthStatus.type, checkAuthStatusSaga);
  yield takeEvery(updateProfileRequest.type, updateProfileSaga);
  yield takeEvery(completeProfileRequest.type, completeProfileSaga);
  yield takeEvery(loginWithAppleRequest.type, loginWithAppleSaga);
  yield takeEvery(loginWithGoogleRequest.type, loginWithGoogleSaga);
}

