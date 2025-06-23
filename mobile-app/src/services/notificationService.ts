import messaging from '@react-native-firebase/messaging';
import { firestore } from '../config/firebase.config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  updateDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

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
      console.log('🔔 Initialisation du service de notifications pour:', userId);

      if (!userId) {
        throw new Error('User ID requis pour initialiser les notifications');
      }

      this.currentUserId = userId;

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
      console.log('✅ Service de notifications initialisé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des notifications:', error);
      return false;
    }
  }

  /**
   * Demande les permissions de notifications
   */
  async requestPermission() {
    try {
      console.log('🔔 Vérification des permissions de notifications');

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
          console.log('❌ Permission Android pour les notifications refusée');
          return false;
        }
      }

      // Demander les permissions Firebase
      console.log('🔔 Demande de permissions Firebase');
      const authStatus = await messaging().requestPermission({
        sound: true,
        announcement: true,
        badge: true,
        carPlay: true,
        criticalAlert: true,
        provisional: false,
        alert: true,
      });

      console.log('🔔 Statut d\'autorisation Firebase:', authStatus);

      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Permissions de notifications accordées');
        return true;
      } else {
        console.log('❌ Permissions de notifications refusées');
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
      console.log('📋 Statut des permissions actuel:', authStatus);

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
      console.log('🔔 Token FCM obtenu:', token.substring(0, 20) + '...');
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

      console.log('💾 Token ajouté au document de l utilisateur:', this.currentUserId);
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
      console.log('📨 Notification reçue en foreground:', remoteMessage);
      this.handleForegroundNotification(remoteMessage);
    });

    // Listener pour les notifications ouvertes depuis background/quit
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📱 Notification ouverte depuis background:', remoteMessage);
      this.handleNotificationOpened(remoteMessage);
    });

    // Vérifier si l'app a été ouverte depuis une notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('🚀 App ouverte depuis une notification:', remoteMessage);
          this.handleNotificationOpened(remoteMessage);
        }
      });

    // Listener pour la mise à jour du token
    messaging().onTokenRefresh(async (token) => {
      console.log('🔄 Token FCM mis à jour:', token.substring(0, 20) + '...');
      if (this.currentUserId) {
        await this.cleanupOldTokens(token);
        await this.saveTokenToFirestore(token);
      }
    });
  }

  /**
   * Gère les notifications reçues en foreground
   */
  handleForegroundNotification(remoteMessage: any) {
    console.log('Traitement notification foreground:', remoteMessage.notification?.title);
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
        console.log('📋 Aucun document de tokens existant');
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];

      console.log('🔍 Tokens existants:', existingTokens.length);

      // Identifier les tokens à supprimer
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        // Supprimer les tokens de la même plateforme ET du même appareil
        const isSamePlatform = tokenData.platform === Platform.OS;
        const isSameVersion = tokenData.version === Platform.Version;
        const isDifferentToken = currentToken ? tokenData.token !== currentToken : true;

        // Supprimer si c'est le même appareil mais un token différent
        return isSamePlatform && isSameVersion && isDifferentToken;
      });

      console.log('🗑️ Tokens à supprimer:', tokensToRemove.length);

      // Supprimer les anciens tokens
      for (const tokenToRemove of tokensToRemove) {
        await updateDoc(userDocRef, {
          tokens: arrayRemove(tokenToRemove),
        });
        console.log('🧹 Token supprimé:', tokenToRemove.token.substring(0, 20) + '...');
      }

      // Nettoyer aussi le storage local si nécessaire
      const oldToken = await AsyncStorage.getItem('fcm_token');
      if (oldToken && oldToken !== currentToken) {
        await AsyncStorage.removeItem('fcm_token');
        console.log('🧹 Ancien token supprimé du storage local');
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
      if (!this.currentUserId) {
        console.warn('⚠️ Pas d\'utilisateur connecté pour la suppression');
        return;
      }

      const userDocRef = doc(firestore, 'fcmTokens', this.currentUserId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('📋 Aucun document de tokens à nettoyer');
        return;
      }

      const userData = userDoc.data();
      const existingTokens = userData.tokens || [];

      // Trouver les tokens de cet appareil
      const tokensToRemove = existingTokens.filter((tokenData: any) => {
        return tokenData.platform === Platform.OS && 
               tokenData.version === Platform.Version;
      });

      console.log('🗑️ Suppression de', tokensToRemove.length, 'token(s)');

      // Supprimer tous les tokens de cet appareil
      for (const tokenToRemove of tokensToRemove) {
        await updateDoc(userDocRef, {
          tokens: arrayRemove(tokenToRemove),
        });
        console.log('🗑️ Token supprimé lors de la déconnexion:', tokenToRemove.token.substring(0, 20) + '...');
      }

      // Nettoyage local
      await AsyncStorage.removeItem('fcm_token');
      console.log('🧹 Storage local nettoyé');

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