import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GoBack from '../common/GoBack'; // Ajustez le chemin selon votre structure

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
const FixedHeader = ({
   title,
  showBackButton = true,
  onBackPress,
  rightComponent,
  customClasses = "",
}) => {
  return (
    <View className={`pt-12 px-2.5 bg-white ${customClasses}`}>
      <View className="w-full flex-row justify-between items-center mb-5">
        {showBackButton ? <GoBack onPress={onBackPress} /> : <View />}
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

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 48, // Pour la status bar
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSection: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
});

export default FixedHeader;