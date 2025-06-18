// 3. Mapper d'utilisateur Firebase vers utilisateur App
// src/utils/userMapper.ts
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types/UserType';

export const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, additionalData = {}): User => {
  const names = firebaseUser.displayName ? firebaseUser.displayName.split(' ') : ['', ''];
  const prenom = names[0] || '';
  const nom = names.length > 1 ? names.slice(1).join(' ') : '';

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    nom: nom,
    prenom: prenom,
    role: 'user', // Valeur par défaut, à modifier selon votre logique
    photoUrl: firebaseUser.photoURL || undefined,
    ...additionalData
  };
};