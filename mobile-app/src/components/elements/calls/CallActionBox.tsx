import { View, Text, TouchableOpacity, StyleProp, ViewStyle, Image } from 'react-native';
import React, { useState } from 'react';
import Icon from "react-native-vector-icons/Ionicons";
import Modal from "react-native-modal";

import UserInitials from '../users/UserInitials';
import { AppointmentWithOtherUserInfo } from '../../../store/appointments/types';
import ChatScreen from '../../../screens/chat/ChatScreen';
import { UserLocal } from '../../../store/users/types';

interface ActionIconProps {
    style?: StyleProp<ViewStyle>;
    iconColor?: string;
    iconName: string;
    onPress: () => void;
    isActive?: boolean;
    activeColor?: string;
    inactiveColor?: string;
}

const ActionIcon = ({
    style,
    iconName,
    onPress,
    iconColor = "#000",
    isActive = true,
    activeColor = "#FFF",
    inactiveColor = "rgba(255,255,255,0.5)"
}: ActionIconProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="h-[55] w-[55] rounded-full items-center justify-center"
        style={[
            { backgroundColor: isActive ? activeColor : inactiveColor },
            style
        ]}
    >
        <Icon name={iconName} size={25} color={iconColor} />
    </TouchableOpacity>
);

interface Props {
    appointmentEtUser: AppointmentWithOtherUserInfo;
    switchCamera: () => void;
    toggleMicMute: () => void;
    toggleSpeakerMute: () => void;
    toggleCamera: () => void;
    endCall: () => void;
    isCameraOn: boolean;
    isMicMuted: boolean;
    isSpeakerMuted: boolean;
    elapsedTime: string;
}

const CallActionBox = ({
    appointmentEtUser,
    switchCamera,
    toggleMicMute,
    toggleSpeakerMute,
    toggleCamera,
    endCall,
    isCameraOn,
    isMicMuted,
    isSpeakerMuted,
    elapsedTime
}: Props) => {
    const [isChatVisible, setIsChatVisible] = useState<boolean>(false);

    const onToggleChat = () => {
        setIsChatVisible(prevState => !prevState);
    };

    const onCloseChat = () => {
        setIsChatVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                className="flex-row items-center bg-accent/80 rounded-full p-2 pr-4 h-[70] w-full"
                onPress={onToggleChat}
            >
                <View className="rounded-full h-[60] w-[60] border-[0.5px] border-muted/[5%] items-center justify-center">
                    {appointmentEtUser.otherUser?.photoUrl ?
                        <Image src={appointmentEtUser.otherUser?.photoUrl} className="rounded-full h-[55] w-[55]" />
                        : <UserInitials nom={appointmentEtUser.otherUser?.nom} prenom={appointmentEtUser.otherUser?.prenom} />
                    }
                </View>
                <Text className="text-muted text-[15px] font-bold ml-4">
                    {appointmentEtUser.otherUser?.nom}
                </Text>
                <View className="flex-row items-center ml-auto">
                    {/* Espace entre les groupes */}
                    <View className="relative">
                        <Icon name="chatbubble-outline" color="#555555" size={27} />
                        {/* Point noir (ou de couleur 'secondary') superposé sur l'icône */}
                        <View className="absolute rounded-full bg-secondary h-[9] w-[9] top-0 right-0" />
                    </View>
                    {/* Groupe pour la durée et son point à côté */}
                    <View className="ml-4  flex-row items-center">
                        <Text>{elapsedTime}</Text>
                        <View className="rounded-full bg-online h-[6] w-[6] ml-1" />
                    </View>
                </View>

            </TouchableOpacity>

            <View className="pt-7 pb-10 w-full flex-row justify-between">
                <ActionIcon
                    onPress={switchCamera}
                    iconName="camera-reverse-sharp"
                    activeColor="#FFF"
                />
                <ActionIcon
                    onPress={toggleCamera}
                    iconName={isCameraOn ? "videocam" : "videocam-off"}
                    isActive={isCameraOn}
                />
                <ActionIcon
                    onPress={endCall}
                    iconName="call-outline"
                    style={{
                        backgroundColor: "#F95200"
                    }}
                    iconColor="#FFF"
                    activeColor="#F95200"
                />
                <ActionIcon
                    onPress={toggleSpeakerMute}
                    iconName={isSpeakerMuted ? "volume-mute-outline" : "volume-high-outline"}
                    isActive={!isSpeakerMuted}
                />
                <ActionIcon
                    onPress={toggleMicMute}
                    iconName={isMicMuted ? "mic-off-outline" : "mic-outline"}
                    isActive={!isMicMuted}
                />
            </View>

            {/* Modal pour le Chat */}
            <Modal
                isVisible={isChatVisible}
                onBackdropPress={onCloseChat}
                onBackButtonPress={onCloseChat}
                style={{ margin: 0 }}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                backdropOpacity={0.5}
            >
                <View className="flex-1 bg-white mt-12 rounded-t-3xl">
                    {/* Header du modal */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <View className="flex-row items-center">
                            <View className="rounded-full h-[40] w-[40] mr-3">
                                {appointmentEtUser.otherUser?.photoUrl ?
                                    <Image
                                        src={appointmentEtUser.otherUser?.photoUrl}
                                        className="rounded-full h-[40] w-[40]"
                                    />
                                    : <UserInitials
                                        nom={appointmentEtUser.otherUser?.nom}
                                        prenom={appointmentEtUser.otherUser?.prenom}
                                        size={'md'}
                                    />
                                }
                            </View>
                            <Text className="text-lg font-semibold">
                                {appointmentEtUser.otherUser?.nom} {appointmentEtUser.otherUser?.prenom}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onCloseChat} className="p-2">
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Contenu du Chat */}
                    <View className="flex-1">
                        <ChatScreen
                            chat={{ chatId: '', otherUserInfo: appointmentEtUser.otherUser as UserLocal }}

                            containerStyle={{ flex: 1 }}
                            isModalMode={true}
                            onClose={onCloseChat}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default CallActionBox;