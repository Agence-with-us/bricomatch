import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completeProfileRequest } from '../../../store/authentification/reducer';
import { RootState } from '../../../store/store';
import Icon from 'react-native-vector-icons/Ionicons';
import OutlinedTextInput from '../../../components/common/OutlinedTextInput';
import LogoSpinner from '../../common/LogoSpinner';
import { Service } from '../../../store/services/types';

// Importez les images nécessaires
// Assurez-vous que ces chemins correspondent à vos assets
const offsetOrangeSplash = require('../../../../assets/splash-bg-offset-orange.png');
const logoBricomatchOrange = require('../../../../assets/logo-bricomatch-orange.png');

const CompleteProfileScreen = () => {
  const dispatch = useDispatch();
  const { tempUserData, loading } = useSelector((state: RootState) => state.auth);
  const { services } = useSelector((state: RootState) => state.services);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [showServicePicker, setShowServicePicker] = useState(false);

  const validateForm = () => {
    let isValid = true;
    if (!selectedService)
      Alert.alert("Veuillez choisir un service SVP!")

    // Validation de la description (optionnelle mais limitée à 200 caractères)
    if (description && description.length > 200) {
      setDescriptionError('La description ne doit pas dépasser 200 caractères');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      dispatch(completeProfileRequest({
        ...tempUserData,
        serviceTypeId: selectedService?.id,
        description,
      }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
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
            <Text className="text-2xl text-muted font-bold mb-6">Compléter votre profil</Text>

            {/* Photo de profil */}
            {tempUserData?.photoUrl && (
              <View className="items-center mb-6">
                <View className="relative">
                  <Image
                    source={{ uri: tempUserData.photoUrl }}
                    className="w-24 h-24 rounded-full"
                  />
                </View>
                <Text className="text-muted text-sm mt-2">Votre photo de profil</Text>
              </View>
            )}

            {/* Formulaire */}
            <View className="space-y-4">
              {/* Sélection du service */}
              <View>
                <Text className="text-gray-700 mb-2 ml-1">Type de service</Text>
                <TouchableOpacity
                  className="rounded-lg p-4 bg-gray-100 border border-gray-200 flex-row justify-between items-center"
                  onPress={() => setShowServicePicker(!showServicePicker)}
                >
                  <Text className={selectedService ? "text-gray-800" : "text-gray-400"}>
                    {selectedService?.name || 'Sélectionner un service'}
                  </Text>
                  <View className="w-5 h-5">
                    <Icon name="chevron-down" size={20} color="#A0AEC0" />
                  </View>
                </TouchableOpacity>

                {showServicePicker && (
                  <View className="border border-gray-200 rounded-lg mt-1 bg-white">
                    {services && services.length > 0 ? (
                      services.map((service, index) => (
                        <TouchableOpacity
                          key={service.id}
                          className={`p-3 ${index < services.length - 1 ? 'border-b border-gray-100' : ''}`}
                          onPress={() => {
                            setSelectedService(service);
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
                          setSelectedService(services[0]);
                          setShowServicePicker(false);
                        }}
                      >
                        <Text className="text-gray-800">Service général</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Description (optionnelle) */}
              <View>
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

            {/* Bouton de validation */}
            <TouchableOpacity
              onPress={handleSubmit}
              className={`rounded-full bg-secondary w-full items-center justify-center h-14 my-8 ${loading ? 'opacity-90' : ''}`}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-accent font-bold text-base">Continuer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal de chargement */}
        <LogoSpinner
          visible={loading}
          message="Finalisation de votre profil..."
          rotationDuration={1500}

        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CompleteProfileScreen;