// components/UserInitials.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserInitialsProps {
  nom: string;
  prenom: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: object;
}

const UserInitials: React.FC<UserInitialsProps> = ({
  nom,
  prenom,
  size = 'md',
  style = {}
}) => {
  // Extraire les initiales
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

  // Déterminer les tailles en fonction du paramètre size
  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { width: 32, height: 32, fontSize: 14 };
      case 'lg':
        return { width: 64, height: 64, fontSize: 20 };
      case 'xl':
        return { width: 124, height: 124, fontSize: 30 };
      case 'md':
      default:
        return { width: 48, height: 48, fontSize: 18 };
    }
  };

  // Générer une couleur de fond basée sur le nom (pour avoir une couleur cohérente par utilisateur)
  const getBackgroundColor = () => {
    const colors = [
      '#3498db', '#2ecc71', '#f1c40f',
      '#9b59b6', '#e91e63', '#5c6bc0',
      '#e74c3c', '#1abc9c', '#ff9800'
    ];

    // Utiliser la somme des codes caractères du nom comme seed
    const seed = (nom + prenom).split('').reduce(
      (sum, char) => sum + char.charCodeAt(0), 0
    );

    return colors[seed % colors.length];
  };

  const sizeStyle = getSizeStyle();

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeStyle.width,
          height: sizeStyle.height,
          backgroundColor: getBackgroundColor(),
        },
        style
      ]}
      accessibilityLabel={`Initiales de ${prenom} ${nom}`}
    >
      <Text style={[styles.text, { fontSize: sizeStyle.fontSize }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 100, // valeur élevée pour s'assurer que c'est un cercle
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: '600',
  }
});

export default UserInitials;