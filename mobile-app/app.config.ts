import 'dotenv/config';

export default {
  expo: {
    name: 'Bricomatch',
    slug: 'Bricomatch',
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
      googleServicesFile: './src/fichier-sensibles/GoogleService-Info.plist',
      bitcode: false,
      buildNumber: '14',
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
      googleServicesFile: './src/fichier-sensibles/google-services.json',
      versionCode: 6,
      adaptiveIcon: {
        foregroundImage: './assets/icon-bricomatch-1024.png',
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
      googleSignInIOSClientId: process.env.GOOGLE_SIGN_IN_IOS_CLIENT_ID,
      googleSignInIOSUrlSchema: "com.googleusercontent.apps.312593652235-uc1oku08gc6jcotklkin18a6j68c9omv",
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
          iosUrlScheme: "com.googleusercontent.apps.312593652235-uc1oku08gc6jcotklkin18a6j68c9omv"
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
          android: {
            compileSdkVersion: 34, // Ajouté
            targetSdkVersion: 34,  // Ajouté
            buildToolsVersion: "34.0.0" // Ajouté
          },
          ios: {
            useFrameworks: "static",
            deploymentTarget: "15.1"
          },
        }
      ]
    ],
    scheme: "bricomatch"
  },
};