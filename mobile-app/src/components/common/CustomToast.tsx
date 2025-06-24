import React from 'react';
import { View, Text } from 'react-native';

interface CustomToastProps {
  text1?: string;
  text2?: string;
  props: { type: 'success' | 'error' };
}

export default function CustomToast({ text1, text2, props }: CustomToastProps) {
  return (
    <View
      style={{
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 20,
        backgroundColor: props.type === 'success' ? '#ECFDF5' : '#FEE2E2',
        borderWidth: 1,
        borderColor: props.type === 'success' ? '#34D399' : '#F87171',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        alignItems: 'center',
        maxWidth: '95%',
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: props.type === 'success' ? '#15803D' : '#B91C1C',
          textAlign: 'center',
        }}
      >
        {text1}
      </Text>
      {text2 ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: '#222',
            textAlign: 'center',
            marginTop: 6,
          }}
          numberOfLines={10}
        >
          {text2}
        </Text>
      ) : null}
    </View>
  );
} 