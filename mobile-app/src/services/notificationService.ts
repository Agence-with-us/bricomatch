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
import { Platform, PermissionsAndroid, Alert, AppState } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { PushNotificationsActionsEnum } from '../types/PushNotificationsType';
import { getCurrentRoute, navigate } from './navigationService';

class NotificationService {
  isInitialized: boolean;
  currentUserId: string | null;
  currentToken: string | null;
  private appState: string;

  constructor() {
    this.isInitialized = false;
    this.currentUserId = null;
    this.currentToken = null;
    this.appState = AppState.currentState;

    // Écouter les changements d'état de l'app
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: string) => {
    console.log(`📱 [${Platform.OS.toUpperCase()}] État de l'app changé: ${this.appState} -> ${nextAppState}`);
    this.appState = nextAppState;
  };

  /**
   * Initialise le service de notifications après la connexion utilisateur
   * @param {string} userId - ID de l'utilisateur connecté
   */
  async initialize(userId: string) {
    try {
      console.log(`🚀 [${Platform.OS.toUpperCase()}] Initialisation des notifications pour l'utilisateur: ${userId}`);

      if (!userId) {
        throw new Error('User ID requis pour initialiser les notifications');
      }

      this.currentUserId = userId;

      // Créer le canal de notification Android AVANT tout le reste
      if (Platform.OS === 'android') {
        console.log('📱 [ANDROID] Création du canal de notification...');
        await this.createNotificationChannel();
      }

      // Demander les permissions AVANT d'obtenir le token
      console.log(`🔐 [${Platform.OS.toUpperCase()}] Demande des permissions...`);
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Permissions de notifications refusées`);
        Alert.alert(
          'Notifications désactivées',
          'Pour recevoir les notifications, veuillez activer les permissions dans les paramètres de l\'application.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Obtenir le token FCM seulement après avoir les permissions
      console.log(`🔑 [${Platform.OS.toUpperCase()}] Récupération du token FCM...`);
      const token = await this.getFCMToken();
      if (!token) {
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Impossible d'obtenir le token FCM`);
        return false;
      }

      console.log(`✅ [${Platform.OS.toUpperCase()}] Token FCM obtenu: ${token.substring(0, 20)}...`);

      // Configurer les listeners
      console.log(`🎧 [${Platform.OS.toUpperCase()}] Configuration des listeners...`);
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log(`✅ [${Platform.OS.toUpperCase()}] Service de notifications initialisé avec succès`);
      return true;

    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de l'initialisation des notifications:`, error);
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

      console.log('✅ [ANDROID] Canal de notification créé:', channelId);
      return channelId;
    } catch (error) {
      console.error('❌ [ANDROID] Erreur création du canal:', error);
      return 'default';
    }
  }

  /**
   * Demande les permissions de notifications
   */
  async requestPermission() {
    try {
      console.log(`🔐 [${Platform.OS.toUpperCase()}] Demande des permissions...`);

      // Pour Android 13+ (API level 33+), demander explicitement la permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        console.log('📱 [ANDROID] Demande permission POST_NOTIFICATIONS (Android 13+)...');
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

        console.log('📱 [ANDROID] Résultat permission POST_NOTIFICATIONS:', granted);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('⚠️ [ANDROID] Permission POST_NOTIFICATIONS refusée');
          return false;
        }
      }

      // Vérifier les permissions Notifee pour Android
      if (Platform.OS === 'android') {
        console.log('📱 [ANDROID] Vérification des paramètres Notifee...');
        const settings = await notifee.getNotificationSettings();
        console.log('📱 [ANDROID] Paramètres Notifee:', settings);

        if (settings.authorizationStatus !== 1) { // 1 = AUTHORIZED
          console.warn('⚠️ [ANDROID] Paramètres Notifee non autorisés, ouverture des paramètres...');
          await notifee.openNotificationSettings();
          return false;
        }
      }

      // Demander les permissions Firebase
      console.log(`🔥 [${Platform.OS.toUpperCase()}] Demande des permissions Firebase...`);
      const authStatus = await messaging().requestPermission({
        sound: true,
        announcement: true,
        badge: true,
        carPlay: true,
        criticalAlert: true,
        provisional: false,
        alert: true,
      });

      console.log(`🔥 [${Platform.OS.toUpperCase()}] Statut d'autorisation Firebase:`, authStatus);

      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log(`✅ [${Platform.OS.toUpperCase()}] Permissions accordées`);
        return true;
      } else {
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Permissions refusées`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de la demande de permissions:`, error);
      return false;
    }
  }

  /**
   * Vérifie le statut actuel des permissions
   */
  async checkPermissionStatus() {
    try {
      const authStatus = await messaging().hasPermission();
      console.log(`🔍 [${Platform.OS.toUpperCase()}] Statut des permissions:`, authStatus);

      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de la vérification des permissions:`, error);
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
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Tentative d'obtention du token sans permissions`);
        return null;
      }

      const token = await messaging().getToken();
      this.currentToken = token;
      console.log(`🔑 [${Platform.OS.toUpperCase()}] Token FCM obtenu: ${token ? token.substring(0, 20) + '...' : 'null'}`);
      return token;
    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de l'obtention du token FCM:`, error);
      return null;
    }
  }

  /**
   * Redemande les permissions si nécessaire
   */
  async recheckAndRequestPermissions() {
    console.log(`🔄 [${Platform.OS.toUpperCase()}] Revérification des permissions...`);
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

      console.log(`💾 [${Platform.OS.toUpperCase()}] Sauvegarde du token en Firestore...`);

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
      console.log(`✅ [${Platform.OS.toUpperCase()}] Token sauvegardé avec succès`);
    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de la sauvegarde du token:`, error);
      throw error;
    }
  }

  /**
   * Configure les listeners de notifications
   */
  setupNotificationListeners() {
    console.log(`🎧 [${Platform.OS.toUpperCase()}] Configuration des listeners de notifications...`);

    // Listener pour les notifications reçues en foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log(`🔔 [${Platform.OS.toUpperCase()}] [FOREGROUND] Notification reçue:`, {
        messageId: remoteMessage.messageId,
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
        appState: this.appState
      });
      this.handleForegroundNotification(remoteMessage);
    });

    // Listener pour les notifications ouvertes depuis background/quit
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log(`👆 [${Platform.OS.toUpperCase()}] [BACKGROUND->FOREGROUND] Notification ouverte depuis background:`, {
        messageId: remoteMessage.messageId,
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
        appState: this.appState
      });
      this.handleNotificationOpened(remoteMessage, 'background');
    });

    // Vérifier si l'app a été ouverte depuis une notification (app fermée)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(`🚀 [${Platform.OS.toUpperCase()}] [QUIT->FOREGROUND] App ouverte depuis notification (app fermée):`, {
            messageId: remoteMessage.messageId,
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            data: remoteMessage.data,
            appState: this.appState
          });
          this.handleNotificationOpened(remoteMessage, 'quit');
        }
      });

    // Listener pour la mise à jour du token
    messaging().onTokenRefresh(async (token) => {
      console.log(`🔄 [${Platform.OS.toUpperCase()}] Token FCM mis à jour: ${token.substring(0, 20)}...`);
      if (this.currentUserId) {
        await this.cleanupOldTokens(token);
        await this.saveTokenToFirestore(token);
      }
    });

    // Listeners spécifiques pour Android avec Notifee
    if (Platform.OS === 'android') {
      console.log('🎧 [ANDROID] Configuration des listeners Notifee...');

      // Événements en foreground
      notifee.onForegroundEvent(({ type, detail }) => {
        console.log(`🔔 [ANDROID] [FOREGROUND] Événement Notifee:`, {
          type,
          eventName: this.getEventTypeName(type),
          notificationId: detail.notification?.id,
          title: detail.notification?.title,
          body: detail.notification?.body,
          data: detail.notification?.data,
          appState: this.appState
        });

        // Gérer les clics sur les notifications
        if (type === EventType.PRESS) {
          console.log(`👆 [ANDROID] [FOREGROUND] Click sur notification:`, detail.notification?.data);
          this.handleNotificationClick(detail.notification?.data || {}, 'foreground');
        }
      });

      // Événements en background
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        console.log(`🔔 [ANDROID] [BACKGROUND] Événement Notifee:`, {
          type,
          eventName: this.getEventTypeName(type),
          notificationId: detail.notification?.id,
          title: detail.notification?.title,
          body: detail.notification?.body,
          data: detail.notification?.data,
          appState: this.appState
        });

        // Gérer les clics sur les notifications en background
        if (type === EventType.PRESS) {
          console.log(`👆 [ANDROID] [BACKGROUND] Click sur notification:`, detail.notification?.data);
          this.handleNotificationClick(detail.notification?.data || {}, 'background');
        }
      });
    }

    // Listeners spécifiques pour iOS
    if (Platform.OS === 'ios') {
      console.log('🎧 [IOS] Configuration des listeners iOS...');

      // Pour iOS, on peut ajouter des listeners supplémentaires si nécessaire
      // Les interactions avec les notifications iOS sont gérées par Firebase Messaging
    }

    console.log(`✅ [${Platform.OS.toUpperCase()}] Listeners configurés avec succès`);
  }

  /**
   * Convertit le type d'événement Notifee en nom lisible
   */
  private getEventTypeName(type: EventType): string {
    switch (type) {
      case EventType.DISMISSED: return 'DISMISSED';
      case EventType.PRESS: return 'PRESS';
      case EventType.ACTION_PRESS: return 'ACTION_PRESS';
      case EventType.DELIVERED: return 'DELIVERED';
      case EventType.APP_BLOCKED: return 'APP_BLOCKED';
      case EventType.CHANNEL_BLOCKED: return 'CHANNEL_BLOCKED';
      case EventType.CHANNEL_GROUP_BLOCKED: return 'CHANNEL_GROUP_BLOCKED';
      case EventType.TRIGGER_NOTIFICATION_CREATED: return 'TRIGGER_NOTIFICATION_CREATED';
      case EventType.UNKNOWN: return 'UNKNOWN';
      default: return `UNKNOWN_${type}`;
    }
  }

  /**
   * Gère les notifications reçues en foreground
   */
  async handleForegroundNotification(remoteMessage: any) {
    try {
      console.log(`🔔 [${Platform.OS.toUpperCase()}] [FOREGROUND] Affichage de la notification...`);

      console.log('remoteMessage', remoteMessage);
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
          vibrationPattern: [300, 500],
          sound: 'default',
          ongoing: false,
          onlyAlertOnce: false,
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
      const notificationId = await notifee.displayNotification(notification);
      console.log('notificationId', notificationId);
      console.log(`✅ [${Platform.OS.toUpperCase()}] [FOREGROUND] Notification affichée avec succès`);

    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] [FOREGROUND] Erreur lors de l'affichage de la notification:`, error);
    }
  }

  /**
   * Gère l'ouverture d'une notification
   */
  handleNotificationOpened(remoteMessage: any, source: 'background' | 'quit') {
    console.log(`👆 [${Platform.OS.toUpperCase()}] [${source.toUpperCase()}] Navigation depuis notification:`, {
      data: remoteMessage.data,
      source,
      appState: this.appState
    });

    this.handleNotificationClick(remoteMessage.data || {}, source);
  }

  /**
   * Gère les clics sur les notifications
   */
  private handleNotificationClick(data: any, source: 'foreground' | 'background' | 'quit') {
    console.log(`👆 [${Platform.OS.toUpperCase()}] [${source.toUpperCase()}] Click sur notification traité:`, {
      data,
      source,
      appState: this.appState
    });

    if (data?.action === PushNotificationsActionsEnum.view_appointment) {
      console.log(`📅 [${Platform.OS.toUpperCase()}] [${source.toUpperCase()}] Navigation vers Appointments`);
      navigate('Appointments');
    }

    if (data?.action === PushNotificationsActionsEnum.view_chat) {
      console.log(`💬 [${Platform.OS.toUpperCase()}] [${source.toUpperCase()}] Navigation vers ChatList`);
      console.log('getCurrentRoute()', getCurrentRoute());
      if(getCurrentRoute()?.name !== 'ChatList' && getCurrentRoute()?.name !== 'ChatScreen'){
        navigate('ChatList');
        return;
      }
    }
  }

  /**
   * Nettoie les anciens tokens de cet appareil
   * @param {string} currentToken - Le token actuel à conserver
   */
  async cleanupOldTokens(currentToken?: string) {
    try {
      if (!this.currentUserId) {
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Pas d'utilisateur connecté pour le nettoyage`);
        return;
      }

      console.log(`🧹 [${Platform.OS.toUpperCase()}] Nettoyage des anciens tokens...`);

      const userDocRef = doc(firestore, 'fcmTokens', this.currentUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`📄 [${Platform.OS.toUpperCase()}] Aucun document de tokens trouvé`);
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];

      console.log(`📊 [${Platform.OS.toUpperCase()}] Tokens existants: ${existingTokens.length}`);

      // Identifier les tokens à supprimer
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        const isSamePlatform = tokenData.platform === Platform.OS;
        const isSameVersion = tokenData.version === Platform.Version;
        const isDifferentToken = currentToken ? tokenData.token !== currentToken : true;

        return isSamePlatform && isSameVersion && isDifferentToken;
      });

      console.log(`🗑️ [${Platform.OS.toUpperCase()}] Tokens à supprimer: ${tokensToRemove.length}`);

      // Supprimer les anciens tokens
      for (const tokenToRemove of tokensToRemove) {
        await updateDoc(userDocRef, {
          tokens: arrayRemove(tokenToRemove),
        });
      }

      // Nettoyer aussi le storage local si nécessaire
      const oldToken = await AsyncStorage.getItem('fcm_token');
      if (oldToken && oldToken !== currentToken) {
        console.log(`🧹 [${Platform.OS.toUpperCase()}] Suppression de l'ancien token du storage local`);
        await AsyncStorage.removeItem('fcm_token');
      }

      console.log(`✅ [${Platform.OS.toUpperCase()}] Nettoyage des tokens terminé`);

    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors du nettoyage des anciens tokens:`, error);
    }
  }

  /**
   * Supprime le token actuel (lors de la déconnexion)
   */
  async removeCurrentToken() {
    try {
      console.log(`🗑️ [${Platform.OS.toUpperCase()}] Suppression du token actuel...`);
      if (!this.currentUserId) {
        console.warn(`⚠️ [${Platform.OS.toUpperCase()}] Pas d'utilisateur connecté pour la suppression`);
        return;
      }

      const userDocRef = doc(firestore, 'fcmTokens', this.currentUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`📄 [${Platform.OS.toUpperCase()}] Aucun document de tokens trouvé pour la suppression`);
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];

      // Trouver les tokens de cet appareil
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        return tokenData.platform === Platform.OS &&
          tokenData.version === Platform.Version;
      });

      console.log(`🗑️ [${Platform.OS.toUpperCase()}] Suppression de ${tokensToRemove.length} tokens de cet appareil`);

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

      console.log(`✅ [${Platform.OS.toUpperCase()}] Token supprimé avec succès`);

    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de la suppression du token:`, error);
    }
  }

  /**
   * Récupère tous les tokens d'un utilisateur
   */
  async getUserTokens(userId: string) {
    try {
      console.log(`📋 [${Platform.OS.toUpperCase()}] Récupération des tokens pour l'utilisateur: ${userId}`);

      const userDocRef = doc(firestore, 'fcmTokens', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`📄 [${Platform.OS.toUpperCase()}] Aucun token trouvé pour l'utilisateur`);
        return [];
      }

      const userData = userDoc.data();
      const tokens = userData.tokens || [];

      console.log(`📊 [${Platform.OS.toUpperCase()}] ${tokens.length} tokens trouvés pour l'utilisateur`);
      return tokens;
    } catch (error) {
      console.error(`❌ [${Platform.OS.toUpperCase()}] Erreur lors de la récupération des tokens utilisateur:`, error);
      return [];
    }
  }

  /**
   * Vérifie si le service est initialisé
   */
  isServiceInitialized() {
    const initialized = this.isInitialized;
    console.log(`🔍 [${Platform.OS.toUpperCase()}] Service initialisé: ${initialized}`);
    return initialized;
  }

  /**
   * Obtient l'ID utilisateur actuel
   */
  getCurrentUserId() {
    console.log(`🔍 [${Platform.OS.toUpperCase()}] Utilisateur actuel: ${this.currentUserId}`);
    return this.currentUserId;
  }

  /**
   * Obtient le token actuel
   */
  getCurrentToken() {
    const token = this.currentToken;
    console.log(`🔍 [${Platform.OS.toUpperCase()}] Token actuel: ${token ? token.substring(0, 20) + '...' : 'null'}`);
    return token;
  }
}

// Export d'une instance singleton
export default new NotificationService();