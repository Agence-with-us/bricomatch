import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import * as ImagePicker from 'expo-image-picker';
import { RootState } from '../../store/store';
import { loginWithAppleRequest, loginWithGoogleRequest, registerRequest } from '../../store/authentification/reducer';
import GoogleSignInComponent from '../../components/elements/auth/GoogleSignIn';

import OutlinedTextInput from '../../components/common/OutlinedTextInput';
import GoBack from '../../components/common/GoBack';
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/RootStackParamList';
import AppleSignInComponent from '../../components/elements/auth/AppleSignInComponent';
import LogoSpinner from '../../components/common/LogoSpinner';
const offsetOrangeSplash = require('../../../assets/splash-bg-offset-orange.png')
const logoBricomatchOrange = require('../../../assets/logo-bricomatch-orange.png')

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const { services } = useSelector((state: RootState) => state.services);
  const route = useRoute<RouteProp<RootStackParamList, 'Register'>>();
  const { role } = route.params;


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);


  // États pour les erreurs de validation
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nomError, setNomError] = useState('');
  const [prenomError, setPrenomError] = useState('');

  // Validation
  const validateInputs = () => {
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      setEmailError('Email est requis');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format email invalide');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError('Mot de passe est requis');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Les mots de passe ne correspondent pas');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    // Nom validation
    if (!nom.trim()) {
      setNomError('Nom est requis');
      isValid = false;
    } else {
      setNomError('');
    }

    // Prénom validation
    if (!prenom.trim()) {
      setPrenomError('Prénom est requis');
      isValid = false;
    } else {
      setPrenomError('');
    }

    return isValid;
  };

  const handleRegister = () => {
    if (validateInputs()) {
      dispatch(registerRequest({
        email,
        password,
        nom,
        prenom,
        role,
        serviceTypeId: role === 'PRO' ? serviceTypeId : undefined,
        photoUrl: photo || ''
      }));
    }
  };


  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à la caméra');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à votre galerie');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    setShowPhotoModal(true);
  };

  const handleGoogleSignInSuccess = (userData: any) => {
    dispatch(loginWithGoogleRequest({
      ...userData,
      role: role,
    }));
  };

  const handleAppleSignInSuccess = (userData: any) => {
    dispatch(loginWithAppleRequest({
      ...userData,
      role: role,
    }));
  };

 

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 pt-10 bg-background"
    >
      {/* Image de fond */}
      <Image
        source={offsetOrangeSplash}
        className="absolute top-0 right-0 z-0 w-full h-80"
        resizeMode="cover"
      />

      <ScrollView className="flex-1">
        <View className="flex-1 px-6">
          {/* En-tête */}
          <View className="w-full flex-row justify-between items-center mt-4">
            <GoBack />
            <Text className="text-muted text-lg font-bold">{role === 'PARTICULIER' ? 'Je recherche de l\'aide' : 'Je recherche des missions'}</Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Logo */}
          <View className="items-center my-6">
            <Image
              resizeMode="contain"
              source={logoBricomatchOrange}
              className="w-56 h-10"
            />
          </View>

          {/* Contenu principal */}
          <View className="w-full">
            <Text className="text-2xl text-muted font-bold ">Créer un compte</Text>
            <Text className="text-muted text-lg ">{role === 'PARTICULIER' ? 'En tant que particulier' : 'En tant que professionnel'}</Text>
            <View className="w-full px-4">
              <GoogleSignInComponent
                onSignInSuccess={handleGoogleSignInSuccess}
              />

              <AppleSignInComponent
                onSignInSuccess={handleAppleSignInSuccess}
              />
            </View>
            {/* Séparateur */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500">ou</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Message d'erreur */}
            {error && (
              <View
                className="bg-red-100 p-4 rounded-xl mb-5 border border-red-200"
              >
                <Text className="text-red-600">{error}</Text>
              </View>
            )}

            {/* Photo de profil */}
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={pickImage}
                className="relative"
                activeOpacity={0.8}
              >
                {photo ? (
                  <Image source={{ uri: photo }} className="w-24 h-24 rounded-full" />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center border border-gray-300">
                    <Icon name="person-circle-outline" size={48} color="#A0AEC0" />
                  </View>
                )}
                <View className="absolute bottom-0 right-0 bg-secondary w-8 h-8 rounded-full items-center justify-center">
                  <Text className="text-white text-xl">+</Text>
                </View>
              </TouchableOpacity>
              <Text className="text-muted text-sm mt-2">Ajouter une photo</Text>

              {/* Modal pour choisir la source de la photo */}
              <Modal
                visible={showPhotoModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPhotoModal(false)}
              >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: 300, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Choisir une photo</Text>
                    <TouchableOpacity
                      style={{ width: '100%', padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 12, alignItems: 'center' }}
                      onPress={handleTakePhoto}
                    >
                      <Text style={{ fontSize: 16 }}>Prendre une photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: '100%', padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', marginBottom: 12, alignItems: 'center' }}
                      onPress={handlePickFromGallery}
                    >
                      <Text style={{ fontSize: 16 }}>Choisir depuis la galerie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: '100%', padding: 12, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => setShowPhotoModal(false)}
                    >
                      <Text style={{ fontSize: 16, color: '#EF4444' }}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              {/* Nom et prénom */}
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <OutlinedTextInput
                    label="Nom"
                    value={nom}
                    onChangeText={setNom}
                  />
                  {nomError ? <Text className="text-red-500 text-sm mt-1 ml-1">{nomError}</Text> : null}
                </View>

                <View className="flex-1">
                  <OutlinedTextInput
                    label="Prénom"
                    value={prenom}
                    onChangeText={setPrenom}
                  />
                  {prenomError ? <Text className="text-red-500 text-sm mt-1 ml-1">{prenomError}</Text> : null}
                </View>
              </View>

              {/* Email */}
              <View>
                <OutlinedTextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError ? <Text className="text-red-500 text-sm mt-1 ml-1">{emailError}</Text> : null}
              </View>

              {/* Mot de passe */}
              <View>
                <OutlinedTextInput
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {passwordError ? <Text className="text-red-500 text-sm mt-1 ml-1">{passwordError}</Text> : null}
              </View>

              {/* Confirmation du mot de passe */}
              <View>
                <OutlinedTextInput
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                {confirmPasswordError ? <Text className="text-red-500 text-sm mt-1 ml-1">{confirmPasswordError}</Text> : null}
              </View>

              {/* Sélection du service pour les professionnels */}
              {role === 'PRO' && (
                <View>
                  <Text className="text-gray-700 mb-2 ml-1">Type de service</Text>
                  <TouchableOpacity
                    className="rounded-lg p-4 bg-gray-100 border border-gray-200 flex-row justify-between items-center"
                    onPress={() => setShowServicePicker(!showServicePicker)}
                  >
                    <Text className={serviceTypeId ? "text-gray-800" : "text-gray-400"}>
                      {serviceTypeId
                        ? (services.find(s => s.id === serviceTypeId)?.name || 'Sélectionner un service')
                        : 'Sélectionner un service'}
                    </Text>
                    <View className="w-5 h-5">
                      <Icon name="chevron-down" size={20} color="#A0AEC0" />
                    </View>
                  </TouchableOpacity>

                  {showServicePicker && (
                    <View className="border border-gray-200 rounded-lg mt-1 bg-white">
                      {services.length > 0 ? (
                        services.map((service, index) => (
                          <TouchableOpacity
                            key={service.id}
                            className={`p-3 ${index < services.length - 1 ? 'border-b border-gray-100' : ''}`}
                            onPress={() => {
                              setServiceTypeId(service.id);
                              setShowServicePicker(false);
                            }}
                          >
                            <Text className="text-gray-800">{service.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity
                          className="p-3"
                          onPress={() => {
                            setServiceTypeId('Service général');
                            setShowServicePicker(false);
                          }}
                        >
                          <Text className="text-gray-800">Service général</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Bouton d'inscription */}
            <TouchableOpacity
              onPress={handleRegister}
              className={`rounded-full bg-secondary w-full items-center justify-center h-14 mt-8 ${loading ? 'opacity-90' : ''}`}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-accent font-bold text-base">S'inscrire</Text>
              )}
            </TouchableOpacity>



            {/* Lien vers la connexion */}
            <TouchableOpacity
              className="mt-8 mb-8 flex-row justify-center"
              onPress={() => navigation.navigate('AppLandingScreen')}
              activeOpacity={0.7}
            >
              <Text className="text-base text-muted">Vous avez déjà un compte ? </Text>
              <Text className="text-base text-secondary font-semibold">Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Modal de chargement */}
        <LogoSpinner
          visible={loading}
          message="Création de votre compte..."
          rotationDuration={1500}

        />
      </ScrollView>


    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;