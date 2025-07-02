import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  ref as dbRef,
  push,
  onValue,
  update,
  query,
  orderByChild,
  get
} from 'firebase/database';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootState } from '../../store/store';
import { Message } from '../../store/chat/types';
import { useSelector } from 'react-redux';
import { database, storage } from '../../config/firebase.config';
import UserInitials from '../../components/elements/users/UserInitials';
import {  formatFullDateTimeFromTimeStamp } from '../../utils/appointmentUtils';
import GoBack from '../../components/common/GoBack';
import { showToast } from '../../utils/toastNotification';
import { UserLocal } from '../../store/users/types';
import { RootStackParamList } from '../../types/RootStackParamList';
import LogoSpinner from '../../components/common/LogoSpinner';
import axiosInstance from '../../config/axiosInstance';

type ChatScreenProps = {
  chat?: { chatId: string; otherUserInfo: UserLocal };
  containerStyle?: any;
  isModalMode?: boolean;
  onClose?: () => void;
};

const ChatScreen: React.FC<ChatScreenProps> = ({
  chat,
  containerStyle,
  onClose,
  isModalMode = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ChatScreen'>>();


  // Get parameters from route or props
  const providedChatId = chat?.chatId || route.params.chat?.chatId;
  const otherUser = chat?.otherUserInfo || route.params.chat?.otherUserInfo;


  // Effect pour initialiser le chatId
  useEffect(() => {
    const initializeChatId = async () => {
      if (!currentUser?.id || !otherUser?.id) {
        setIsLoading(false);
        return;
      }
      try {
        let chatId: string | null = null;

        if (providedChatId) {
          // Si un chatId est fourni, l'utiliser directement
          chatId = providedChatId;
          console.log('Utilisation du chatId fourni:', chatId);
        } else {
          // Sinon, chercher le chat existant
          console.log('Recherche du chat entre:', currentUser.id, 'et', otherUser.id);
          chatId = await findExistingChat(otherUser.id);
        }

        if (chatId) {

          setCurrentChatId(chatId);
          console.log('Chat ID défini:', chatId);
        } else {
          console.log('Aucun chat trouvé');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du chat:', error);
        setIsLoading(false);
      }
    };

    initializeChatId();
  }, [currentUser, otherUser, providedChatId]);

  useEffect(() => {
    if (!currentUser || !currentChatId) return;


    // Mark user as "read up to this point" when entering chat
    const userChatRef = dbRef(database, `chats/${currentChatId}/participants/${currentUser.id}`);
    update(userChatRef, {
      lastRead: Date.now()
    });

    // Listen for new messages
    const messagesRef = query(
      dbRef(database, `messages/${currentChatId}`),
      orderByChild('timestamp')
    );

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const messagesData = snapshot.val();
      const loadedMessages: Message[] = Object.keys(messagesData).map(key => ({
        id: key,
        ...messagesData[key]
      }));

      // Sort messages by timestamp
      loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(loadedMessages);
      setIsLoading(false);

      // Mark messages as read if they're from the other user
      markMessagesAsRead(loadedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [currentChatId, currentUser]);


  // Fonction pour trouver le chat existant entre deux utilisateurs (si n'est pas fourné : modal de appelle)
  const findExistingChat = async (otherUserId: string): Promise<string | null> => {
    try {
      // Reference to the current user's chats (même logique que votre exemple)
      const userChatsRef = dbRef(database, `user-chats/${currentUser?.id}`);
      const userChatsSnapshot = await get(userChatsRef);

      if (!userChatsSnapshot.exists()) {
        showToast('Aucun chat trouvé pour l\'utilisateur', 'Veuillez d\'abord créer un chat', 'error')
        return null;
      }

      const userChatIds = Object.keys(userChatsSnapshot.val());

      // Parcourir tous les chats de l'utilisateur
      for (const chatId of userChatIds) {
        // Get chat details
        const chatRef = dbRef(database, `chats/${chatId}`);
        const chatSnapshot = await get(chatRef);
        const chatData = chatSnapshot.val();

        if (!chatData) continue;

        // Find the other participant
        const otherParticipantId = Object.keys(chatData.participants).find(id => id !== currentUser?.id);

        if (!otherParticipantId) continue;

        // Vérifier si c'est l'utilisateur recherché
        if (otherParticipantId === otherUserId) {
          return chatId;
        }
      }
      showToast('Aucun chat trouvé pour l\'utilisateur', 'Veuillez d\'abord créer un chat', 'error')

      return null;
    } catch (error) {
      showToast('Erreur lors de la recherche du chat:', 'Veuillez réessayer plus tard', 'error')

      return null;
    }
  };

  const markMessagesAsRead = (messages: Message[]) => {
    if (!currentUser || !currentChatId) return;

    // Get the timestamp of the most recent message
    const latestTimestamp = Math.max(
      ...messages
        .filter(msg => msg.senderId !== currentUser.id)
        .map(msg => msg.timestamp)
    );

    // Update the user's lastRead timestamp in the chat
    if (latestTimestamp && !isNaN(latestTimestamp)) {
      const userChatRef = dbRef(database, `chats/${currentChatId}/participants/${currentUser.id}`);
      update(userChatRef, {
        lastRead: latestTimestamp
      });
    }

    // Mark individual unread messages as read
    messages.forEach(message => {
      if (message.senderId !== currentUser.id && !message.read) {
        const messageRef = dbRef(database, `messages/${currentChatId}/${message.id}`);
        update(messageRef, { read: true });
      }
    });
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !currentUser || !currentChatId) return;

    const timestamp = Date.now();
    let imageUrl = null;

    // If there's a selected image, upload it first
    if (selectedImage) {
      setIsUploading(true);
      try {
        const filename = `${currentChatId}/${currentUser.id}_${timestamp}.jpg`;
        const imageRef = storageRef(storage, `chat_images/${filename}`);

        // Convert the image URI to a blob
        const response = await fetch(selectedImage);
        const blob = await response.blob();

        // Upload the blob
        await uploadBytes(imageRef, blob);

        // Get the download URL
        imageUrl = await getDownloadURL(imageRef);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setSelectedImage(null);
    }

    // Create the message object
    const messageData: Partial<Message> = {
      senderId: currentUser.id,
      timestamp,
      read: false,
    };

    if (newMessage.trim()) {
      messageData.text = newMessage.trim();
    }

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    // Add message to the database
    const messagesRef = dbRef(database, `messages/${currentChatId}`);
    const newMessageRef = push(messagesRef);
    await update(newMessageRef, messageData);

    // Update the chat's last message
    const chatRef = dbRef(database, `chats/${currentChatId}`);
    await update(chatRef, {
      lastMessage: {
        text: messageData.text || 'Image',
        timestamp,
        senderId: currentUser.id
      },
      updatedAt: timestamp
    });

    // Envoi de la notification push au destinataire
    if (otherUser && otherUser.id !== currentUser.id) {
      try {
        await axiosInstance.post('/notifications/chat-message', {
          recipientId: otherUser.id,
          senderName: `${currentUser.prenom} ${currentUser.nom}`,
          message: messageData.text || 'Image',
          chatId: currentChatId
        });
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification push:', error);
      }
    }

    // Clear the input
    setNewMessage('');
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload images');
      return;
    }

    // Pick the image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.cancelled && result.assets && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleBackPress = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };



  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.senderId === currentUser?.id;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.userMessageContainer : styles.otherMessageContainer
      ]}>
        {item.imageUrl && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => {
            }}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          </TouchableOpacity>
        )}

        {item.text && (
          <View style={[
            styles.textBubble,
            isCurrentUser ? styles.userTextBubble : styles.otherTextBubble
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.userMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
          </View>
        )}

        <Text style={[
          styles.timestamp,
          isCurrentUser ? styles.userTimestamp : styles.otherTimestamp
        ]}>
          {formatFullDateTimeFromTimeStamp(item.timestamp)}
          {isCurrentUser && item.read && (
            <Ionicons name="checkmark-done" size={12} color="#0084FF" style={styles.readIcon} />
          )}
        </Text>
      </View>
    );
  };



  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isModalMode && <View style={styles.header}>
        <GoBack />

        <View style={styles.headerInfo}>
          {otherUser && (
            <>
              {
                otherUser.photoUrl ? <Image
                  src={otherUser.photoUrl}
                  style={styles.headerAvatar}
                /> :
                  <UserInitials nom={otherUser.nom} prenom={otherUser.prenom} />
              }
              <View className='ml-2'>
                <Text style={styles.headerTitle}>
                  {otherUser.prenom} {otherUser.nom}
                </Text>
                <Text style={styles.headerSubtitle}>
                  En ligne
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.headerRight} />
      </View>
      }

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {selectedImage && (
        <View style={styles.selectedImageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={pickImage}
          disabled={isUploading}
        >
          <Entypo name="attachment" size={24} color="black" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Écrire un message"
          multiline
          maxHeight={100}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() && !selectedImage) || isUploading ? styles.sendButtonDisabled : {}
          ]}
          onPress={sendMessage}
          disabled={(!newMessage.trim() && !selectedImage) || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        <LogoSpinner
          visible={isLoading}
          message="Messages en cours..."
          rotationDuration={1500}

        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 25,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  textBubble: {
    borderRadius: 18,
    padding: 10,
    maxWidth: '100%',
  },
  userTextBubble: {
    backgroundColor: '#F95200',
    borderBottomRightRadius: 0,
  },
  otherTextBubble: {
    backgroundColor: '#EBEDEF',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#666666',
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    color: '#666666',
  },
  readIcon: {
    marginLeft: 4,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    backgroundColor: '#E0E0E0',
  },
  selectedImageContainer: {
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'flex-start',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#Fff',
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  imageButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#F95200',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
});

export default ChatScreen;