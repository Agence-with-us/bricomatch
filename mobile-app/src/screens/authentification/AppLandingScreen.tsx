import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { navigate } from "../../services/navigationService";

import { Icon } from "react-native-paper";

const authentificationImage = require("../../../assets/validation/authentification.png");
const bricomatchLogoOrange = require("../../../assets/logo-bricomatch-orange.png");
const bubbleImage1 = require("../../../assets/validation/bubble-1.png");
const bubbleImage2 = require("../../../assets/validation/bubble-2.png");


export default function AppLandingScreen() {

    const translateY = useRef(new Animated.Value(0)).current;
    const translateY2 = useRef(new Animated.Value(0)).current;
    const skipAnim = useRef(new Animated.Value(0)).current;

   

    useEffect(() => {
        Animated.timing(translateY, {
            toValue: -40,
            duration: 500,
            useNativeDriver: true,
            delay: 50
        }).start();
    }, [translateY]);
    useEffect(() => {
        Animated.timing(translateY2, {
            toValue: -100,
            duration: 500,
            useNativeDriver: true,
            delay: 100
        }).start();
    }, [translateY2]);

    useEffect(() => {
        Animated.timing(skipAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
            delay: 700,
        }).start();
    }, [skipAnim]);

    return (
        <View className="flex-1 items-center gap-y-4 bg-background">
            <Animated.View
                style={{
                    transform: [{ translateY }],
                }}
                className="flex-row border-[1.5px] border-[#FFF] absolute z-10 inset-0 top-48 right-5 w-fit bg-[#EBEDEF]/70 rounded-full p-2 items-center"
            >
                <Image
                    source={bubbleImage1}
                    className="z-0 mt-0 mr-2 w-[44] h-[44]"
                    resizeMode="cover"
                />
                <Text className="text-base text-muted break-words mr-2">
                    Mon compteur saute{"\n"}quand j'allume le four
                </Text>
            </Animated.View>
            <Animated.View
                style={{
                    transform: [{ translateY: translateY2 }],
                }}
                className="flex-row border-[1.5px] border-[#FFF] absolute z-10 inset-0 top-[46%] left-5 w-fit bg-[#EBEDEF]/70 rounded-full p-2 items-center"
            >
                <Image
                    source={bubbleImage2}
                    className="z-0 mt-0 w-[44] h-[44]"
                    resizeMode="cover"
                />
                <Text className="text-base text-muted break-words">
                    Mon bac de douche fuit, help !!
                </Text>
            </Animated.View>
            <Image style={styles.image} source={bricomatchLogoOrange} className="absolute top-16 z-10 transform translate-x-[50%] mt-10 w-[250] h-[40] justify-center" />
            <Image
                source={authentificationImage}
                className="z-0 mt-0 mr-2 w-[100%] h-[55%]"
                resizeMode="stretch"
            />
            <Animated.View
                style={{
                    opacity: skipAnim,
                    transform: [{ translateX: skipAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }],
                    width: '100%',
                    alignItems: 'center',
                }}
            >
                <TouchableOpacity
                    className="  flex-row  items-center justify-center"
                    onPress={() => {
                        navigate('Home');
                    }}
                >
                    <Text className="text-base text-center text-[#F95200] ">Passer et aller à l'accueil </Text>
                    <Icon source="arrow-right" size={24} color="#F95200" />
                </TouchableOpacity>
            </Animated.View>
            <View className="px-4 w-full h-[45%]">
                <View className="items-center gap-y-2 mb-5">
                    <Text className="text-base text-muted/90 font-normal tracking-tighter text-center px-2 -mb-1.5">Bienvenue sur BRICOMATCH</Text>
                    <Text className="text-[30px] text-muted font-bold tracking-wider -mb-1.5">L'application de</Text>
                    <Text className="text-[30px] text-muted font-bold tracking-wider">conseil par des pros</Text>
                </View>
                <TouchableOpacity
                    className="rounded-[30px] bg-[#F95200] w-full items-center justify-center h-[55]"
                    onPress={() => navigate('Register', { role: 'PARTICULIER' })}
                >
                    <Text className="text-[#FFF]">JE RECHERCHE DE L'AIDE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="rounded-[30px] bg-[#F952001A] w-full items-center justify-center h-[55] mt-4"
                    onPress={() => navigate('Register', { role: 'PRO' })}
                >
                    <Text className="text-[#F95200]">JE SUIS UN ARTISAN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="mt-5 flex-row gap-x-2 mx-auto" onPress={() => navigate('Login')}>
                    <Text className="text-base text-muted">
                        Vous avez déjà un compte ?
                    </Text>
                    <Text className="text-base text-[#F95200]">
                        Connectez-vous
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}
const styles = StyleSheet.create({
    image: {
        resizeMode: "contain"
    }
})
