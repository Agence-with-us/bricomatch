// 4. Service d'authentification
// src/services/authService.ts
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    GoogleAuthProvider,
    signInWithCredential,
    OAuthProvider,
    updateProfile
  } from 'firebase/auth';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { mapFirebaseUserToAppUser } from '../utils/userMapper';
import { User } from '../types/UserType';
import { auth } from '../config/firebase.config';
  
  export const signInWithEmail = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = mapFirebaseUserToAppUser(userCredential.user);
      
      // Stocker les informations d'authentification
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec de connexion');
    }
  };
  
  export const registerWithEmail = async (
    email: string, 
    password: string, 
    nom: string, 
    prenom: string
  ): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Mettre à jour le profil avec le nom et prénom
      await updateProfile(userCredential.user, {
        displayName: `${prenom} ${nom}`
      });
      
      const user = mapFirebaseUserToAppUser(userCredential.user, { nom, prenom });
      
      // Stocker les informations d'authentification
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec d\'inscription');
    }
  };
  
  export const logoutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
      // Supprimer les données utilisateur du stockage local
      await AsyncStorage.removeItem('userData');
    } catch (error: any) {
      throw new Error(error.message || 'Échec de déconnexion');
    }
  };
  
  export const signInWithGoogleCredential = async (idToken: string): Promise<User> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = mapFirebaseUserToAppUser(userCredential.user);
      
      // Stocker les informations d'authentification
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec de connexion avec Google');
    }
  };
  
  export const signInWithAppleCredential = async (
    identityToken: string, 
    nonce: string
  ): Promise<User> => {
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });
      
      const userCredential = await signInWithCredential(auth, credential);
      const user = mapFirebaseUserToAppUser(userCredential.user);
      
      // Stocker les informations d'authentification
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Échec de connexion avec Apple');
    }
  };
  
  export const loadStoredUser = async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      return null;
    }
  };
  