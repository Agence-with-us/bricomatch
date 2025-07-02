import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AuthState,
  AuthActionTypes,
  LoginRequestPayload,
  RegisterRequestPayload,
  CompleteProfileRequestPayload,
  UpdateProfileRequestPayload,
  User
} from './types';

// État initial
const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  tempUserData: null,
  lastLoginTime: null,
  isFcmTokenStored: false,
  fcmToken: null,
};

// Création du slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login avec email/password
    loginRequest: (state, action: PayloadAction<LoginRequestPayload>) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      state.lastLoginTime = Date.now(); // Stocker l'heure de connexion
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Login avec Google
    loginWithGoogleRequest: (state, action: PayloadAction<any>) => {
      state.loading = true;
      state.error = null;
    },

    // Login avec Apple
    loginWithAppleRequest: (state, action: PayloadAction<any>) => {
      state.loading = true;
      state.error = null;
    },

    // Inscription
    registerRequest: (state, action: PayloadAction<RegisterRequestPayload>) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Action pour stocker temporairement les données utilisateur
    setTempUserData: (state, action: PayloadAction<User>) => {
      state.tempUserData = action.payload;
    },
    // Compléter le profil
    completeProfileRequest: (state, action: PayloadAction<CompleteProfileRequestPayload>) => {
      state.loading = true;
      state.error = null;
    },
    completeProfileSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      state.tempUserData = null;
    },
    completeProfileFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Navigation vers la complétion de profil
    navigateToCompleteProfile: (state) => {
      state.loading = false;
    },

    // Déconnexion
    logoutRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    logoutSuccess: (state) => {
      return { ...initialState };
    },
    logoutFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Vérification de l'état d'authentification
    checkAuthStatus: (state) => {
      state.loading = true;
    },

    // Mise à jour du profil
    updateProfileRequest: (state, action: PayloadAction<UpdateProfileRequestPayload>) => {
      state.loading = true;
      state.error = null;
    },
    updateProfileSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.user = action.payload;
      state.error = null;
    },
    updateProfileFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Stockage du token FCM
    storeFcmToken: (state, action: PayloadAction<string>) => {
      state.fcmToken = action.payload;
      state.isFcmTokenStored = true;
    },
    clearFcmToken: (state) => {
      state.fcmToken = null;
      state.isFcmTokenStored = false;
    },

    // Réinitialisation de l'erreur
    clearError: (state) => {
      state.error = null; // 🔹 Réinitialise l'erreur
    },
  }
});

// Export des actions
export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  loginWithGoogleRequest,
  loginWithAppleRequest,
  registerRequest,
  registerSuccess,
  registerFailure,
  completeProfileRequest,
  completeProfileSuccess,
  completeProfileFailure,
  navigateToCompleteProfile,
  logoutRequest,
  logoutSuccess,
  logoutFailure,
  checkAuthStatus,
  updateProfileRequest,
  updateProfileSuccess,
  updateProfileFailure,
  setTempUserData,
  clearError,
  storeFcmToken,
  clearFcmToken
} = authSlice.actions;

// Export du reducer
export default authSlice.reducer;