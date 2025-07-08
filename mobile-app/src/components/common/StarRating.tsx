import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type StarRatingProps = {
  averageRating?: number;
  reviewsCount?: number;
  variant?: 'default' | 'compact' | 'detailed' | 'minimal' | 'badge';
};

const StarRating: React.FC<StarRatingProps> = ({
  averageRating = 0,
  reviewsCount = 0,
  variant = 'default'
}) => {
  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const renderStars = (size: number = 16, showEmpty: boolean = false) => (
    <>
      {/* Étoiles pleines */}
      {Array.from({ length: fullStars }).map((_, index) => (
        <FontAwesome key={`full-${index}`} name="star" size={size} color="#FFC107" />
      ))}

      {/* Demi-étoile */}
      {hasHalfStar && (
        <FontAwesome name="star-half-empty" size={size} color="#FFC107" />
      )}

      {/* Étoiles vides (si demandées) */}
      {showEmpty && Array.from({ length: emptyStars }).map((_, index) => (
        <FontAwesome key={`empty-${index}`} name="star-o" size={size} color="#D1D5DB" />
      ))}
    </>
  );

  switch (variant) {
    case 'compact':
      return (
        <View className="flex-col items-center">
          <Text className="text-sm font-semibold text-gray-600 ml-1">
            {reviewsCount} avis
          </Text>
          <View className="flex-row items-center">
            {renderStars(15)}
            <Text className="text-sm font-semibold text-gray-600 mr-1">({averageRating.toFixed(1)})
            </Text>
          </View>

        </View>
      );

    case 'detailed':
      return (
        <View className="bg-gray-50 p-3 rounded-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              {renderStars(18, true)}
            </View>
            <Text className="text-lg font-bold text-gray-800">
              {averageRating.toFixed(1)}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 text-center">
            Basé sur {reviewsCount} avis client{reviewsCount > 1 ? 's' : ''}
          </Text>
        </View>
      );

    case 'minimal':
      return (
        <View className="flex-row items-center">
          <FontAwesome name="star" size={14} color="#FFC107" />
          <Text className="text-sm text-gray-700 ml-1">
            {averageRating.toFixed(1)}
          </Text>
        </View>
      );

    case 'badge':
      return (
        <View className="bg-yellow-100 px-3 py-1 rounded-full flex-row items-center">
          <FontAwesome name="star" size={12} color="#F59E0B" />
          <Text className="text-sm font-semibold text-yellow-800 ml-1">
            {averageRating.toFixed(1)}
          </Text>
          <Text className="text-xs text-yellow-600 ml-1">
            ({reviewsCount})
          </Text>
        </View>
      );

    default: // 'default'
      return (
        <View className="flex-row items-center mt-0.5 p-1">
          {renderStars(16)}
          <Text className="text-muted font-semibold ml-1">
            {averageRating.toFixed(1)}
          </Text>
          <Text className="text-muted/90 ml-1.5">
            {reviewsCount} avis
          </Text>
        </View>
      );
  }
};

export default StarRating;

// Exemple d'utilisation :
/*
<StarRating averageRating={4.3} reviewsCount={127} variant="default" />
<StarRating averageRating={4.3} reviewsCount={127} variant="compact" />
<StarRating averageRating={4.3} reviewsCount={127} variant="detailed" />
<StarRating averageRating={4.3} reviewsCount={127} variant="minimal" />
<StarRating averageRating={4.3} reviewsCount={127} variant="badge" />
*/