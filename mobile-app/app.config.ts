import 'dotenv/config';

export default {
  expo: {
    name: 'Bricomatch',
    slug: 'bricomatch',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'cover',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bricomatch.app',
      bitcode: false,
      infoPlist: {
        NSCameraUsageDescription: "Cette application a besoin d'accéder à votre caméra pour les appels vidéo",
        NSMicrophoneUsageDescription: "Cette application a besoin d'accéder à votre microphone pour les appels audio",
        NSPhotoLibraryUsageDescription: "Cette application a besoin d'accéder à vos photos pour partager des médias pendant les appels",
        NSUserNotificationUsageDescription: "Cette application utilise les notifications pour vous envoyer des alertes importantes.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: 'com.bricomatch.app',
      googleServicesFile: './google-services.json',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#F95200',
      },
      permissions: [
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CAMERA",
        "android.permission.INTERNET",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WAKE_LOCK",
        "android.permission.BLUETOOTH",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiUrl: process.env.NODE_ENV === 'production' ? process.env.API_URL_PROD : process.env.API_URL_DEV,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseDatabaseURL: process.env.FIREBASE_DATABASE_URL,
      googleSignInWebClientId: process.env.GOOGLE_SIGN_IN_WEB_CLIENT_ID,
      googleSignInIOSUrlSchema: process.env.GOOGLE_SIGN_IN_IOS_URL_SCHEMA,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      }
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.GOOGLE_SIGN_IN_IOS_URL_SCHEMA
        }
      ],
      [
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission: "Cette application a besoin d'accéder à votre caméra pour les appels vidéo",
          microphonePermission: "Cette application a besoin d'accéder à votre microphone pour les appels audio"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        }
      ]
    ],
    scheme: "bricomatch"
  },
};