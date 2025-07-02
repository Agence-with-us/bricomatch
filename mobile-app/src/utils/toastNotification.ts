import Toast from 'react-native-toast-message';
import { ApiErrorResponse } from '../types/ApiErrorResponse';

export const showToast = (message1: string, message2: string, type: 'success' | 'error' | 'notification_android_push' = 'error') => {
  console.log('showToast', message1, message2, type);
  Toast.show({
    type: 'custom',
    text1: message1,
    text2: message2,
    position: 'top',
    visibilityTime: 5000,
    props: { type },
    text1Style: {
      fontSize: type === 'notification_android_push' ? 16 : 18,
      fontWeight: type === 'notification_android_push' ? '600' : 'bold',
      color: type === 'success' 
        ? '#15803D' 
        : type === 'error' 
          ? '#B91C1C' 
          : '#1F2937', // Gris foncé pour notification
      textAlign: type === 'notification_android_push' ? 'left' : 'center',
      marginBottom: type === 'notification_android_push' ? 2 : 0,
    },
    text2Style: {
      fontSize: type === 'notification_android_push' ? 14 : 15,
      fontWeight: type === 'notification_android_push' ? '400' : '500',
      color: type === 'notification_android_push' ? '#6B7280' : '#222', // Gris plus clair pour notification
      textAlign: type === 'notification_android_push' ? 'left' : 'center',
      lineHeight: type === 'notification_android_push' ? 18 : undefined,
    },
    // Styles spécifiques pour le type notification
    ...(type === 'notification_android_push' && {
      topOffset: 60,
      autoHide: true,
      visibilityTime: 10000,
    }),
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
