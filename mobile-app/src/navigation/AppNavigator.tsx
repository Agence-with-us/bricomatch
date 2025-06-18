import React, { useEffect } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef, setNavigationReady } from "../services/navigationService";
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, StatusBar, View } from 'react-native';

// Écrans d'authentification
import AppLandingScreen from "../screens/authentification/AppLandingScreen";
import LoginScreen from "../screens/authentification/LoginScreen";
import RegisterScreen from "../screens/authentification/RegisterScreen";


// Écran de chargement
import * as SplashScreen from 'expo-splash-screen';
import CompleteProfileScreen from '../components/elements/auth/CompleteProfileScreen';
import { RootState } from '../store/store';
import { checkAuthStatus } from '../store/authentification/reducer';

import MainLayout from '../components/elements/navigation/MainLayout';

const Stack = createStackNavigator();

// Stack de navigation pour les utilisateurs non authentifiés
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AppLandingScreen" component={AppLandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
            options={{
                headerShown: true,
                title: 'Compléter votre profil',
                headerLeft: () => null, // Empêcher le retour arrière
            }}
        />
    </Stack.Navigator>
);

// Stack de navigation pour les utilisateurs authentifiés
const AppStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainLayout} />
    </Stack.Navigator>
);


const AppNavigator = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

    // Empêcher l'écran de démarrage de se cacher automatiquement
    SplashScreen.preventAutoHideAsync();

    useEffect(() => {
        // Vérifier le token d'authentification au démarrage
        dispatch(checkAuthStatus());

        // Masquer l'écran de démarrage après un délai
        const timer = setTimeout(() => {
            SplashScreen.hideAsync();
        }, 2000);

        return () => clearTimeout(timer);
    }, [dispatch]);


    return (
        <View style={{ flex: 1 }}>
            {/* Configuration de la barre de statut */}
            <StatusBar
                barStyle="dark-content" // ou "light-content" pour du texte blanc sur fond sombre
                backgroundColor="transparent" // Fond transparent
                translucent={true} // Permet à la barre de statut de s'afficher correctement
            />

            <NavigationContainer ref={navigationRef} onReady={() => setNavigationReady()}>
                {isAuthenticated && user ? <AppStack /> : <AuthStack />}
            </NavigationContainer>
        </View>
    );

};

export default AppNavigator;