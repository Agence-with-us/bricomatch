import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Assurez-vous d'avoir installé react-native-vector-icons

const StarRating = ({ averageRating, reviewsCount }) => {
  const fullStars = Math.floor(averageRating || 0); // Nombre d'étoiles pleines
  const hasHalfStar = (averageRating || 0) % 1 >= 0.5; // Vérifie si une demi-étoile doit être ajoutée

  return (
    <View className="flex-row items-center mt-0.5 p-1">
      {Array.from({ length: fullStars }).map((_, index) => (
        <FontAwesome key={index} name="star" size={16} color="#FFC107" />
      ))}
      {hasHalfStar && <FontAwesome name="star-half-empty" size={16} color="#FFC107" />}
      <Text className="text-muted font-semibold ml-1">{averageRating?.toFixed(1) || 0}</Text>
      <Text className="text-muted/90 ml-1.5">{reviewsCount || 0} avis</Text>
    </View>
  );
};

export default StarRating;
