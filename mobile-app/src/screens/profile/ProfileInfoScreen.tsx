import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { firestore, auth } from '../../config/firebase.config';
import { RootState } from '../../store/store';
import { showToast } from '../../utils/toastNotification';

const ProfileInfoScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);

  // Informations utilisateur modifiables
  const [userInfo, setUserInfo] = useState({
    nom: currentUser?.nom || '',
    prenom: currentUser?.prenom || '',
    description: currentUser?.description || '',
    photoUrl: currentUser?.photoUrl || null,
  });

  // Informations pour le changement de mot de passe
  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Déterminer si l'utilisateur peut changer son mot de passe
  // (uniquement pour les comptes email/password)
  const canChangePassword = auth.currentUser?.providerData?.[0]?.providerId === 'password';

  // Charger les informations de service si nécessaire
  useEffect(() => {
    if (currentUser?.serviceTypeId) {
      loadServiceInfo();
    }
  }, [currentUser]);

  const loadServiceInfo = async () => {
    try {
      const serviceDoc = await getDoc(doc(firestore, 'services', currentUser.serviceTypeId));
      if (serviceDoc.exists()) {
        setServiceInfo(serviceDoc.data());
      }
    } catch (error) {
      console.error("Erreur lors du chargement des informations de service:", error);
    }
  };

  // Fonction pour choisir une image depuis la galerie
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission refusée", "Vous devez autoriser l'accès à votre galerie.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setUserInfo({ ...userInfo, photoUrl: imageUri });
        
        // Si en mode édition, uploader immédiatement l'image
        if (editMode) {
          uploadImage(imageUri);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sélection de l'image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image.");
    }
  };

  // Fonction pour uploader une image sur Firebase Storage
  const uploadImage = async (uri) => {
    if (!uri) return null;
    
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${currentUser.id}/${Date.now()}`);
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      setUploading(false);
      return downloadUrl;
    } catch (error) {
      setUploading(false);
      console.error("Erreur lors de l'upload de l'image:", error);
      Alert.alert("Erreur", "Impossible d'uploader l'image.");
      return null;
    }
  };

  // Fonction pour sauvegarder les modifications du profil
  const saveProfile = async () => {
    setLoading(true);
    try {
    //   let photoUrl = userInfo.photoUrl;
      
    //   // Si l'URL de la photo commence par 'file://' ou 'content://', c'est une nouvelle image locale
    //   if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('content://'))) {
    //     photoUrl = await uploadImage(photoUrl);
    //   }
      
    //   const userRef = doc(firestore, 'users', currentUser.id);
    //   const updatedUserData = {
    //     nom: userInfo.nom,
    //     prenom: userInfo.prenom,
    //     description: userInfo.description,
    //     ...(photoUrl ? { photoUrl } : {})
    //   };
      
    //   await updateDoc(userRef, updatedUserData);
      
    //   // Mettre à jour les informations utilisateur dans Redux
    //   dispatch(updateUser({
    //     ...currentUser,
    //     ...updatedUserData
    //   }));
      
      setEditMode(false);
      showToast('Votre profil a été mis à jour avec succès.',"success")
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du profil:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour votre profil.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour changer le mot de passe
  const changePassword = async () => {
    // Vérifier si les nouveaux mots de passe correspondent
    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      Alert.alert("Erreur", "Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    
    // Vérifier la longueur minimale du mot de passe
    if (passwordInfo.newPassword.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordInfo.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Changer le mot de passe
      await updatePassword(user, passwordInfo.newPassword);
      
      // Réinitialiser le formulaire et fermer le modal
      setPasswordInfo({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordModal(false);
      
      Alert.alert("Succès", "Votre mot de passe a été modifié avec succès.");
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      
      if (error.code === 'auth/wrong-password') {
        Alert.alert("Erreur", "Le mot de passe actuel est incorrect.");
      } else if (error.code === 'auth/weak-password') {
        Alert.alert("Erreur", "Le nouveau mot de passe est trop faible.");
      } else {
        Alert.alert("Erreur", "Impossible de modifier votre mot de passe.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Rendu du formulaire de changement de mot de passe
  const renderPasswordModal = () => {
    if (!showPasswordModal) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Changer le mot de passe</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Mot de passe actuel"
            secureTextEntry
            value={passwordInfo.currentPassword}
            onChangeText={(text) => setPasswordInfo({ ...passwordInfo, currentPassword: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            secureTextEntry
            value={passwordInfo.newPassword}
            onChangeText={(text) => setPasswordInfo({ ...passwordInfo, newPassword: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirmer le nouveau mot de passe"
            secureTextEntry
            value={passwordInfo.confirmPassword}
            onChangeText={(text) => setPasswordInfo({ ...passwordInfo, confirmPassword: text })}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={changePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* En-tête du profil */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {uploading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF5722" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.profileImageWrapper}
                onPress={editMode ? pickImage : null}
                disabled={!editMode || uploading}
              >
                {userInfo.photoUrl ? (
                  <Image
                    source={{ uri: userInfo.photoUrl }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>
                      {userInfo.prenom && userInfo.prenom[0] || userInfo.nom && userInfo.nom[0] || '?'}
                    </Text>
                  </View>
                )}
                {editMode && (
                  <View style={styles.editImageButton}>
                    <Ionicons name="camera" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerInfo}>
            {editMode ? (
              <View style={styles.nameInputContainer}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Prénom"
                  value={userInfo.prenom}
                  onChangeText={(text) => setUserInfo({ ...userInfo, prenom: text })}
                />
                <TextInput
                  style={styles.nameInput}
                  placeholder="Nom"
                  value={userInfo.nom}
                  onChangeText={(text) => setUserInfo({ ...userInfo, nom: text })}
                />
              </View>
            ) : (
              <Text style={styles.userName}>
                {userInfo.prenom} {userInfo.nom}
              </Text>
            )}
            <Text style={styles.userRole}>
              {currentUser?.role === 'PRO' ? 'Professionnel' : 'Client'}
              {serviceInfo && ` • ${serviceInfo.name}`}
            </Text>
          </View>
        </View>
        
        {/* Actions de profil */}
        <View style={styles.actionBar}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // Restaurer les informations originales
                  setUserInfo({
                    nom: currentUser?.nom || '',
                    prenom: currentUser?.prenom || '',
                    description: currentUser?.description || '',
                    photoUrl: currentUser?.photoUrl || null,
                  });
                  setEditMode(false);
                }}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={saveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="pencil" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Modifier le profil</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Informations du profil */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoLabel}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.labelText}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{currentUser?.email}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoLabel}>
              <Ionicons name="create-outline" size={20} color="#666" />
              <Text style={styles.labelText}>Description</Text>
            </View>
            {editMode ? (
              <TextInput
                style={styles.descriptionInput}
                placeholder="Ajoutez une description..."
                multiline
                numberOfLines={4}
                value={userInfo.description}
                onChangeText={(text) => setUserInfo({ ...userInfo, description: text })}
              />
            ) : (
              <Text style={styles.infoValue}>
                {userInfo.description || "Aucune description"}
              </Text>
            )}
          </View>
          
          {canChangePassword && (
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#FF5722" />
              <Text style={styles.passwordButtonText}>Changer le mot de passe</Text>
            </TouchableOpacity>
          )}
          
          {currentUser?.role === 'PRO' && serviceInfo && (
            <View style={styles.serviceSection}>
              <Text style={styles.sectionTitle}>Informations professionnelles</Text>
              
              <View style={styles.infoItem}>
                <View style={styles.infoLabel}>
                  <Ionicons name="briefcase-outline" size={20} color="#666" />
                  <Text style={styles.labelText}>Service</Text>
                </View>
                <Text style={styles.infoValue}>{serviceInfo.name}</Text>
              </View>
              
              {serviceInfo.description && (
                <View style={styles.infoItem}>
                  <View style={styles.infoLabel}>
                    <Ionicons name="information-circle-outline" size={20} color="#666" />
                    <Text style={styles.labelText}>Description du service</Text>
                  </View>
                  <Text style={styles.infoValue}>{serviceInfo.description}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Modal pour le changement de mot de passe */}
      {renderPasswordModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#757575',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  loadingOverlay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  nameInputContainer: {
    flexDirection: 'column',
  },
  nameInput: {
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 8,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#FF5722',
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  serviceSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  descriptionInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  passwordButtonText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#FF5722',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ProfileInfoScreen;