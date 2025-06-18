// src/components/auth/ImagePicker.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { uploadPhotoRequest } from '../../store/reducers/authReducer';
import { RootState } from '../../store';

interface ImagePickerProps {
  initialImageUrl?: string;
  onImageSelected?: (imageUri: string) => void;
}

const ProfileImagePicker: React.FC<ImagePickerProps> = ({ 
  initialImageUrl,
  onImageSelected
}) => {
  const [image, setImage] = useState<string | null>(initialImageUrl || null);
  const dispatch = useDispatch();
  const { photoUploading } = useSelector((state: RootState) => state.auth);

  const pickImage = async () => {
    // Demander les permissions d'accès à la galerie
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Nous avons besoin des permissions pour accéder à votre galerie');
      return;
    }

    // Lancer le sélecteur d'image
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      setImage(selectedImage);
      
      if (onImageSelected) {
        onImageSelected(selectedImage);
      }
      
      // Dispatcher l'action pour uploader la photo
      dispatch(uploadPhotoRequest({ uri: selectedImage }));
    }
  };

  const takePhoto = async () => {
    // Demander les permissions d'accès à la caméra
    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Nous avons besoin des permissions pour accéder à votre caméra');
      return;
    }

    // Lancer la caméra
    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      setImage(selectedImage);
      
      if (onImageSelected) {
        onImageSelected(selectedImage);
      }
      
      // Dispatcher l'action pour uploader la photo
      dispatch(uploadPhotoRequest({ uri: selectedImage }));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>Photo</Text>
          </View>
        )}
        
        {photoUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Galerie</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Caméra</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};