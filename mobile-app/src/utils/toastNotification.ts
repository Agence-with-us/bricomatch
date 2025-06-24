import Toast from 'react-native-toast-message';
import { ApiErrorResponse } from '../types/ApiErrorResponse';

export const showToast = (message1: string, message2: string, type: 'success' | 'error' = 'error') => {
  Toast.show({
    type: 'custom',
    text1: message1,
    text2: message2,
    position: 'top',
    visibilityTime: 5000,
    props: { type },
    text1Style: {
      fontSize: 18,
      fontWeight: 'bold',
      color: type === 'success' ? '#15803D' : '#B91C1C',
      textAlign: 'center',
    },
    text2Style: {
      fontSize: 15,
      fontWeight: '500',
      color: '#222',
      textAlign: 'center',
    },
  });
};

/**
 * Affiche un toast en cas d'erreur retournée par l'API.
 * @param response L'objet réponse contenant l'erreur (propriété "clientError")
 */
export function showApiErrorToast(response: ApiErrorResponse) {
  const errorMessage = response.clientError || "Une erreur inattendue s'est produite";

  showToast("Erreur", errorMessage, 'error');
}
