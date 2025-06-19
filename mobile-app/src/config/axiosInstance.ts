// axiosInstance.ts
import axios from 'axios';
import { auth } from './firebase.config';
import { showApiErrorToast, showToast } from '../utils/toastNotification';
import Constants from 'expo-constants';

/**
 * Fonction utilitaire pour récupérer le token d'authentification depuis Firebase.
 */
async function getAuthToken(): Promise<string | null> {
  return auth.currentUser ? await auth.currentUser.getIdToken() : null;
}


const axiosInstance = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout en ms (10 secondes)
});

// Intercepteur de requête pour ajouter automatiquement le header Authorization si un token existe
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour gérer globalement succès et erreurs avec affichage de toast
axiosInstance.interceptors.response.use(
  (response) => {
    // Si la réponse contient un message de succès, l'afficher avec un toast
    if (response.data && response.data.message) {
      showToast(response.data.message, 'success');
    }
    return response;
  },
  (error) => {
    console.log(error.request);

    // En cas d'erreur, si l'API retourne des détails, utiliser showApiErrorToast,
    // sinon afficher un message d'erreur générique.
    if (error.response && error.response.data) {
      showApiErrorToast(error.response.data);
    } else {
      showToast("Une erreur inattendue s'est produite", 'error');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
