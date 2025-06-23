import React from 'react';
import { View, Text } from 'react-native';
import GoBack from '../common/GoBack'; // Ajustez le chemin selon votre structure
import { navigate, navigationRef } from '../../services/navigationService';

/**
 * Composant FixedHeader
 * @param {string} title - Titre à afficher dans le header
 * @param {boolean} showBackButton - Afficher ou non le bouton retour (défaut: true)
 * @param {function} onBackPress - Fonction personnalisée pour le bouton retour
 * @param {React.ReactNode} rightComponent - Composant à afficher à droite (optionnel)
 * @param {object} style - Style personnalisé pour le container
 * @param {object} titleStyle - Style personnalisé pour le titre
 * @param {string} backgroundColor - Couleur de fond du header
 */
interface FixedHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  customClasses?: string;
}

const FixedHeader: React.FC<FixedHeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  rightComponent,
  customClasses = "",
}) => {
  // Fallback pour onBackPress si non fourni
  const handleBack = onBackPress || (() => {
    if (navigationRef.current && navigationRef.current.canGoBack()) {
      navigationRef.current.goBack();
    } else {
      navigate('Home');
    }
  });
  return (
    <View className={`pt-12 px-2.5 bg-white ${customClasses}`}>
      <View className="w-full flex-row justify-between items-center mb-5">
        {showBackButton ? <GoBack onGoBack={handleBack} /> : <View />}
        <Text className="text-muted text-xl font-bold flex-1 text-center">
          {title}
        </Text>
        <View className="w-6">
          {rightComponent}
        </View>
      </View>
    </View>
  );
};



export default FixedHeader;