import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LogoSpinner from '../../common/LogoSpinner';

// Configuration de Google Sign-In
GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleSignInWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleSignInIOSClientId,
  offlineAccess: true,
});

interface GoogleSignInComponentProps {
  onSignInSuccess?: (userData: any) => void;
  onSignInFailure?: (error: any) => void;
}

const GoogleSignInComponent: React.FC<GoogleSignInComponentProps> = ({ onSignInSuccess, onSignInFailure }) => {

  const [loading, setLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    try {

      setLoading(true);

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo) {
        if (onSignInSuccess) {
          onSignInSuccess(userInfo);
        }
      }
    } catch (error: any) {
      console.error("Google SignIn Error: ", error.message);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // L'utilisateur a annulé le processus de connexion
      } else if (error.code === statusCodes.IN_PROGRESS) {

        // Le processus est déjà en cours
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {

        // Les services Google Play ne sont pas disponibles
      } else {
        // Autre erreur

      }
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <View className="items-center ">

      {/* Bouton Google Sign-In */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        className="rounded-[30px] bg-red-500 w-full items-center justify-center h-14 mt-2 flex-row"
        disabled={loading}
      >
        <Icon name="google" size={24} color="white" style={{ marginRight: 10 }} />
        <Text className="text-white font-bold text-base">Continuer avec Google</Text>
      </TouchableOpacity>

      {/* Loader */}
      <LogoSpinner
        visible={loading}
        message="Connexion en cours..."
        rotationDuration={1500}

      />
    </View>
  );
};

export default GoogleSignInComponent;
