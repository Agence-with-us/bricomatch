import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    TextInput
} from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import { ref, onValue, get } from 'firebase/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Chat } from '../../store/chat/types';
import { UserLocal, UserRole } from '../../store/users/types';
import { database, firestore } from '../../config/firebase.config';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { navigate } from '../../services/navigationService';
import UserInitials from '../../components/elements/users/UserInitials';
import { doc, getDoc } from 'firebase/firestore';
import GoBack from '../../components/common/GoBack';
import LogoSpinner from '../../components/common/LogoSpinner';

const ChatListScreen = () => {
    const [chats, setChats] = useState<Array<Chat & { otherUser: UserLocal, unreadCount: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const currentUser = useSelector((state: RootState) => state.auth.user);


    useEffect(() => {

        if (!currentUser?.id) return;

        // Reference to the current user's chats
        const userChatsRef = ref(database, `user-chats/${currentUser.id}`);

        const unsubscribe = onValue(userChatsRef, async (snapshot) => {
            if (!snapshot.exists()) {
                setChats([]);
                setLoading(false);
                return;
            }

            const userChatIds = Object.keys(snapshot.val());

            const chatsData = [];

            for (const chatId of userChatIds) {
                // Get chat details
                const chatRef = ref(database, `chats/${chatId}`);
                const chatSnapshot = await get(chatRef);
                const chatData = chatSnapshot.val();



                if (!chatData) continue;

                // Find the other participant
                const otherParticipantId = Object.keys(chatData.participants).find(id => id !== currentUser.id);

                if (!otherParticipantId) continue;

                // Get other user details

                const userRef = doc(firestore, `users/${otherParticipantId}`);
                const userSnapshot = await getDoc(userRef);
                const otherUser = userSnapshot.exists() ? userSnapshot.data() as UserLocal : null;


                // Count unread messages
                // Charger les messages
                const messagesRef = ref(database, `messages/${chatId}`);

                const messagesSnapshot = await get(messagesRef);

                let unreadCount = 0;

                if (messagesSnapshot.exists()) {
                    const messages = messagesSnapshot.val();

                    const userLastRead = chatData.participants[currentUser.id]?.lastRead || 0;

                    Object.values(messages).forEach((message: any) => {
                        if (message.senderId !== currentUser.id && message.timestamp > userLastRead) {
                            unreadCount++;
                        }
                    });
                }

                chatsData.push({
                    ...chatData,
                    id: chatId,
                    otherUser,
                    unreadCount
                });

            }

            // Sort by last message timestamp (most recent first)
            chatsData.sort((a, b) =>
                (b.lastMessage?.timestamp || b.updatedAt) -
                (a.lastMessage?.timestamp || a.updatedAt)
            );

            setChats(chatsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleChatPress = (chat: any) => {
        navigate('ChatScreen', { chat: { chatId: chat.id, otherUserInfo: chat.otherUser } });
    };


    const formatMessageTime = (timestamp: any) => {
        const date = new Date(timestamp);
        const now = new Date();

        // If message is from today, show time
        if (date.toDateString() === now.toDateString()) {
            return format(date, 'HH:mm');
        }

        // If message is from this week, show day name
        if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            return format(date, 'EEEE', { locale: fr });
        }

        // Otherwise show date
        return format(date, 'dd/MM/yyyy');
    };

    const renderChatItem = ({ item }) => {
        const { otherUser, lastMessage, unreadCount } = item;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleChatPress(item)}
            >
                {otherUser.photoUrl ?
                    <Image
                        src={otherUser.photoUrl}
                        style={styles.avatar}
                    /> :
                    <UserInitials nom={otherUser.nom} prenom={otherUser.prenom} />
                }


                <View style={styles.chatInfo} className='ml-2'>
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>
                            {otherUser.prenom} {otherUser.nom}
                        </Text>
                        <Text style={styles.role}>
                            {lastMessage ? formatMessageTime(lastMessage.timestamp) : ""}
                        </Text>
                    </View>

                    <View style={styles.messageContainer}>
                        <Text style={styles.message} numberOfLines={1}>
                            {lastMessage?.text || "Nouvelle conversation"}
                        </Text>
                        <View style={styles.timeContainer}>

                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadCount}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };


    return (
        <View className="flex-1 pt-6 px-2.5 bg-background flex-col">
           
            <View className={`flex-row items-center bg-background-muted rounded-full px-4 py-2   border-[0.5px] border-[#7E8184]/50 h-[50] ${searchQuery ? "pr-1.5 py-1" : ""}`}>
                <Icon
                    name={searchQuery ? "chevron-back-outline" : "search-outline"}
                    size={20}
                    color="#313131B2"
                    onPress={() => {
                        if (searchQuery) {
                            setSearchQuery('')
                        }
                    }}
                />
                <TextInput
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text)}
                    placeholder={`${currentUser?.role == UserRole.PRO ? "Rechercher un particulier" : "Rechercher un artisan"}`}
                    placeholderTextColor="#313131B2"
                    className="flex-1 text-muted/70 font-medium ml-3"
                />
                {searchQuery && (
                    <View className="rounded-full p-2 bg-secondary">
                        <Icon
                            name="search-outline"
                            size={20}
                            color="white"
                        />
                    </View>
                )}
            </View>

            {chats.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Aucune conversation pour le moment</Text>
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
            <LogoSpinner
                visible={loading}
                message="Traitement en cours..."
                rotationDuration={1500}

            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    listContainer: {
        paddingBottom: 20,
    },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: "#fff"
    },
    chatInfo: {
        flex: 1,
    },
    nameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    role: {
        fontSize: 12,
        color: '#666666',
    },
    messageContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        fontSize: 14,
        color: '#666666',
        marginRight: 10,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    time: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 4,
    },
    unreadBadge: {
        backgroundColor: '#F95200',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666666',
    },
});

export default ChatListScreen;