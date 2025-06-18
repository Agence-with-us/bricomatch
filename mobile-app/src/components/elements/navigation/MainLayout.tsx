import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import AppointmentsScreen from '../../../screens/appointments/AppointmentsScreen';
import CreateAppointmentScreen from '../../../screens/appointments/CreateAppointmentScreen';
import PaymentScreen from '../../../screens/payment/PaymentScreen';
import ProfileScreen from '../../../screens/profile/ProfileScreen';
import ProfileInfoScreen from '../../../screens/profile/ProfileInfoScreen';
import HomeScreen from '../../../screens/Accueil/HomeScreen';
import ServicesList from '../services/ServicesList';
import CallHome from '../../../screens/Accueil/CallHome';
import HomeSearch from '../home/HomeSearch';
import FicheProfessionnelScreen from '../../../screens/fiche-professionnel/FicheProfessionnelScreen';
import ConnectedUserAvailabilityScreen from '../../../screens/availabilities/ConnectedUserAvailability';
import ValidationScreen from '../../common/ValidationScreen';
import RoleBasedTabs from './RoleBasedTabs';
import { RootState } from '../../../store/store';
import FacturesScreen from '../../../screens/factures/FacturesScreen';
import FactureDetailsScreen from '../../../screens/factures/factureDetailsScreen';
import VideoCallScreen from '../../../screens/calls/VideoCallScreen';
import ChatListScreen from '../../../screens/chat/ChatsListScreen';
import ChatScreen from '../../../screens/chat/ChatScreen';
import FixedHeader from '../../common/FixedHeader';

const Stack = createStackNavigator();

const MainLayout = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isParticulier = user?.role === 'PARTICULIER';
  const isPro = user?.role === 'PRO';

  // Configuration des écrans avec header fixe
  const getScreenOptions = (screenName) => {
    const screensWithFixedHeader = {
      'ChatList': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Messages"
            customClasses={'bg-white'}
          />
        ),
      },
      'Appointments': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Mes RDV"
            backgroundColor="#FFFFFF"
          />
        ),
      },
      'FacturesScreen': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Mes Factures"
            backgroundColor="#FFFFFF"

          />
        ),
      },
      'ProfileScreen': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Mon compte"
            showBackButton={true}
            backgroundColor="#FFFFFF"
          />
        ),
      },
      'ProfileInfoScreen': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Mon profil"
            showBackButton={true}
            backgroundColor="#FFFFFF"
          />
        ),
      },
      'Payment': {
        headerShown: true,
        header: () => (
          <FixedHeader
            title="Paiement sécurisé"
            showBackButton={true}
            backgroundColor="#FFFFFF"
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
          />
        ),
      },
    };

    return screensWithFixedHeader[screenName] || { headerShown: false };
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Common screens for all users */}
          <Stack.Screen
            name="Appointments"
            component={AppointmentsScreen}
            options={getScreenOptions('Appointments')}
          />
          <Stack.Screen
            name="ChatList"
            component={ChatListScreen}
            options={getScreenOptions('ChatList')

            }
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen}
            options={getScreenOptions('ChatScreen')}
          />
          <Stack.Screen name="ValidationScreen" component={ValidationScreen} />
          <Stack.Screen
            name="ProfileScreen"
            component={ProfileScreen}
            options={getScreenOptions('ProfileScreen')}
          />
          <Stack.Screen name="ProfileInfoScreen" component={ProfileInfoScreen} options={getScreenOptions('ProfileInfoScreen')} />
          <Stack.Screen name="CallHome" component={CallHome} />
          <Stack.Screen
            name="FacturesScreen"
            component={FacturesScreen}
            options={getScreenOptions('FacturesScreen')}
          />
          <Stack.Screen name="FactureDetailsScreen" component={FactureDetailsScreen} />
          <Stack.Screen name="VideoCall" component={VideoCallScreen} />

          {/* PARTICULIER specific screens */}
          {isParticulier && (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Services" component={ServicesList} />
              <Stack.Screen name="HomeSearch" component={HomeSearch} options={getScreenOptions('HomeSearch')} />
              <Stack.Screen name="FicheProfessionnel" component={FicheProfessionnelScreen} />
              <Stack.Screen name="Payment" component={PaymentScreen} options={getScreenOptions('Payment')} />
            </>
          )}

          {/* PRO specific screens */}
          {isPro && (
            <>
              <Stack.Screen
                name="ConnectedUserAvailability"
                component={ConnectedUserAvailabilityScreen}
              />
              {/* Default screen for PRO users */}
              <Stack.Screen name="Home" component={AppointmentsScreen} />
            </>
          )}
        </Stack.Navigator>
      </View>
      <RoleBasedTabs />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default MainLayout;