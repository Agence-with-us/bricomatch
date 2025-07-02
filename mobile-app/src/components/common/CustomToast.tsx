import React from 'react';
import { View, Text, Image } from 'react-native';
import logo from '../../../assets/icon.png';
interface CustomToastProps {
  text1?: string;
  text2?: string;
  props: { 
    type: 'success' | 'error' | 'notification_android_push';
  };
}

export default function CustomToast({ text1, text2, props }: CustomToastProps) {
  const isNotification = props.type === 'notification_android_push';
  const isSuccess = props.type === 'success';
  const isError = props.type === 'error';

  return (
    <View
      style={{
        borderRadius: isNotification ? 20 : 16,
        paddingVertical: isNotification ? 12 : 16,
        paddingHorizontal: isNotification ? 16 : 20,
        marginTop: isNotification ? 0 : 20,
        backgroundColor: isSuccess 
          ? '#ECFDF5' 
          : isError 
            ? '#FEE2E2' 
            : '#000', // Noir pour notification
        borderWidth: isNotification ? 0 : 1,
        borderColor: isSuccess ? '#34D399' : isError ? '#F87171' : '#ffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isNotification ? 1 : 2 },
        shadowOpacity: isNotification ? 0.08 : 0.15,
        shadowRadius: isNotification ? 4 : 8,
        elevation: isNotification ? 2 : 4,
        alignItems: isNotification ? 'flex-start' : 'center',
        maxWidth: '95%',
        // Style spécifique notification Android
        ...(isNotification && {
          borderLeftWidth: 4,
          borderLeftColor: '#3B82F6', // Bleu accent
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
        }),
      }}
    >
      {/* Logo pour les notifications */}
      {isNotification && (
        <View style={{ marginRight: 12 }}>
          <Image 
            source={logo}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4, // Léger arrondi comme les icônes d'app Android
            }}
            resizeMode="contain"
          />
        </View>
      )}
      
      {/* Contenu du texte */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: isNotification ? 16 : 18,
            fontWeight: isNotification ? '600' : 'bold',
            color: isSuccess 
              ? '#15803D' 
              : isError 
                ? '#B91C1C' 
                : '#fff', // Gris foncé pour notification
            textAlign: isNotification ? 'left' : 'center',
            marginBottom: isNotification && text2 ? 2 : 0,
          }}
        >
          {text1}
        </Text>
        {text2 ? (
          <Text
            style={{
              fontSize: isNotification ? 14 : 15,
              fontWeight: isNotification ? '400' : '500',
              color: isNotification ? '#fff' : '#222',
              textAlign: isNotification ? 'left' : 'center',
              marginTop: isNotification ? 0 : 6,
              lineHeight: isNotification ? 18 : undefined,
            }}
            numberOfLines={10}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}