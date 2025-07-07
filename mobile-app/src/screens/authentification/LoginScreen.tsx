import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import {
  clearError,
  loginRequest,
  loginWithAppleRequest,
  loginWithGoogleRequest,
} from '../../store/authentification/reducer';

import GoogleSignInComponent from '../../components/elements/auth/GoogleSignIn';
import GoBack from '../../components/common/GoBack';
import OutlinedTextInput from '../../components/common/OutlinedTextInput';
import { navigate } from '../../services/navigationService';
import AppleSignInComponent from '../../components/elements/auth/AppleSignInComponent';
import LogoSpinner from '../../components/common/LogoSpinner';

const offsetOrangeSplash = require('../../../assets/splash-bg-offset-orange.png')
const logoBricomatchOrange = require('../../../assets/logo-bricomatch-orange.png')

const LoginScreen = ({ route }: { route: { params: { role: string } } }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateInputs = () => {
    let isValid = true;

    if (!email.trim()) {
      setEmailError('Email est requis');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format email invalide');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Mot de passe est requis');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleLogin = () => {
    if (validateInputs()) {
      dispatch(loginRequest({ email, password }));
    }
  };

  const handleGoogleSignIn = (userData: any) => {

    dispatch(loginWithGoogleRequest({
      ...userData,
      role: route.params.role,
    }));
  };

  const handleAppleSignIn = (userData: any) => {
    dispatch(loginWithAppleRequest({
      ...userData,
      role: route.params.role,
    }));
  };




  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, []);


  return (

    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 pt-10 bg-background"
    >
      {/* Image de fond avec overlay pour meilleure visibilité du contenu */}
      <Image
        source={offsetOrangeSplash}
        className="absolute top-0 right-0 z-0 w-full h-80"
        resizeMode="cover"
      />

      {/* Container principal avec padding consistant */}
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6">
          {/* En-tête */}
          <View className="w-full flex-row justify-between items-center mt-4">
            <GoBack />
            <Text className="text-muted text-lg font-bold">{route.params.role === 'PARTICULIER' ? 'Je recherche de l\'aide' : 'Je recherche des missions'}</Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Logo centré avec marge convenable */}
          <View className="items-center my-8">
            <Image
              resizeMode="contain"
              source={logoBricomatchOrange}
              className="w-56 h-10"
            />
          </View>

          {/* Contenu principal */}
          <View className="flex-1 w-full">
            <Text className="text-2xl text-muted font-bold ">Connexion</Text>
            <Text className="text-muted text-lg ">{route.params.role === 'PARTICULIER' ? 'En tant que particulier' : 'En tant que professionnel'}</Text>

            {/* Message d'erreur avec animation subtile */}
            {error && (
              <Animated.View
                className="bg-red-100 p-4 rounded-xl mb-5 border border-red-200"
              >
                <Text className="text-red-600">{error}</Text>
              </Animated.View>
            )}

            {/* Champs de formulaire avec espacement amélioré */}
            <View className="space-y-4">
              <View>
                <OutlinedTextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                {emailError &&
                  <Text className="text-red-500 text-sm mt-1 ml-1">{emailError}</Text>
                }
              </View>

              <View>
                <OutlinedTextInput
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                />
                {passwordError &&
                  <Text className="text-red-500 text-sm mt-1 ml-1">{passwordError}</Text>
                }
              </View>
            </View>

            {/* Bouton de connexion principal avec état de chargement */}
            <TouchableOpacity
              onPress={handleLogin}
              className={`rounded-full bg-secondary w-full items-center justify-center h-14 mt-6 ${loading ? 'bg-orange-200 opacity-90' : ''}`}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text className="text-accent font-bold text-base">{`${!loading ? 'Se connecter' : 'Connexion ...'}`}</Text>
            </TouchableOpacity>

            {/* Séparateur avec texte */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500">ou</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Options de connexion alternatives */}
            <View className="w-full px-4">
              <GoogleSignInComponent
                onSignInSuccess={handleGoogleSignIn}
              />

              <AppleSignInComponent
                onSignInSuccess={handleAppleSignIn}
              />
            </View>
            {/* Lien d'inscription */}
            <TouchableOpacity
              className=" flex-row justify-center mt-5"
              onPress={() => navigate('Register', { role: route.params.role })}
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">Vous n'avez pas de compte ? </Text>
              <Text className="text-base text-secondary font-semibold">S'inscrire</Text>
            </TouchableOpacity>
          </View>

          <LogoSpinner
            visible={loading}
            message="Connexion en cours..."
            rotationDuration={1500}

          />
        </View>

      </SafeAreaView>

    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
