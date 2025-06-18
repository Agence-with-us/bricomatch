import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';

const CallHome = ({ navigation }) => {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Créer un nouvel appel (en tant qu'initiateur)
  const createCall = () => {
    // Générer un code de salle aléatoire à 6 chiffres
    const generatedRoomId = Math.floor(100000 + Math.random() * 900000).toString();
    
    navigation.navigate('VideoCall', {
      roomId: generatedRoomId,
      isInitiator: true
    });
  };

  // Rejoindre un appel existant avec un code de salle
  const joinCall = async () => {
    if (!roomId || roomId.trim().length === 0) {
      Alert.alert('Erreur', 'Veuillez entrer un code de salle valide');
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si la salle existe
      const roomRef = doc(firestore, 'calls', roomId.trim());
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        navigation.navigate('VideoCall', {
          roomId: roomId.trim(),
          isInitiator: false
        });
      } else {
        Alert.alert('Erreur', 'Cette salle n\'existe pas ou est expirée');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la salle:', error);
      Alert.alert('Erreur', 'Impossible de rejoindre l\'appel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Appel Vidéo</Text>
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={createCall}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Créer un appel</Text>
          </TouchableOpacity>
          
          <Text style={styles.orText}>- OU -</Text>
          
          <Text style={styles.joinText}>Rejoindre un appel avec un code</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Entrez le code de la salle"
            placeholderTextColor="#999"
            value={roomId}
            onChangeText={setRoomId}
            keyboardType="number-pad"
            maxLength={6}
          />
          
          <TouchableOpacity
            style={[styles.joinButton, (!roomId || isLoading) && styles.disabledButton]}
            onPress={joinCall}
            disabled={!roomId || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Connexion...' : 'Rejoindre l\'appel'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orText: {
    marginVertical: 30,
    fontSize: 16,
    color: '#666',
  },
  joinText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    width: '80%',
    backgroundColor: 'white',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
});

export default CallHome;