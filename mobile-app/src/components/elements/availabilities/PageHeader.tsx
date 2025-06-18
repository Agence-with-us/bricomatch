import React from 'react';
import { View, Text } from 'react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <View className="mb-6 mt-4">
      <Text className="text-2xl font-bold text-center text-gray-800">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-500 text-center mt-2">
          {subtitle}
        </Text>
      )}
      <View className="h-1 w-20 bg-orange-600 mx-auto mt-3 rounded-full" />
    </View>
  );
};

export default PageHeader;