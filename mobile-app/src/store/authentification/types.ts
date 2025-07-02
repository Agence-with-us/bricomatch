// Types des utilisateurs
export interface User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    photoUrl?: string;
    serviceTypeId?: string;
    description?: string;
  }
  
  // Types pour les actions d'authentification
  export enum AuthActionTypes {
    // Login avec email/password
    LOGIN_REQUEST = 'LOGIN_REQUEST',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    
    // Login avec Google
    LOGIN_WITH_GOOGLE_REQUEST = 'LOGIN_WITH_GOOGLE_REQUEST',
    
    // Login avec Apple
    LOGIN_WITH_APPLE_REQUEST = 'LOGIN_WITH_APPLE_REQUEST',
    
    // Register avec email/password
    REGISTER_REQUEST = 'REGISTER_REQUEST',
    REGISTER_SUCCESS = 'REGISTER_SUCCESS',
    REGISTER_FAILURE = 'REGISTER_FAILURE',
    
    // Compléter profil (après Google/Apple Sign-In)
    COMPLETE_PROFILE_REQUEST = 'COMPLETE_PROFILE_REQUEST',
    COMPLETE_PROFILE_SUCCESS = 'COMPLETE_PROFILE_SUCCESS',
    COMPLETE_PROFILE_FAILURE = 'COMPLETE_PROFILE_FAILURE',
    
    // Logout
    LOGOUT_REQUEST = 'LOGOUT_REQUEST',
    LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
    LOGOUT_FAILURE = 'LOGOUT_FAILURE',
    
    // Vérification état de l'authentification
    CHECK_AUTH_STATUS = 'CHECK_AUTH_STATUS',
    
    // Navigation vers la page de complétion de profil
    NAVIGATE_TO_COMPLETE_PROFILE = 'NAVIGATE_TO_COMPLETE_PROFILE',
  
    // Mise à jour du profil
    UPDATE_PROFILE_REQUEST = 'UPDATE_PROFILE_REQUEST',
    UPDATE_PROFILE_SUCCESS = 'UPDATE_PROFILE_SUCCESS',
    UPDATE_PROFILE_FAILURE = 'UPDATE_PROFILE_FAILURE'
  }
  
  // Interface pour l'état d'authentification
  export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    tempUserData: any | null; // Données temporaires pour l'authentification sociale
    lastLoginTime: number | null;
    isFcmTokenStored: boolean;
    fcmToken: string | null;
  }
  
  // Interfaces pour les payloads des actions
  export interface LoginRequestPayload {
    email: string;
    password: string;
  }
  
  export interface RegisterRequestPayload {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: string;
    photoUrl?: string;
    serviceTypeId?: string;
  }
  
  export interface CompleteProfileRequestPayload {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    photoUrl?: string;
    serviceTypeId?: string;
  }
  
  export interface UpdateProfileRequestPayload {
    nom?: string;
    prenom?: string;
    photoUrl?: string;
    description?: string;
  }