import React, { useEffect } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef, setNavigationReady } from "../services/navigationService";
import { useSelector, useDispatch } from 'react-redux';
import { Platform, StatusBar, View } from 'react-native';

// Écrans d'authentification
import LoginScreen from "../screens/authentification/LoginScreen";
import RegisterScreen from "../screens/authentification/RegisterScreen";
import CompleteProfileScreen from '../components/elements/auth/CompleteProfileScreen';

// Écrans principaux
import HomeScreen from "../screens/Accueil/HomeScreen";
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileInfoScreen from '../screens/profile/ProfileInfoScreen';
import FicheProfessionnelScreen from '../screens/fiche-professionnel/FicheProfessionnelScreen';
import ConnectedUserAvailabilityScreen from '../screens/availabilities/ConnectedUserAvailability';
import ValidationScreen from '../components/common/ValidationScreen';
import FacturesScreen from '../screens/factures/FacturesScreen';
import FactureDetailsScreen from '../screens/factures/factureDetailsScreen';
import VideoCallScreen from '../screens/calls/VideoCallScreen';
import ChatListScreen from '../screens/chat/ChatsListScreen';
import ChatScreen from '../screens/chat/ChatScreen';

// Components
import RoleBasedTabs from '../components/elements/navigation/RoleBasedTabs';
import FixedHeader from '../components/common/FixedHeader';
import ProtectedRoute from './ProtectedRoute';

// Store
import { checkAuthStatus } from '../store/authentification/reducer';

// Splash Screen
import * as SplashScreen from 'expo-splash-screen';
import AppLandingScreen from '../screens/authentification/AppLandingScreen';
import HomeSearch from '../components/elements/home/HomeSearch';

const Stack = createStackNavigator();

// Configuration des écrans avec header fixe
export const getScreenOptions = (screenName: string) => {
  const screensWithFixedHeader = {
    'ChatList': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Messages"
          customClasses={'bg-white'}
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'Appointments': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Mes RDV"
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'FacturesScreen': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Mes Factures"
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'ProfileScreen': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Mon compte"
          showBackButton={true}
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'ProfileInfoScreen': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Mon profil"
          showBackButton={true}
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'Payment': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Paiement sécurisé"
          showBackButton={true}
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
    'HomeSearch': {
      headerShown: true,
      header: () => (
        <FixedHeader
          title="Recherche"
          showBackButton={true}
          customClasses={'bg-transparent'}
          onBackPress={() => {}}
          rightComponent={null}
        />
      ),
    },
  };

  return screensWithFixedHeader[screenName as keyof typeof screensWithFixedHeader] || { headerShown: false };
};

const AppNavigator = () => {
    const dispatch = useDispatch();

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
        <View className='flex-1 bg-transparent'  >
            {/* Configuration de la barre de statut */}
            <StatusBar
                barStyle="dark-content"
                backgroundColor={Platform.OS === 'android' ? "transparent" : "transparent"}
                translucent={true}
                animated={true}
            />

            <NavigationContainer ref={navigationRef} onReady={() => setNavigationReady()}>
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1 }}>
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="Home" component={HomeScreen} />
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Register" component={RegisterScreen} />
                            <Stack.Screen name="AppLandingScreen" component={AppLandingScreen} />
                            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />

                            <Stack.Screen
                                name="Appointments"
                                children={() => (
                                    <ProtectedRoute>
                                        <AppointmentsScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('Appointments')}
                            />
                            <Stack.Screen
                                name="ChatList"
                                children={() => (
                                    <ProtectedRoute>
                                        <ChatListScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('ChatList')}
                            />
                            <Stack.Screen
                                name="ChatScreen"
                                children={() => (
                                    <ProtectedRoute>
                                        <ChatScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('ChatScreen')}
                            />
                            <Stack.Screen 
                                name="ValidationScreen" 
                                children={() => (
                                    <ProtectedRoute>
                                        <ValidationScreen />
                                    </ProtectedRoute>
                                )}
                            />
                            <Stack.Screen
                                name="ProfileScreen"
                                children={() => (
                                    <ProtectedRoute>
                                        <ProfileScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('ProfileScreen')}
                            />
                            <Stack.Screen
                                name="ProfileInfoScreen"
                                children={() => (
                                    <ProtectedRoute>
                                        <ProfileInfoScreen  />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('ProfileInfoScreen')}
                            />
                           
                            <Stack.Screen
                                name="FacturesScreen"
                                children={() => (
                                    <ProtectedRoute>
                                        <FacturesScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('FacturesScreen')}
                            />
                            <Stack.Screen
                                name="FactureDetailsScreen"
                                children={() => (
                                    <ProtectedRoute>
                                        <FactureDetailsScreen />
                                    </ProtectedRoute>
                                )}
                            />
                            <Stack.Screen
                                name="VideoCall"
                                children={() => (
                                    <ProtectedRoute>
                                        <VideoCallScreen />
                                    </ProtectedRoute>
                                )}
                            />
                            <Stack.Screen name="HomeSearch" component={HomeSearch} options={getScreenOptions('HomeSearch')} />
                            <Stack.Screen name="FicheProfessionnel" component={FicheProfessionnelScreen} />
                            <Stack.Screen
                                name="Payment"
                                children={() => (
                                    <ProtectedRoute>
                                        <PaymentScreen />
                                    </ProtectedRoute>
                                )}
                                options={getScreenOptions('Payment')}
                            />
                            <Stack.Screen
                                name="ConnectedUserAvailability"
                                children={() => (
                                    <ProtectedRoute>
                                        <ConnectedUserAvailabilityScreen />
                                    </ProtectedRoute>
                                )}
                            />
                        </Stack.Navigator>
                    </View>
                    <RoleBasedTabs />
                </View>
            </NavigationContainer>
        </View>
    );
};

export default AppNavigator;