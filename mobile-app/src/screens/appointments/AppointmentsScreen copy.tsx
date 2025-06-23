import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store/store';
import { Appointment, AppointmentStatus } from '../../store/appointments/types';
import { navigate } from '../../services/navigationService';
import { ProfileStatusAvatar } from '../../components/elements/fiche-professionnel/ProfileStatusAvatar';
import UserInitials from '../../components/elements/users/UserInitials';
import GoBack from '../../components/common/GoBack';

const AppointmentsScreen = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfoCache, setUserInfoCache] = useState({});
  const { services } = useSelector((state: RootState) => state.services);


  // Récupérer l'utilisateur connecté depuis Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Charger les rendez-vous
  const loadAppointments = async () => {
    try {
      setLoading(true);

      if (!currentUser?.id) {
        console.error("Utilisateur non connecté");
        return;
      }

      // Définition du champ de filtrage en fonction du rôle
      const field = currentUser.role === "PRO" ? "proId" : "clientId";

      // Créer une requête pour récupérer les rendez-vous de l'utilisateur connecté
      const appointmentsQuery = query(
        collection(firestore, 'appointments'),
        where(field, '==', currentUser.id),
        orderBy('dateTime', 'asc')
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = [];

      // Récupérer les données de rendez-vous
      for (const docSnap of querySnapshot.docs) {
        const appointment = {
          id: docSnap.id,
          ...docSnap.data()
        };

        // Récupérer les informations de l'autre utilisateur (pro ou client)
        //@ts-ignore
        const otherUserId = currentUser.role === "PRO" ? appointment.clientId : appointment.proId;

        //@ts-ignore
        if (otherUserId && !userInfoCache[otherUserId]) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();

              setUserInfoCache(prev => ({
                ...prev,
                [otherUserId]: {
                  ...userData,
                  nom: userData.nom,
                  prenom: userData.prenom,
                  photoUrl: userData.photoUrl,
                  serviceInfo: services?.find(({ id }) => id === userData.serviceTypeId)
                }
              }));
            }
          } catch (error) {
            console.error("Erreur lors de la récupération des informations utilisateur:", error);
          }
        }

        appointmentsData.push(appointment);
      }

      setAppointments(appointmentsData as Appointment[]);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous:", error);
      Alert.alert("Erreur", "Impossible de charger vos rendez-vous");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialiser les rendez-vous au chargement
  useEffect(() => {
    loadAppointments();
  }, [currentUser]);

  // Gérer le rafraîchissement de la liste
  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  // Confirmer un rendez-vous (pour les pros)
  const confirmAppointment = async (appointmentId: string) => {
    try {
      const appointmentRef = doc(firestore, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: AppointmentStatus.CONFIRMED
      });

      // Rafraîchir la liste des rendez-vous
      loadAppointments();
      Alert.alert("Succès", "Le rendez-vous a été confirmé");
    } catch (error) {
      console.error("Erreur lors de la confirmation du rendez-vous:", error);
      Alert.alert("Erreur", "Impossible de confirmer le rendez-vous");
    }
  };

  // Annuler un rendez-vous
  const cancelAppointment = async (appointmentId: string) => {
    try {
      const appointmentRef = doc(firestore, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: AppointmentStatus.CANCELLED
      });

      // Rafraîchir la liste des rendez-vous
      loadAppointments();
      Alert.alert("Succès", "Le rendez-vous a été annulé");
    } catch (error) {
      console.error("Erreur lors de l'annulation du rendez-vous:", error);
      Alert.alert("Erreur", "Impossible d'annuler le rendez-vous");
    }
  };

  // Joindre l'appel vidéo
  const joinVideoCall = async (roomId: string) => {

    try {
      // Vérifier si la salle existe et si elle contient une offre
      const roomRef = doc(firestore, 'calls', roomId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const roomData = roomSnap.data();

        // Si la salle contient une offre, l'utilisateur n'est pas l'initiateur
        const isInitiator = !roomData.offer;

        console.log("Rejoindre l'appel en tant que:", isInitiator ? "initiateur" : "participant");

        navigate('VideoCall', {
          roomId,
          isInitiator
        });
      } else {
        Alert.alert('Erreur', 'Cette salle d\'appel n\'existe pas');
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de la salle:", error);
      Alert.alert('Erreur', 'Impossible de rejoindre l\'appel');
    }
  };

  // Organiser les rendez-vous par catégorie (à venir, passés)
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];


    appointments.forEach(appointment => {
      const appointmentDate = appointment.dateTime.toDate();
      const [hours, minutes] = appointment.timeSlot.split(":").map(Number);

      // Construire une date complète avec la date + heure exacte du rendez-vous
      const fullAppointmentDate = new Date(appointmentDate);
      fullAppointmentDate.setHours(hours, minutes, 0, 0);

      // Déterminer la fin du rendez-vous
      const endTime = new Date(fullAppointmentDate.getTime() + appointment.duration * 60000);

      // Ajouter la propriété isOngoing pour savoir si le rendez-vous est en cours
      const isOngoing = fullAppointmentDate <= now && endTime >= now;
      const enrichedAppointment = {
        ...appointment,
        isOngoing,
        fullDate: fullAppointmentDate,
        endTime
      };

      if (endTime < now) {
        // Rendez-vous passés
        past.push(enrichedAppointment);
      } else {
        // Rendez-vous à venir ou en cours
        upcoming.push(enrichedAppointment);
      }
    });

    // Trier les rendez-vous par date (plus récent d'abord pour les passés, plus proche d'abord pour les à venir)
    upcoming.sort((a, b) => a.fullDate - b.fullDate);
    past.sort((a, b) => b.fullDate - a.fullDate);

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  // Formater la date et l'heure pour l'affichage
  const formatDateTime = (timestamp: any) => {
    const date = timestamp.toDate();
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  // Formater l'heure du rendez-vous
  const formatTimeSlot = (timeSlot: string, duration: string) => {
    const [startHour, startMinute] = timeSlot.split(':').map(Number);

    // Calculer l'heure de fin
    let endHour = startHour;
    let endMinute = startMinute + duration;

    while (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }

    // Formater avec des zéros si nécessaire
    const formattedEndHour = endHour.toString().padStart(2, '0');
    const formattedEndMinute = endMinute.toString().padStart(2, '0');

    return `${timeSlot} > ${formattedEndHour}:${formattedEndMinute}`;
  };



  // Rendu d'un rendez-vous
  const renderAppointmentItem = ({ item }) => {
    const otherUserId = currentUser.role === "PRO" ? item.clientId : item.proId;
    const otherUserInfo = userInfoCache[otherUserId];

    return (
      <View style={styles.appointmentCard}>

        <View style={styles.appointmentHeader}>
          <View style={styles.userInfoContainer}>
            <View style={styles.avatarContainer}>
              {/* Placeholder pour l'avatar */}
              {userInfoCache[otherUserId].photoUrl ?

                <Image src={userInfoCache[otherUserId].photoUrl} className="rounded-full"
                  style={{
                    width: 40,
                    height: 40
                  }}
                /> :
                <UserInitials nom={userInfoCache[otherUserId].nom} prenom={userInfoCache[otherUserId].prenom} />
              }
            </View>
            <View>
              <Text style={styles.userName}>{otherUserInfo.nom} {otherUserInfo.prenom}</Text>
              <Text style={styles.userProfession}>{otherUserInfo?.serviceInfo?.name}</Text>
            </View>
          </View>
          <TouchableOpacity className='bg-[#f7f0eb] p-2 rounded-full' onPress={()=>{navigate('FicheProfessionnel',{professionnel: userInfoCache[otherUserId]})}}>
            <Ionicons name="chevron-forward" size={24} color="#FF5722" />
          </TouchableOpacity>
        </View>

        <View style={styles.appointmentDetails}>
          <Text style={styles.appointmentDate}>{formatDateTime(item.dateTime)}</Text>
          <View style={styles.timeSlotContainer}>
            <Text style={styles.timeSlot}>{formatTimeSlot(item.timeSlot, item.duration)}</Text>
          </View>
        </View>

        <View style={styles.appointmentActions}>
          {item.isOngoing && item.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => joinVideoCall(item.roomId)}
            >
              <Text style={styles.joinButtonText}>REJOINDRE LA VISIO</Text>
            </TouchableOpacity>
          )}

          {(item.isOngoing || item.fullDate > new Date()) && item.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => cancelAppointment(item.id)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}

          {currentUser.role === "PRO" && item.status === 'pending' && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => confirmAppointment(item.id)}
            >
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Rendu d'une liste vide
  const renderEmptyList = (type) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        Aucun rendez-vous {type === 'upcoming' ? 'à venir' : 'passé'}
      </Text>
    </View>
  );


  return (
    <SafeAreaView style={styles.container}>
      {/* Rendez-vous à venir */}
      <View style={styles.section}>

        <View style={styles.sectionHeader}>
          <View className="flex-row items-center mb-10">
            <GoBack />
            <Text className="text-muted text-xl font-bold mx-auto">Mes RDV</Text>
          </View>
          <Text className='text-[#515C6F] font-semibold text-sm'>MES RDV À VENIR</Text>

        </View>


        <FlatList
          data={upcomingAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={upcomingAppointments.length === 0 ? { flexGrow: 1 } : null}
          ListEmptyComponent={() => renderEmptyList('upcoming')}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF5722"]} />
          }
        />
      </View>

      {/* Rendez-vous passés */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text className='text-[#515C6F] font-semibold text-sm'>MES RDV PASSÉS</Text>
        </View>

        <FlatList
          data={pastAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={pastAppointments.length === 0 ? { flexGrow: 1 } : null}
          ListEmptyComponent={() => renderEmptyList('past')}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF5722"]} />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userProfession: {
    fontSize: 14,
    color: '#666',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  appointmentDate: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  timeSlotContainer: {
    backgroundColor: '#ffff',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: "#f95200"
  },
  timeSlot: {
    color: '#f95200',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  joinButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#F44336',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});

export default AppointmentsScreen;