import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatModal from './ChatModal';
import { useUnreadMessages } from './useUnreadMessages';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { initializeChatWithPro } from '../../../services/chatService';

interface ChatButtonProps {
  proUserId: string;
  proUserData?: any;
  label?: string;
  showIcon?: boolean;
  showBadge?: boolean;
  buttonStyle?: any;
  textStyle?: any;
}

const ChatButton: React.FC<ChatButtonProps> = ({
  proUserId,
  proUserData,
  label = 'Envoyer un message',
  showIcon = true,
  showBadge = true,
  buttonStyle,
  textStyle
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const { unreadByChat } = useUnreadMessages();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const handlePress = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      // Initialize or get existing chat with the pro
      const newChatId = await initializeChatWithPro(currentUser.id, proUserId);
      setChatId(newChatId);
      setIsChatVisible(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const unreadCount = chatId ? (unreadByChat[chatId] || 0) : 0;

  return (
    <>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={handlePress}
        disabled={isLoading}
      >
        {showIcon && (
          <Ionicons 
            name="chatbubble-ellipses-outline" 
            size={18} 
            color="#FFFFFF" 
            style={styles.icon} 
          />
        )}
        
        <Text style={[styles.text, textStyle]}>{label}</Text>
        
        {showBadge && unreadCount > 0 && (
          <Text style={styles.badge}>{unreadCount}</Text>
        )}
      </TouchableOpacity>

      <ChatModal
        isVisible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
        chatId={chatId || undefined}
        otherUser={proUserData}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    marginLeft: 8,
    paddingHorizontal: 4,
  },
});

export default ChatButton;