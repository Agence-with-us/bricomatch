import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Availability } from '../../../store/availability/types';

interface DaySelectorProps {
  daysOfWeek: string[];
  selectedDay: string | null;
  availabilities: Availability;
  onSelectDay: (day: string) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({
  daysOfWeek,
  selectedDay,
  availabilities,
  onSelectDay
}) => {
  return (
    <View className="mt-6">
      <Text className="text-gray-600 font-medium mb-3 text-center">
        Sélectionnez un jour pour gérer ses disponibilités
      </Text>
      <View className="flex flex-row flex-wrap justify-center">
        {daysOfWeek.map((day) => {
          // Détermine l'état du bouton : sélectionné, avec disponibilités ou vide
          const hasTimeRanges = availabilities?.[day]?.length > 0;
          const isSelected = selectedDay === day;
          
          return (
            <TouchableOpacity
              key={day}
              className={`px-4 py-3 m-1 rounded-lg ${
                isSelected 
                  ? 'bg-orange-600 border-2 border-orange-600' 
                  : hasTimeRanges 
                    ? 'bg-orange-50 border-2 border-orange-300' 
                    : 'bg-white border-2 border-gray-300'
              }`}
              onPress={() => onSelectDay(day)}
            >
              <Text 
                className={`font-medium ${
                  isSelected 
                    ? 'text-white' 
                    : hasTimeRanges 
                      ? 'text-orange-600' 
                      : 'text-gray-700'
                }`}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default DaySelector;