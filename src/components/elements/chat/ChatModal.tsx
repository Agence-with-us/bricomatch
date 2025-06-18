import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ChatScreen from '../../../screens/chat/ChatScreen';

interface ChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  chatId?: string;
  otherUser?: any;
  appointment?: any;
}

const ChatModal: React.FC<ChatModalProps> = ({ 
  isVisible, 
  onClose, 
  chatId, 
  otherUser,
  appointment
}) => {
  const [modalHeight, setModalHeight] = useState(Dimensions.get('window').height * 0.8);
  const navigation = useNavigation();

  useEffect(() => {
    const updateModalHeight = () => {
      // Adjust modal height based on device orientation
      const { height, width } = Dimensions.get('window');
      const isLandscape = width > height;
      
      if (isLandscape) {
        setModalHeight(height * 0.9);
      } else {
        setModalHeight(height * 0.8);
      }
    };

    // Update on mount
    updateModalHeight();

    // Update on orientation change
    const subscription = Dimensions.addEventListener('change', updateModalHeight);

    return () => {
      subscription.remove();
    };
  }, []);

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <Pressable 
          style={styles.backdrop} 
          onPress={onClose}
        >
          <ScrollView />
        </Pressable>
        
        <View 
          style={[
            styles.modalView,
            { 
              height: modalHeight,
              marginTop: statusBarHeight + 20 
            }
          ]}
        >
          <ChatScreen 
            appointment={appointment || { chatId, user: otherUser }}
            containerStyle={styles.chatContainer}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  chatContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});

export default ChatModal;