import Toast from 'react-native-toast-message';
import { ApiErrorResponse } from '../types/ApiErrorResponse';

export const showToast = (message: string, type: 'success' | 'error' = 'error') => {
  Toast.show({
    type,
    text1: type === 'error' ? 'Erreur' : 'Succès',
    text2: message,
    position: 'top',
    visibilityTime: 10000,

  });
};

/**
 * Affiche un toast en cas d'erreur retournée par l'API.
 * @param response L'objet réponse contenant l'erreur (propriété "clientError")
 */
export function showApiErrorToast(response: ApiErrorResponse) {
  const errorMessage = response.clientError || "Une erreur inattendue s'est produite";

  showToast(errorMessage,'error');
}
