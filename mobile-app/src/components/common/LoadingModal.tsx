import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

/**
 * Composant LoadingModal
 * @param {boolean} visible - Contrôle la visibilité du modal
 * @param {string} message - Message à afficher (optionnel)
 * @param {string} loadingColor - Couleur de l'indicateur de chargement (optionnel)
 * @param {string} textColor - Couleur du texte (optionnel)
 * @param {string} backgroundColor - Couleur de fond du conteneur (optionnel)
 * @param {string} overlayColor - Couleur de l'overlay (optionnel)
 * @param {string} loadingSize - Taille de l'indicateur de chargement (optionnel)
 */
const LoadingModal = ({
  visible = false,
  message = 'Chargement en cours...',
  loadingColor = '#FF7F00', // Orange BricoMatch
  textColor = '#4B5563', // Gris foncé
  backgroundColor = '#FFFFFF',
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  loadingSize = 'large',
}) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View 
        style={[styles.overlay, { backgroundColor: overlayColor }]}
      >
        <View 
          style={[
            styles.modalContainer, 
            { backgroundColor },
            Platform.OS === 'ios' ? styles.iosShadow : styles.androidShadow
          ]}
        >
            {/* @ts-ignore */}
          <ActivityIndicator size={loadingSize} color={loadingColor} />
          {message && (
            <Text style={[styles.loadingText, { color: textColor }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Version simplifiée avec un design minimaliste
export const SimpleLoadingModal = ({
  visible = false,
  message = 'Chargement en cours...',
  loadingColor = '#FF7F00',
}) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.simpleOverlay}>
        <View style={styles.simpleContainer}>
          <ActivityIndicator size="large" color={loadingColor} />
          {message && (
            <Text style={styles.simpleText}>{message}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Version avec indicateur personnalisé (points de chargement)
export const DotsLoadingModal = ({
  visible = false,
  message = 'Chargement en cours',
  dotColor = '#FF7F00',
  backgroundColor = '#FFFFFF',
  overlayColor = 'rgba(0, 0, 0, 0.5)',
}) => {
  const [dots, setDots] = React.useState('...');
  
  React.useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <View 
          style={[
            styles.modalContainer, 
            { backgroundColor },
            Platform.OS === 'ios' ? styles.iosShadow : styles.androidShadow
          ]}
        >
          <Text style={[styles.dotsText, { color: dotColor }]}>
            {message}{dots}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '70%',
    maxWidth: '80%',
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  androidShadow: {
    elevation: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  simpleOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  simpleText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dotsText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LoadingModal;