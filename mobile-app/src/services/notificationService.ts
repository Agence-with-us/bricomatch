import messaging from '@react-native-firebase/messaging';
import { firestore } from '../config/firebase.config';
import {
  doc,
  setDoc,
  arrayUnion,
  arrayRemove,
  updateDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { showToast } from '../utils/toastNotification';

class NotificationService {
  isInitialized: boolean;
  currentUserId: string | null;
  currentToken: string | null;

  constructor() {
    this.isInitialized = false;
    this.currentUserId = null;
    this.currentToken = null;
  }

  /**
   * Initialise le service de notifications après la connexion utilisateur
   * @param {string} userId - ID de l'utilisateur connecté
   */
  async initialize(userId: string) {
    try {
      if (!userId) {
        throw new Error('User ID requis pour initialiser les notifications');
      }

      this.currentUserId = userId;

      // Créer le canal de notification Android AVANT tout le reste
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      // Demander les permissions AVANT d'obtenir le token
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ Permissions de notifications refusées');
        Alert.alert(
          'Notifications désactivées',
          'Pour recevoir les notifications, veuillez activer les permissions dans les paramètres de l\'application.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Obtenir le token FCM seulement après avoir les permissions
      const token = await this.getFCMToken();
      if (!token) {
        console.warn('⚠️ Impossible d\'obtenir le token FCM');
        return false;
      }

      // IMPORTANT : Nettoyer les anciens tokens AVANT d'ajouter le nouveau
      await this.cleanupOldTokens(token);

      // Sauvegarder le token en Firestore
      await this.saveTokenToFirestore(token);

      // Configurer les listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des notifications:', error);
      return false;
    }
  }

  /**
   * Crée le canal de notification pour Android
   */
  async createNotificationChannel() {
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Notifications par défaut',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        badge: true,
        lights: true,
        lightColor: '#FF5722',
      });

      console.log('✅ Canal de notification créé:', channelId);
      return channelId;
    } catch (error) {
      console.error('❌ Erreur création du canal:', error);
      return 'default';
    }
  }

  /**
   * Demande les permissions de notifications
   */
  async requestPermission() {
    try {
      // Pour Android 13+ (API level 33+), demander explicitement la permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Permission pour les notifications',
            message: 'Cette application a besoin de votre permission pour envoyer des notifications.',
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'Autoriser',
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // Vérifier les permissions Notifee pour Android
      if (Platform.OS === 'android') {
        const settings = await notifee.getNotificationSettings();
        if (settings.authorizationStatus !== 1) { // 1 = AUTHORIZED
          await notifee.openNotificationSettings();
          return false;
        }
      }

      // Demander les permissions Firebase
      const authStatus = await messaging().requestPermission({
        sound: true,
        announcement: true,
        badge: true,
        carPlay: true,
        criticalAlert: true,
        provisional: false,
        alert: true,
      });


      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permissions:', error);
      return false;
    }
  }

  /**
   * Vérifie le statut actuel des permissions
   */
  async checkPermissionStatus() {
    try {
      const authStatus = await messaging().hasPermission();

      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }

  /**
   * Obtient le token FCM
   */
  async getFCMToken() {
    try {
      const hasPermission = await this.checkPermissionStatus();
      if (!hasPermission) {
        console.warn('⚠️ Tentative d\'obtention du token sans permissions');
        return null;
      }

      const token = await messaging().getToken();
      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du token FCM:', error);
      return null;
    }
  }

  /**
   * Redemande les permissions si nécessaire
   */
  async recheckAndRequestPermissions() {
    const hasPermission = await this.checkPermissionStatus();
    if (!hasPermission) {
      return await this.requestPermission();
    }
    return true;
  }

  /**
   * Sauvegarde le token en Firestore
   */
  async saveTokenToFirestore(token: string) {
    try {
      if (!this.currentUserId || !token) {
        throw new Error('User ID et token requis');
      }

      const tokenData = {
        token,
        platform: Platform.OS,
        version: Platform.Version,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
      };

      const userTokenRef = doc(firestore, 'fcmTokens', this.currentUserId);

      await setDoc(
        userTokenRef,
        {
          userId: this.currentUserId,
          tokens: arrayUnion(tokenData),
          lastUpdated: Timestamp.now(),
        },
        { merge: true }
      );

      await AsyncStorage.setItem('fcm_token', token);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
      throw error;
    }
  }

  /**
   * Configure les listeners de notifications
   */
  setupNotificationListeners() {
    // Listener pour les notifications reçues en foreground
    messaging().onMessage(async (remoteMessage) => {
      this.handleForegroundNotification(remoteMessage);
    });

    // Listener pour les notifications ouvertes depuis background/quit
    messaging().onNotificationOpenedApp((remoteMessage) => {
      this.handleNotificationOpened(remoteMessage);
    });

    // Vérifier si l'app a été ouverte depuis une notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          this.handleNotificationOpened(remoteMessage);
        }
      });

    // Listener pour la mise à jour du token
    messaging().onTokenRefresh(async (token) => {
      if (this.currentUserId) {
        await this.cleanupOldTokens(token);
        await this.saveTokenToFirestore(token);
      }
    });

    // Listener pour les notifications Notifee (Android)
    if (Platform.OS === 'android') {
      notifee.onForegroundEvent(({ type, detail }) => {
        console.log('📱 Événement Notifee foreground:', type, detail);
          showToast(detail.notification?.title || 'Nouvelle notification', detail.notification?.body || 'Notification reçue',  'notification_android_push');
      });

      notifee.onBackgroundEvent(async ({ type, detail }) => {
        console.log('📱 Événement Notifee background:', type, detail);
        showToast(detail.notification?.title || 'Nouvelle notification', detail.notification?.body || 'Notification reçue',  'notification_android_push');
      });
    }
  }

  /**
   * Gère les notifications reçues en foreground
   */
  async handleForegroundNotification(remoteMessage: any) {
    try {
      console.log('🔔 Affichage de la notification foreground...');
      
      const notification = {
        id: remoteMessage.messageId || Date.now().toString(),
        title: remoteMessage.notification?.title || 'Nouvelle notification',
        body: remoteMessage.notification?.body || 'Notification reçue',
        data: remoteMessage.data || {},
        android: {
          channelId: 'default',
          color: '#FF5722',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          autoCancel: true,
          showTimestamp: true,
          timestamp: Date.now(),
          // Ajouter des vibrations et sons
          vibrationPattern: [300, 500],
          sound: 'default',
          // Forcer l'affichage
          ongoing: false,
          onlyAlertOnce: false,
          // Actions possibles
          actions: [
            {
              title: 'Voir',
              pressAction: {
                id: 'view',
              },
            },
            {
              title: 'Ignorer',
              pressAction: {
                id: 'dismiss',
              },
            },
          ],
        },
        ios: {
          sound: 'default',
          badge: 1,
        },
      };

      // Afficher la notification
      await notifee.displayNotification(notification);
      console.log('✅ Notification affichée avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage de la notification:', error);
      
      // Fallback : essayer une notification basique
      try {
        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'Notification',
          body: remoteMessage.notification?.body || 'Nouveau message',
          android: {
            channelId: 'default',
            importance: AndroidImportance.HIGH,
          },
        });
      } catch (fallbackError) {
        console.error('❌ Erreur fallback notification:', fallbackError);
      }
    }
  }

  /**
   * Gère l'ouverture d'une notification
   */
  handleNotificationOpened(remoteMessage: any) {
    console.log('Navigation depuis notification:', remoteMessage.data);
  }

  /**
   * Nettoie les anciens tokens de cet appareil
   * @param {string} currentToken - Le token actuel à conserver
   */
  async cleanupOldTokens(currentToken?: string) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ Pas d\'utilisateur connecté pour le nettoyage');
        return;
      }

      const userDocRef = doc(firestore, 'fcmTokens', this.currentUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];


      // Identifier les tokens à supprimer
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        // Supprimer les tokens de la même plateforme ET du même appareil
        const isSamePlatform = tokenData.platform === Platform.OS;
        const isSameVersion = tokenData.version === Platform.Version;
        const isDifferentToken = currentToken ? tokenData.token !== currentToken : true;

        // Supprimer si c'est le même appareil mais un token différent
        return isSamePlatform && isSameVersion && isDifferentToken;
      });

      // Supprimer les anciens tokens
      for (const tokenToRemove of tokensToRemove) {
        await updateDoc(userDocRef, {
          tokens: arrayRemove(tokenToRemove),
        });
      }

      // Nettoyer aussi le storage local si nécessaire
      const oldToken = await AsyncStorage.getItem('fcm_token');
      if (oldToken && oldToken !== currentToken) {
        await AsyncStorage.removeItem('fcm_token');
      }

    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens tokens:', error);
    }
  }

  /**
   * Supprime le token actuel (lors de la déconnexion)
   */
  async removeCurrentToken() {
    try {
      console.log('Suppression du token actuel');
      if (!this.currentUserId) {
        console.warn('⚠️ Pas d\'utilisateur connecté pour la suppression');
        return;
      }

      const userDocRef = doc(firestore, 'fcmTokens', this.currentUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];

      // Trouver les tokens de cet appareil
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        return tokenData.platform === Platform.OS &&
          tokenData.version === Platform.Version;
      });

      // Supprimer tous les tokens de cet appareil
      for (const tokenToRemove of tokensToRemove) {
        await updateDoc(userDocRef, {
          tokens: arrayRemove(tokenToRemove),
        });
      }

      // Nettoyage local
      await AsyncStorage.removeItem('fcm_token');

      // Reset interne
      this.currentUserId = null;
      this.currentToken = null;
      this.isInitialized = false;

    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  }

  /**
   * Récupère tous les tokens d'un utilisateur
   */
  async getUserTokens(userId: string) {
    try {
      const userDocRef = doc(firestore, 'fcmTokens', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      return userData.tokens || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens utilisateur:', error);
      return [];
    }
  }

  /**
   * Vérifie si le service est initialisé
   */
  isServiceInitialized() {
    return this.isInitialized;
  }

  /**
   * Obtient l'ID utilisateur actuel
   */
  getCurrentUserId() {
    return this.currentUserId;
  }

  /**
   * Obtient le token actuel
   */
  getCurrentToken() {
    return this.currentToken;
  }
}

// Export d'une instance singleton
export default new NotificationService();