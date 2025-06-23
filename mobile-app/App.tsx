import React from 'react';
import { Provider } from "react-redux";
import AppNavigator from './src/navigation/AppNavigator';
import store, { persistor } from "./src/store/store";
import { PersistGate } from "redux-persist/es/integration/react";
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';


export default function App() {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        } 
        persistor={persistor}
      >
        <StripeProvider publishableKey={Constants.expoConfig?.extra?.stripePublishableKey}>
          <SafeAreaView style={styles.container}>
            <AppNavigator />
            <Toast />
          </SafeAreaView>
        </StripeProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});