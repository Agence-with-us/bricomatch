import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppointmentWithOtherUserInfo } from '../../../store/appointments/types';
import axiosInstance from '../../../config/axiosInstance';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  appointmentEtUser: AppointmentWithOtherUserInfo;
}

const RatingModal: React.FC<RatingModalProps> = ({ visible, onClose, appointmentEtUser }) => {
  const [ratings, setRatings] = useState({
    conseil: 0,
    ecoute: 0,
    resolution: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleStarPress = (critere: 'conseil' | 'ecoute' | 'resolution', selectedRating: number) => {
    setRatings(prev => ({ ...prev, [critere]: selectedRating }));
  };

  const moyenne = (ratings.conseil + ratings.ecoute + ratings.resolution) / 3;

  const handleSubmit = async () => {
    if (!ratings.conseil || !ratings.ecoute || !ratings.resolution) {
      Alert.alert('Erreur', 'Veuillez attribuer une note à chaque critère avant d\'envoyer');
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post(`/appointments/evaluation`, {
        proId: appointmentEtUser.otherUser.id,
        appointmentId: appointmentEtUser.appointment.id,
        rating: moyenne,
      });
      setLoading(false);
      Alert.alert('Succès', 'Merci pour votre évaluation!');
      setRatings({ conseil: 0, ecoute: 0, resolution: 0 });
      onClose();
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', 'Impossible d\'envoyer votre évaluation. Veuillez réessayer.');
      console.error('Rating error:', error);
    }
  };

  const renderStars = (critere: 'conseil' | 'ecoute' | 'resolution', value: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(critere, i)}
          style={styles.starContainer}
        >
          <Ionicons
            name={i <= value ? 'star' : 'star-outline'}
            size={40}
            color={i <= value ? '#f95200' : '#ccc'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Évaluez votre expérience</Text>
          <Text style={styles.modalSubtitle}>Merci de noter chaque critère :</Text>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Qualité du conseil</Text>
            <View style={styles.starsContainer}>{renderStars('conseil', ratings.conseil)}</View>
            <Text style={styles.feedbackText}>{ratings.conseil === 0 ? 'Appuyez sur une étoile' : ''}</Text>
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Écoute</Text>
            <View style={styles.starsContainer}>{renderStars('ecoute', ratings.ecoute)}</View>
            <Text style={styles.feedbackText}>{ratings.ecoute === 0 ? 'Appuyez sur une étoile' : ''}</Text>
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Résolution du problème</Text>
            <View style={styles.starsContainer}>{renderStars('resolution', ratings.resolution)}</View>
            <Text style={styles.feedbackText}>{ratings.resolution === 0 ? 'Appuyez sur une étoile' : ''}</Text>
          </View>

          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Moyenne : {ratings.conseil && ratings.ecoute && ratings.resolution ? moyenne.toFixed(2) + ' / 5' : '-'}
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, (!ratings.conseil || !ratings.ecoute || !ratings.resolution) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!ratings.conseil || !ratings.ecoute || !ratings.resolution || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starContainer: {
    padding: 5,
  },
  feedbackTextContainer: {
    marginBottom: 25,
    height: 20,
  },
  feedbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#f95200',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RatingModal;