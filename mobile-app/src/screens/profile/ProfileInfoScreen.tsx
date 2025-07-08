import React, { useState, useEffect } from 'react';
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
import { updateProfileRequest } from '../../store/authentification/reducer';
import OutlinedTextInput from '../../components/common/OutlinedTextInput';
import Icon from "react-native-vector-icons/Ionicons";
import LogoSpinner from '../../components/common/LogoSpinner';
import { auth } from '../../config/firebase.config';
import StarRating from '../../components/common/StarRating';

const offsetOrangeSplash = require('../../../assets/splash-bg-offset-orange.png');

const ProfileInfoScreen = () => {
  const dispatch = useDispatch();
  const { loading, error, user } = useSelector((state: RootState) => state.auth);
  const { services } = useSelector((state: RootState) => state.services);

  // États pour les champs du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // États pour les erreurs de validation
  const [nomError, setNomError] = useState('');
  const [prenomError, setPrenomError] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState('');

  // Vérifier si l'utilisateur s'est connecté avec Google/Apple
  const isExternalAuth = auth.currentUser?.providerId === 'google' || auth.currentUser?.providerId === 'apple';

  // Initialiser les données du profil
  useEffect(() => {
    if (user) {
      setNom(user.nom || '');
      setPrenom(user.prenom || '');
      setServiceTypeId(user.serviceTypeId || '');
      setPhoto(user.photoUrl || null);
      setDescription(user.description || '');
    }
  }, [user]);

  // Validation des champs
  const validateInputs = () => {
    let isValid = true;

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

    // Validation de la description pour les PRO
    if (user?.role === 'PRO' && description.length > 200) {
      setDescriptionError('La description ne doit pas dépasser 200 caractères');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    // Validation du mot de passe si l'utilisateur veut le changer
    if (!isExternalAuth && (currentPassword || newPassword || confirmNewPassword)) {
      if (!currentPassword.trim()) {
        setCurrentPasswordError('Mot de passe actuel est requis');
        isValid = false;
      } else {
        setCurrentPasswordError('');
      }

      if (!newPassword.trim()) {
        setNewPasswordError('Nouveau mot de passe est requis');
        isValid = false;
      } else if (newPassword.length < 6) {
        setNewPasswordError('Le mot de passe doit contenir au moins 6 caractères');
        isValid = false;
      } else {
        setNewPasswordError('');
      }

      if (newPassword !== confirmNewPassword) {
        setConfirmNewPasswordError('Les mots de passe ne correspondent pas');
        isValid = false;
      } else {
        setConfirmNewPasswordError('');
      }
    }

    return isValid;
  };

  const handleUpdateProfile = () => {
    if (validateInputs()) {
      const updateData: any = {
        nom,
        prenom,
        photoUrl: photo || '',
        serviceTypeId: user?.role === 'PRO' ? serviceTypeId : undefined,
        description: user?.role === 'PRO' ? description : undefined,
      };

      // Ajouter les données de mot de passe seulement si ce n'est pas une auth externe
      if (!isExternalAuth && currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      dispatch(updateProfileRequest(updateData));
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

          {/* Contenu principal */}
          <View className="w-full">
            <Text className="text-2xl text-muted font-bold mb-6 text-center">Informations du profil</Text>



            {/* Message d'erreur */}
            {error && (
              <View className="bg-red-100 p-4 rounded-xl mb-5 border border-red-200">
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
                  <Icon name="camera" size={16} color="#ffffff" />
                </View>
              </TouchableOpacity>
              {/* Note et nombre d'avis pour les PROs */}
              {user?.role === 'PRO' && (
                <View className='mt-2'>
                  <StarRating averageRating={user.averageRating} reviewsCount={user.reviewsCount} variant='compact'/>
                </View>
              )}
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
              {/* Email (lecture seule) */}
              <View>
                <OutlinedTextInput
                  label="Email"
                  value={user?.email || ''}
                  editable={false}
                  style={{ backgroundColor: '#F9FAFB' }}
                  onChangeText={() => { }}
                />
                <Text className="text-gray-500 text-xs mt-1 ml-1">L'email ne peut pas être modifié</Text>
              </View>

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

              {/* Section mot de passe pour les comptes email/password uniquement */}
              {!isExternalAuth && (
                <View className="mt-6">
                  <Text className="text-lg font-semibold text-muted mb-4">Changer le mot de passe</Text>

                  <View className="space-y-4">
                    <View>
                      <OutlinedTextInput
                        label="Mot de passe actuel"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                      />
                      {currentPasswordError ? <Text className="text-red-500 text-sm mt-1 ml-1">{currentPasswordError}</Text> : null}
                    </View>

                    <View>
                      <OutlinedTextInput
                        label="Nouveau mot de passe"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />
                      {newPasswordError ? <Text className="text-red-500 text-sm mt-1 ml-1">{newPasswordError}</Text> : null}
                    </View>

                    <View>
                      <OutlinedTextInput
                        label="Confirmer le nouveau mot de passe"
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry
                      />
                      {confirmNewPasswordError ? <Text className="text-red-500 text-sm mt-1 ml-1">{confirmNewPasswordError}</Text> : null}
                    </View>
                  </View>
                </View>
              )}

              {/* Information sur l'authentification externe */}
              {isExternalAuth && (
                <View className="bg-blue-50 p-4 rounded-xl border border-blue-200 mt-4">
                  <View className="flex-row items-center">
                    <Icon name="information-circle" size={20} color="#3B82F6" />
                    <Text className="text-blue-600 ml-2 flex-1">
                      Compte connecté via {auth.currentUser?.providerId === 'google' ? 'Google' : 'Apple'}.
                      Le mot de passe est géré par votre fournisseur d'authentification.
                    </Text>
                  </View>
                </View>
              )}

              {/* Sélection du service pour les professionnels */}
              {user?.role === 'PRO' && (
                <View className="mt-6">
                  <Text className="text-lg font-semibold text-muted mb-4">Informations professionnelles</Text>
                  <View className="bg-white border border-gray-200 rounded-lg p-4 flex-row items-center space-x-3 shadow-sm">
                    <Icon name="briefcase-outline" size={22} color="#FF5722" />
                    <Text className="text-base text-gray-800 font-semibold">
                      {serviceTypeId
                        ? (services.find(s => s.id === serviceTypeId)?.name || 'Service inconnu')
                        : 'Aucun service associé'}
                    </Text>
                  </View>
                  {/* Champ description pour les PRO */}
                  <View className="mt-4">
                    <OutlinedTextInput
                      label="Description (optionnelle)"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      maxLength={200}
                      placeholder="Décrivez brièvement votre activité (200 caractères max)"
                    />
                    <Text className="text-gray-500 text-xs mt-1 ml-1 text-right">
                      {description.length}/200
                    </Text>
                    {descriptionError ? <Text className="text-red-500 text-sm mt-1 ml-1">{descriptionError}</Text> : null}
                  </View>
                </View>
              )}
            </View>

            {/* Bouton de mise à jour */}
            <TouchableOpacity
              onPress={handleUpdateProfile}
              className={`rounded-full bg-secondary w-full items-center justify-center h-14 mt-8 ${loading ? 'opacity-90' : ''}`}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-accent font-bold text-base">Mettre à jour le profil</Text>
              )}
            </TouchableOpacity>

            {/* Espacement en bas */}
            <View className="h-8" />
          </View>
        </View>

        {/* Modal de chargement */}
        <LogoSpinner
          visible={loading}
          message="Mise à jour du profil..."
          rotationDuration={1500}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProfileInfoScreen;