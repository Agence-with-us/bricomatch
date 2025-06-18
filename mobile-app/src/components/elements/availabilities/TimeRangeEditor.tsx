import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // Assurez-vous d'installer ce package
import { TimeRange } from '../../../store/availability/types';
import { formatTime } from '../../../utils/availabilityUtils';



interface TimeRangeEditorProps {
  selectedDay: string;
  timeRanges: TimeRange[];
  onAddTimeRange: () => void;
  onUpdateTimeRange: (day: string, index: number, field: 'start' | 'end', value: string) => void;
  onRemoveTimeRange: (day: string, index: number) => void;
}

const TimeRangeEditor: React.FC<TimeRangeEditorProps> = ({
  selectedDay,
  timeRanges,
  onAddTimeRange,
  onUpdateTimeRange,
  onRemoveTimeRange
}) => {
  return (
    <View className="mt-6 bg-white p-4 rounded-xl shadow-md border border-gray-100">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-800">
          Disponibilités - {selectedDay}
        </Text>
        <TouchableOpacity 
          className="bg-green-500 py-2 px-3 rounded-lg flex-row items-center" 
          onPress={onAddTimeRange}
        >
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text className="text-white font-medium ml-1">Ajouter</Text>
        </TouchableOpacity>
      </View>

      {timeRanges.length > 0 ? (
        <View>
          {timeRanges.map((range, index) => (
            <TimeRangeItem
              key={index}
              range={range}
              index={index}
              selectedDay={selectedDay}
              onUpdateTimeRange={onUpdateTimeRange}
              onRemoveTimeRange={onRemoveTimeRange}
            />
          ))}
        </View>
      ) : (
        <View className="py-6 bg-gray-50 rounded-lg items-center">
          <Text className="text-gray-500 italic">
            Aucune plage horaire définie
          </Text>
          <TouchableOpacity 
            className="mt-2 bg-blue-100 py-2 px-4 rounded-lg" 
            onPress={onAddTimeRange}
          >
            <Text className="text-blue-600 font-medium">Définir des horaires</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

interface TimeRangeItemProps {
  range: TimeRange;
  index: number;
  selectedDay: string;
  onUpdateTimeRange: (day: string, index: number, field: 'start' | 'end', value: string) => void;
  onRemoveTimeRange: (day: string, index: number) => void;
}

const TimeRangeItem: React.FC<TimeRangeItemProps> = ({
  range,
  index,
  selectedDay,
  onUpdateTimeRange,
  onRemoveTimeRange
}) => {
  return (
    <View className="flex-row items-center justify-between bg-gray-50 p-4 my-2 rounded-lg border border-gray-100">
      <View className="flex-1 flex-row items-center space-x-2">
        <View className="flex-row items-center">
          <Icon name="clock" size={16} color="#6B7280" className="mr-1" />
          <Text className="text-gray-500 mr-2">De</Text>
        </View>
        <TextInput
          className="border border-gray-300 px-3 py-2 rounded-lg text-center w-20 bg-white"
          value={range.start}
          onChangeText={(value) => onUpdateTimeRange(selectedDay, index, 'start', formatTime(value))}
          placeholder="00:00"
          keyboardType="numeric"
          maxLength={5}
        />
      </View>

      <View className="flex-1 flex-row items-center justify-center space-x-2">
        <Text className="text-gray-500 mr-2">à</Text>
        <TextInput
          className="border border-gray-300 px-3 py-2 rounded-lg text-center w-20 bg-white"
          value={range.end}
          onChangeText={(value) => onUpdateTimeRange(selectedDay, index, 'end', formatTime(value))}
          placeholder="00:00"
          keyboardType="numeric"
          maxLength={5}
        />
      </View>

      <TouchableOpacity 
        className="bg-red-50 h-10 w-10 rounded-full items-center justify-center"
        onPress={() => onRemoveTimeRange(selectedDay, index)}
      >
        <Icon name="trash-2" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
};

export default TimeRangeEditor;