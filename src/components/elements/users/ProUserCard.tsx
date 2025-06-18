// components/ProUserCard.tsx
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { UserLocal } from '../../../store/users/types';
import { navigate } from '../../../services/navigationService';
import StarRating from '../../common/StarRating';

interface ProUserCardProps {
    user: UserLocal;
    onPress?: (user: UserLocal) => void;
    style?: object;
}

const ProUserCard: React.FC<ProUserCardProps> = ({
    user
}) => {
    const { nom, prenom, photoUrl, serviceInfo, averageRating, reviewsCount } = user;

    const handleSelectProfessional = () => {
        navigate("FicheProfessionnel", { professionnel: user });

    };

    const tempRating = Number.parseFloat(((Math.random() * (5 - 1)) + 1).toFixed(1))
    return (
        <Pressable
            className="my-2 rounded-lg overflow-hidden bg-transparent max-w-[48%] ml-1 "
            // @ts-ignore
            onPress={handleSelectProfessional}
        >
            <View className="relative w-full aspect-square bg-accent p-0.5 rounded-2xl border-[0.4px] border-muted/10">
                <View className="absolute w-full h-full bg-muted/30 z-[2] rounded-2xl m-0.5" />

                {// @ts-ignore
                    photoUrl ? (
                        // @ts-ignore
                        <Image source={{ uri: photoUrl }} className="w-full h-full rounded-2xl z-[1]" />
                    ) : (
                        <View className="flex justify-center items-center w-full h-full bg-[#f95200] rounded-2xl z-[2]">
                            <Text className="text-white  font-extrabold text-3xl">
                                {prenom[0]}{nom[0]}
                            </Text>
                        </View>
                    )}
                <View className="absolute inset-0 h-full w-full justify-end items-start px-3 py-2 z-[3]">
                    <Text className="text-white text-lg font-bold text-center">{nom}</Text>
                    <Text className="text-white text-sm text-center font-semibold">{serviceInfo?.name}</Text>
                </View>
            </View>

            <StarRating averageRating={averageRating} reviewsCount={reviewsCount} />
            <View className="pl-1">
                <Text className="text-muted font-semibold text-[14px]">À partir de {30} €/ht</Text>
            </View>
        </Pressable>
    )
};

export default ProUserCard;