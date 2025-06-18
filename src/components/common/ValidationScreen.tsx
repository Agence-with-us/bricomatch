import React, { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, BackHandler } from "react-native";
import { RouteProp, useRoute, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../types/RootStackParamList";
import { navigate } from "../../services/navigationService";

const splashOffsetOrange = require('../../../assets/splash-bg-offset-orange.png');
const logoBricomatchOrange = require('../../../assets/logo-bricomatch-orange.png');
const validationRegisterImage = require('../../../assets/validation/valide-registration.png');

export default function ValidationScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'ValidationScreen'>>();

    const { info } = route.params;
    
    // Bloquer le bouton retour d'Android
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                // Retourner true bloque le comportement par défaut du bouton retour
                return true;
            };

            // Ajouter l'event listener
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            // Nettoyer l'event listener au démontage
            return () => subscription.remove();
        }, [])
    );

    // @ts-expect-error
    const onActionPress = () => navigate(info.to);

    return (
        <View className="flex-1 items-center justify-center px-4 gap-y-7">
            <Image
                source={splashOffsetOrange}
                className="absolute top-0 right-0 z-0 mt-0 w-[100%] h-[350]"
                resizeMode="stretch"
            />
            <Image style={styles.image} source={logoBricomatchOrange} className="w-[240] h-[40] justify-center" />
            <Image style={styles.image} source={validationRegisterImage} className="w-[225] h-[225]" />
            <View className="items-center gap-y-2">
                <Text className="text-[26px] text-muted font-bold tracking-tighter">{info.title}</Text>
                <Text className="text-base text-muted/90 font-normal tracking-tighter text-center px-2">{info.subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onActionPress} className="rounded-[30px] bg-secondary w-full items-center justify-center h-[60]">
                <Text className="text-accent">{info.actionText}</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    image: {
        resizeMode: "contain"
    }
})