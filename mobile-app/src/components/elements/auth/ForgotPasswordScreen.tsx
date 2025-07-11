import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import OutlinedTextInput from '../../common/OutlinedTextInput';
import { resetPasswordRequest, clearError } from '../../../store/authentification/reducer';
import GoBack from '../../common/GoBack';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/RootStackParamList';
const offsetOrangeSplash = require('../../../../assets/splash-bg-offset-orange.png')
const logoBricomatchOrange = require('../../../../assets/logo-bricomatch-orange.png')


type Props = StackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [email, setEmail] = useState('');
  const [inputError, setInputError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = () => {
    setInputError('');
    if (!email.trim()) {
      setInputError('Email est requis');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setInputError('Format email invalide');
      return;
    }
    dispatch(resetPasswordRequest({ email }));
    setSuccess(true);
  };

  return (

    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 pt-10 bg-background"
    >
      {/* Image de fond avec overlay pour meilleure visibilité du contenu */}
      <Image
        source={offsetOrangeSplash }
        className="absolute top-0 right-0 z-0 w-full h-80"
        resizeMode="cover"
      />

      {/* Container principal avec padding consistant */}
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6">
          {/* En-tête */}
          <View className="w-full flex-row justify-between items-center mt-4">
            <GoBack />
            <Text className="text-muted text-lg font-bold">Réinitialiser le mot de passe</Text>
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
          <View className="flex-1 w-full mt-20">
            <Text className="text-xl text-muted font-bold ">Mot de passe oublié ?</Text>
            <Text className="text-muted text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</Text>


            {/* Champs de formulaire avec espacement amélioré */}
            <View className="mt-2">
              <View className="mb-2">
                <OutlinedTextInput
                  className=""
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onFocus={() => { setInputError(''); if (error) dispatch(clearError()); }}
                />
               
              </View>

             
            </View>

            {/* Bouton de connexion principal avec état de chargement */}
            <TouchableOpacity
              onPress={handleSend}
              className={`rounded-full bg-secondary w-52 mx-auto items-center justify-center h-14 mt-4 ${loading ? 'bg-orange-200 opacity-90' : ''}`}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text className="text-accent font-bold text-base">{`${!loading ? 'Envoyer le lien' : 'Envoi...'}`}</Text>
            </TouchableOpacity>


          </View>

        </View>
        </ScrollView>
      </SafeAreaView>

    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen; 