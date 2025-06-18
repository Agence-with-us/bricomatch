import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, query, Timestamp, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RootState } from '../../store/store';

// Interface pour les utilisateurs
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'PRO' | 'PARTICULIER';
  createdAt: Timestamp;
}

const CreateAppointmentScreen = ({ navigation }) => {
  // État pour le formulaire de rendez-vous
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [duration, setDuration] = useState('30');
  const [status, setStatus] = useState('pending');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // États pour les pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  
  // États pour les données
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Utilisateur actuel depuis Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Statuts disponibles pour les rendez-vous
  const statuses = [
    { label: 'En attente', value: 'pending' },
    { label: 'Confirmé', value: 'confirmed' },
    { label: 'Terminé', value: 'completed' },
    { label: 'Annulé', value: 'cancelled' }
  ];

  // Charger les utilisateurs au démarrage
  useEffect(() => {
    loadUsers();
  }, []);

  // Fonction pour charger les utilisateurs depuis Firestore
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.id) {
        Alert.alert("Erreur", "Vous devez être connecté pour utiliser cette fonctionnalité");
        return;
      }
      
      const userQuery = query(collection(firestore, 'users'));
      const querySnapshot = await getDocs(userQuery);
      
      const loadedUsers: User[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as User;
        
        // Ne pas inclure l'utilisateur actuel dans la liste
        if (doc.id !== currentUser.id) {
          loadedUsers.push({
            id: doc.id,
            ...userData
          });
        }
      });
      
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

 

  

  // Générer un ID de salle aléatoire pour l'appel vidéo
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createAppointment = async () => {
    try {
      if (!title.trim()) {
        Alert.alert("Erreur", "Veuillez saisir un titre pour le rendez-vous");
        return;
      }
      
      if (!selectedUser) {
        Alert.alert("Erreur", "Veuillez sélectionner un utilisateur");
        return;
      }
      
      setSubmitting(true);
      
      // Combiner date et heure
      const dateTime = new Date(date);
      dateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
      
      // Déterminer qui est le pro et qui est le client
      let proId, clientId;
      
      if (currentUser.role === 'PRO') {
        proId = currentUser.id;
        clientId = selectedUser.id;
      } else {
        proId = selectedUser.id;
        clientId = currentUser.id;
      }
      
      // Générer un ID de salle pour l'appel vidéo
      const roomId = generateRoomId();
      
      // Créer l'objet rendez-vous
      const appointmentData = {
        proId,
        clientId,
        dateTime: Timestamp.fromDate(dateTime),
        duration: parseInt(duration),
        status,
        title,
        description,
        roomId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Créer un document dans la collection 'calls' pour la salle vidéo
      const callData = {
        initiatorId: currentUser.id,
        participants: [proId, clientId],
        status: 'active',
        appointmentId: null, // On ajoutera l'ID après la création du rendez-vous
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(dateTime.getTime() + (parseInt(duration) + 30) * 60000)) // Expiration = fin du RDV + 30min
      };
      
      // Créer d'abord la salle d'appel avec l'ID spécifique
      await setDoc(doc(firestore, 'calls', roomId), callData);
      
      // Ajouter à Firestore la donnée du rendez-vous
      const appointmentRef = await addDoc(collection(firestore, 'appointments'), appointmentData);
      
      // Mettre à jour la référence de l'appointmentId dans la salle d'appel
      await updateDoc(doc(firestore, 'calls', roomId), {
        appointmentId: appointmentRef.id
      });
      
      Alert.alert(
        "Succès",
        "Le rendez-vous a été créé avec succès",
        [
          { 
            text: "OK", 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Erreur lors de la création du rendez-vous:", error);
      Alert.alert("Erreur", "Impossible de créer le rendez-vous");
    } finally {
      setSubmitting(false);
    }
  };

  // Rendu d'un élément utilisateur dans la liste
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => {
        setSelectedUser(item);
        setShowUserPicker(false);
      }}
    >
      <View style={styles.userAvatarPlaceholder}>
        <Text style={styles.userInitials}>
          {item.displayName ? item.displayName.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.email}</Text>
        <Text style={styles.userType}>{item.role === 'PRO' ? 'Professionnel' : 'Client'}</Text>
      </View>
      <Ionicons 
        name="checkmark-circle" 
        size={24} 
        color={selectedUser?.id === item.id ? "#2196F3" : "transparent"}
      />
    </TouchableOpacity>
  );

  // Rendu d'un élément statut dans la liste
  const renderStatusItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.statusItem}
      onPress={() => {
        setStatus(item.value);
        setShowStatusPicker(false);
      }}
    >
      <Text style={styles.statusLabel}>{item.label}</Text>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.value) }]} />
    </TouchableOpacity>
  );

  // Obtenir la couleur selon le statut
  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // Obtenir le label selon le statut
  const getStatusLabel = (statusValue: string) => {
    const status = statuses.find(s => s.value === statusValue);
    return status ? status.label : 'Inconnu';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un rendez-vous</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Sélection de l'utilisateur */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Utilisateur</Text>
            <TouchableOpacity 
              style={styles.selectBox}
              onPress={() => setShowUserPicker(true)}
            >
              {selectedUser ? (
                <View style={styles.selectedUserContainer}>
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userInitials}>
                      {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.selectedUserInfo}>
                    <Text style={styles.selectedUserName}>{selectedUser.displayName || selectedUser.email}</Text>
                    <Text style={styles.selectedUserType}>{selectedUser.role === 'PRO' ? 'Professionnel' : 'Client'}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Sélectionner un utilisateur</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Titre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre du rendez-vous"
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (optionnelle)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description ou notes supplémentaires"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>
          
          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateTimeInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
           
          </View>
          
          {/* Heure */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Heure</Text>
            <TouchableOpacity
              style={styles.dateTimeInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {format(time, 'HH:mm', { locale: fr })}
              </Text>
              <Ionicons name="time-outline" size={20} color="#666" />
            </TouchableOpacity>
            
          </View>
          
          {/* Durée */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Durée (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="Durée en minutes"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>
          
          {/* Statut */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Statut</Text>
            <TouchableOpacity 
              style={styles.statusSelectBox}
              onPress={() => setShowStatusPicker(true)}
            >
              <View style={styles.selectedStatusContainer}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={styles.selectedStatusText}>{getStatusLabel(status)}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Bouton de création */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={createAppointment}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Créer le rendez-vous</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Modal pour sélectionner un utilisateur */}
      <Modal
        visible={showUserPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un utilisateur</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
              </View>
            ) : (
              <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.userList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Aucun utilisateur disponible</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal pour sélectionner un statut */}
      <Modal
        visible={showStatusPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.statusModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un statut</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={statuses}
              renderItem={renderStatusItem}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.statusList}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2196F3',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  statusModal: {
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userList: {
    padding: 16,
  },
  statusList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userType: {
    fontSize: 14,
    color: '#666',
  },
  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedUserInfo: {
    marginLeft: 12,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedUserType: {
    fontSize: 14,
    color: '#666',
  },
  statusSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedStatusText: {
    fontSize: 16,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusLabel: {
    fontSize: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    padding: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CreateAppointmentScreen;