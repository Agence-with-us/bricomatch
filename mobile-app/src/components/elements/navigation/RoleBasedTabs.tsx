import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../../store/store';
import { navigate, getCurrentRoute, addNavigationListener } from '../../../services/navigationService';

// Screens where we want to hide the tab bar
const HIDDEN_TAB_SCREENS = ['ChatScreen', 'FicheProfessionnel', 'Payment', 'ValidationScreen', "FactureDetailsScreen", "FacturesScreen", "VideoCall", 'Login', 'Register', 'CompleteProfile' , 'AppLandingScreen'];

// Define role-specific screens
const PARTICULIER_ONLY_SCREENS = ['HomeSearch', 'FicheProfessionnel', 'Services'];
const PRO_ONLY_SCREENS = ['ConnectedUserAvailability'];

const RoleBasedTabs = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [previousRole, setPreviousRole] = useState<string | null>(null);

  const isParticulier = user?.role === 'PARTICULIER';
  const isPro = user?.role === 'PRO';
  const currentRole = user?.role || null;

  // Effect for role change detection
  useEffect(() => {
    if (previousRole !== currentRole) {
      // Role has changed or initial login
      setPreviousRole(currentRole);

      // Navigate to appropriate default screen based on role (only if authenticated)
      if (isAuthenticated && user && activeTab !== "Home") {
        if (isPro) {
          navigate('Home');
          setActiveTab('Home');
        } else {
          navigate('Appointments');
          setActiveTab('Appointments');

        }
      }
    }
  }, [currentRole, isPro, isParticulier, previousRole, isAuthenticated, user]);

  // Update active tab based on current route and handle visibility
  useEffect(() => {
    // Initial check
    checkCurrentRoute();

    // Add listener for future navigation changes
    const unsubscribe = addNavigationListener('state', () => {
      checkCurrentRoute();
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [isParticulier, isPro, isAuthenticated, user]);

  const checkCurrentRoute = () => {
    const currentRoute = getCurrentRoute();
    if (currentRoute?.name) {
      setActiveTab(currentRoute.name);

      // Hide tab bar on specific screens
      setIsVisible(!HIDDEN_TAB_SCREENS.includes(currentRoute.name));

      // Only perform role-based redirects if user is authenticated
      if (isAuthenticated && user) {
        // Redirect if user tries to access a screen not allowed for their role
        if (isParticulier && PRO_ONLY_SCREENS.includes(currentRoute.name)) {
          navigate('Home');
        } else if (isPro && PARTICULIER_ONLY_SCREENS.includes(currentRoute.name)) {
          navigate('Appointments');
        }
      }
    }
  };

  const handleTabPress = (screenName: string) => {
    // Check if user is authenticated before navigating to protected screens
    if (!isAuthenticated || !user) {
      navigate('AppLandingScreen');
      return;
    }

    setActiveTab(screenName);
    //@ts-ignore
    navigate(screenName);
  };

  // Don't render anything if tab bar should be hidden or user is not authenticated
  if (!isVisible) {
    return null;
  }

  // Select initial screen if no active tab
  if (!activeTab) {
    if (!isPro) {
      setActiveTab('Home');
    } else {
      setActiveTab('Appointments');
    }
  }

  return (
    <View style={styles.container}>
      {/* PARTICULIER specific tab */}
      {!isPro && (
        <TabButton
          icon="search-outline"
          label="Explorer"
          onPress={() => handleTabPress('Home')}
          isActive={activeTab === 'Home'}
        />
      )}

      {/* Common tabs for all users */}
      <TabButton
        icon="chatbubble-outline"
        label="Messagerie"
        onPress={() => handleTabPress('ChatList')}
        isActive={activeTab === 'ChatList'}
      />

      <TabButton
        icon="calendar-outline"
        label="Mes RDV"
        onPress={() => handleTabPress('Appointments')}
        isActive={activeTab === 'Appointments'}
      />

      {/* Common profile tab */}
      <TabButton
        icon="person-outline"
        label="Mon compte"
        onPress={() => handleTabPress('ProfileScreen')}
        isActive={activeTab === 'ProfileScreen'}
      />
    </View>
  );
};

const TabButton = ({
  icon,
  label,
  onPress,
  isActive
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isActive: boolean;
}) => (
  <TouchableOpacity style={styles.tabButton} onPress={onPress}>
    <View style={[
      styles.iconContainer,
      isActive && { backgroundColor: '#f95200', borderRadius: 9999, padding: 8 }
    ]}>
      {/* @ts-ignore */}
      <Ionicons name={icon} size={24} color={isActive ? '#fff' : '#333'} />
    </View>
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#333',
  },
  activeTabLabel: {
    color: '#f95200',
    fontWeight: 'bold',
  },
});

export default RoleBasedTabs;