import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUnreadMessages } from './useUnreadMessages';
import { navigate } from '../../../services/navigationService';

interface ChatBadgeProps {
  size?: number;
  color?: string;
  showCount?: boolean;
  onPress?: () => void;
}

const ChatBadge: React.FC<ChatBadgeProps> = ({
  size = 24,
  color = '#0066CC',
  showCount = true,
  onPress
}) => {
  const { totalUnread, loading } = useUnreadMessages();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
    navigate('ChatList');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons name="chatbubble-ellipses" size={size} color={color} />
      
      {showCount && totalUnread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ChatBadge;