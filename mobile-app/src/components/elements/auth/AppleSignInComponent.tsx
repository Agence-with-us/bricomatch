import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LogoSpinner from '../../common/LogoSpinner';

interface AppleSignInComponentProps {
  onSignInSuccess?: (userData: any) => void;
  onSignInFailure?: (error: any) => void;
}

const AppleSignInComponent: React.FC<AppleSignInComponentProps> = ({ onSignInSuccess, onSignInFailure }) => {
  const [loading, setLoading] = useState<boolean>(false);

  // Vérifier si l'appareil prend en charge Sign in with Apple
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState<boolean>(false);

  // Vérifier la disponibilité au chargement du composant
  React.useEffect(() => {
    const checkAvailability = async () => {
      const availability = await AppleAuthentication.isAvailableAsync();
      setIsAppleSignInAvailable(availability);
    };

    checkAvailability();
  }, []);

  const handleAppleSignIn = async () => {
    if (!isAppleSignInAvailable) {
      if (onSignInFailure) {
        onSignInFailure(new Error("L'authentification Apple n'est pas disponible sur cet appareil"));
      }
      return;
    }

    try {
      setLoading(true);

      // Effectuer la demande d'authentification Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Formater les données pour qu'elles soient compatibles avec le format attendu par la saga
      const userData = {
        data: {
          idToken: credential.identityToken,
          user: {
            givenName: credential.fullName?.givenName || '',
            familyName: credential.fullName?.familyName || '',
            email: credential.email || '',
            photo: '', // Apple ne fournit pas de photo
            id: credential.user
          }
        }
      };

      if (onSignInSuccess) {
        onSignInSuccess(userData);
      }
    } catch (error: any) {
      console.error("Erreur lors de l'authentification Apple:", error);

      // Gérer le cas où l'utilisateur annule l'authentification
      if (error.code === 'ERR_CANCELED') {
      } else if (onSignInFailure) {
        onSignInFailure(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Ne pas afficher le bouton si l'authentification Apple n'est pas disponible
  if (!isAppleSignInAvailable) {
    return null;
  }

  return (
    <View className="items-center">
      {Platform.OS === 'ios' && isAppleSignInAvailable ? (
        <>
         
          {/* Option 2: Bouton personnalisé similaire au style Google */}
          <TouchableOpacity
            onPress={handleAppleSignIn}
            className="rounded-[30px] bg-black w-full items-center justify-center h-14 mt-2 flex-row"
            disabled={loading}
          >
            <Icon name="apple" size={24} color="white" style={{ marginRight: 10 }} />
            <Text className="text-white font-bold text-base">Continuer avec Apple</Text>
          </TouchableOpacity>

          {/* Loader */}
          <LogoSpinner
            visible={loading}
            message="Traitement en cours..."
            rotationDuration={1500}

          />
        </>
      ) : null}
    </View>
  );
};

export default AppleSignInComponent;