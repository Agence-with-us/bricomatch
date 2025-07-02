import { useEffect, useState } from 'react';
import NotificationService from '../services/notificationService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { storeFcmToken } from '../store/authentification/reducer';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { user, isAuthenticated, fcmToken, isFcmTokenStored } = useSelector((state: RootState) => state.auth); // Adaptez selon votre contexte
  const dispatch = useDispatch();
  useEffect(() => {
    let isMounted = true;

    const initializeNotifications = async () => {
      if (isAuthenticated && user?.id && !isInitialized) {
        try {

          const success = await NotificationService.initialize(user.id);

          if (isMounted) {
            setIsInitialized(success);
            setHasPermission(success);

            if (success && !isFcmTokenStored) {
              const currentToken = NotificationService.getCurrentToken();
              if (currentToken) {
                await NotificationService.saveTokenToFirestore(currentToken);
                dispatch(storeFcmToken(currentToken));
              }


              setToken(currentToken);
            }
          }
        } catch (error) {
          console.error('Erreur initialisation notifications:', error);
          if (isMounted) {
            setIsInitialized(false);
            setHasPermission(false);
          }
        }
      }
    };

    const cleanupNotifications = async () => {
      if (!isAuthenticated && isInitialized) {
        try {
          await NotificationService.removeCurrentToken();

          if (isMounted) {
            setIsInitialized(false);
            setHasPermission(false);
            setToken(null);
          }
        } catch (error) {
          console.error('Erreur nettoyage notifications:', error);
        }
      }
    };

    if (isAuthenticated && user?.id) {
      initializeNotifications();
    } else {
      cleanupNotifications();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, isInitialized]);

  const reinitializeNotifications = async () => {
    if (user?.id) {
      const success = await NotificationService.initialize(user.id);
      setIsInitialized(success);
      setHasPermission(success);

      if (success) {
        const currentToken = NotificationService.getCurrentToken();
        setToken(currentToken);
      }

      return success;
    }
    return false;
  };

  const getUserTokens = async () => {
    if (user?.id) {
      return await NotificationService.getUserTokens(user.id);
    }
    return [];
  };

  return {
    isInitialized,
    hasPermission,
    token,
    reinitializeNotifications,
    getUserTokens,
    service: NotificationService
  };
};