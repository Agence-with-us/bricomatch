import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../../store/store';
import { navigate, getCurrentRoute, addNavigationListener } from '../../../services/navigationService';

// Screens where we want to hide the tab bar
const HIDDEN_TAB_SCREENS = ['ChatScreen','FicheProfessionnel', 'Payment', 'ValidationScreen', "FactureDetailsScreen", "FacturesScreen", "VideoCall"];

// Define role-specific screens
const PARTICULIER_ONLY_SCREENS = ['HomeSearch', 'FicheProfessionnel', 'Services'];
const PRO_ONLY_SCREENS = ['ConnectedUserAvailability'];

const RoleBasedTabs = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [previousRole, setPreviousRole] = useState<string | null>(null);

  const isParticulier = user?.role === 'PARTICULIER';
  const isPro = user?.role === 'PRO';
  const currentRole = user?.role || null;

  // Effect for role change detection
  useEffect(() => {
    if (previousRole !== currentRole) {
      console.log(previousRole)
      // Role has changed or initial login
      setPreviousRole(currentRole);
      
      // Navigate to appropriate default screen based on role
      if (isPro) {
        navigate('Appointments');
        setActiveTab('Appointments');
      } else if (isParticulier) {
        navigate('Home');
        setActiveTab('Home');
      }
    }
  }, [currentRole, isPro, isParticulier, previousRole]);

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
  }, [isParticulier, isPro]);

  const checkCurrentRoute = () => {
    const currentRoute = getCurrentRoute();
    if (currentRoute?.name) {
      setActiveTab(currentRoute.name);
      
      // Hide tab bar on specific screens
      setIsVisible(!HIDDEN_TAB_SCREENS.includes(currentRoute.name));

      // Redirect if user tries to access a screen not allowed for their role
      if (isParticulier && PRO_ONLY_SCREENS.includes(currentRoute.name)) {
        navigate('Home');
      } else if (isPro && PARTICULIER_ONLY_SCREENS.includes(currentRoute.name)) {
        navigate('Appointments');
      }
    }
  };

  const handleTabPress = (screenName: string) => {
    setActiveTab(screenName);
    //@ts-ignore
    navigate(screenName);
  };

  // Don't render anything if tab bar should be hidden
  if (!isVisible) {
    return null;
  }

  // Select initial screen if no active tab
  if (!activeTab) {
    if (isPro) {
      setActiveTab('Appointments');
    } else if (isParticulier) {
      setActiveTab('Home');
    }
    return null; // Return null once to avoid flicker during initialization
  }
  
  return (
    <View style={styles.container}>
      {/* PARTICULIER specific tab */}
      {isParticulier && (
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
        label="Profile"
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
    flexDirection: 'row',
    height: 90,
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