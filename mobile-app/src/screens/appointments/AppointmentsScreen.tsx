import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {  doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store/store';
import {  AppointmentStatus, AppointmentWithOtherUserInfo } from '../../store/appointments/types';
import { navigate } from '../../services/navigationService';
import { mediaDevices } from 'react-native-webrtc';
import { showToast } from '../../utils/toastNotification';
import AppointmentCardItem from '../../components/elements/appointments/AppointmentCardItem';
import axiosInstance from '../../config/axiosInstance';
import LogoSpinner from '../../components/common/LogoSpinner';
import { fetchAppointmentsRequest, updateAppointmentStatusRequest } from '../../store/appointments/reducer';

const AppointmentsScreen = () => {
  const { myAppointements, loading } = useSelector((state: RootState) => state.appointments);
  const dispatch = useDispatch();



  // Récupérer l'utilisateur connecté depuis Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);


  // Initialiser les rendez-vous au chargement
  useEffect(() => {
    if (myAppointements.length === 0) {
      dispatch(fetchAppointmentsRequest());
    }

  }, [currentUser]);

  // Gérer le rafraîchissement de la liste
  const onRefresh = () => {
    dispatch(fetchAppointmentsRequest());
  };

  // Confirmer un rendez-vous (pour les pros)
  const confirmAppointment = async (appointmentId: string) => {

    // Appel de l'API qui change le statut côté backend
    await axiosInstance.patch(`/appointments/${appointmentId}/confirm`);


    // Mise à jour locale de l'état "combinedAppointments" pour refléter le nouveau statut
    dispatch(updateAppointmentStatusRequest({
      id: appointmentId,
      status: AppointmentStatus.CONFIRMED
    }));
  };

  // Annuler un rendez-vous
  const cancelAppointment = async (appointmentId: string) => {


    // Appel de l'API qui change le statut côté backend
    const response = await axiosInstance.patch(`/appointments/${appointmentId}/cancel`);

    // Mise à jour locale de l'état "combinedAppointments" pour refléter le nouveau statut
    dispatch(updateAppointmentStatusRequest({
      id: appointmentId,
      status: response.data.updatedAppointment.status
    }));


  };

  // Joindre l'appel vidéo
  const joinVideoCall = async (appointmentEtUser: AppointmentWithOtherUserInfo) => {
    const isMeetingExists = await checkIfCallIsStarted(appointmentEtUser.appointment.id as string);

    const requestPermissions = async () => {
      try {
        const audioPermission = await mediaDevices.getUserMedia({
          audio: true,
        });
        const videoPermission = await mediaDevices.getUserMedia({
          video: true,
        });
        return audioPermission && videoPermission;
      } catch (error) {

        showToast(
          'Permission refusée pour accéder à la caméra et au microphone',
          'Veuillez autoriser l\'accès à la caméra et au microphone',
          'error'
        );
        return false;
      }
    };

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    navigate('VideoCall', {
      appointmentEtUser,
      needToStartCall: !isMeetingExists,
    });

  };

  const { upcomingAppointments, pastAppointments } = useMemo(() => {

    // Récupère l'heure actuelle en millisecondes via un Firestore Timestamp
    const nowMillis = Timestamp.now().toMillis();

    const upcoming: AppointmentWithOtherUserInfo[] = [];
    const past: AppointmentWithOtherUserInfo[] = [];

    console.log("myAppointements", myAppointements);
    myAppointements.forEach(appointmentEtUser => {
      // 'appointment.dateTime' est déjà un Firestore Timestamp qui contient l'heure de début
      // @ts-ignore
      const startTimestamp: Timestamp = appointmentEtUser.appointment.dateTime;
      const startMillis = startTimestamp.toMillis();

      // Calcul de l'heure de fin en ajoutant la durée (en minutes converties en millisecondes)
      const endMillis = startMillis + appointmentEtUser.appointment.duration * 60000;
      const endTimestamp = Timestamp.fromMillis(endMillis);

      // Détermine si le rendez-vous est en cours
      const isOngoing = startMillis <= nowMillis && endMillis >= nowMillis;

      // Détermine le statut temporel du rendez-vous et le stocke dans "timeStatus"
      let timeStatus: "past" | "ongoing" | "upcoming";
      if (endMillis < nowMillis) {
        timeStatus = "past";
      } else if (startMillis > nowMillis) {
        timeStatus = "upcoming";
      } else {
        timeStatus = "ongoing";
      }

      // Création de l'objet enrichi incluant fullDate (heure de début), endTime (heure de fin) et timeStatus
      const enrichedAppointment = {
        ...appointmentEtUser,
        isOngoing,
        fullDate: startTimestamp,
        endTime: endTimestamp,
        timeStatus, // Nouveau champ indiquant si le rendez-vous est passé, en cours ou à venir
      };
      if (timeStatus === "past") {
        past.push(enrichedAppointment);
      } else {
        upcoming.push(enrichedAppointment);
      }
    });

    // Trier :
    // - Les rendez-vous à venir par ordre croissant (du plus proche au plus éloigné)
    // - Les rendez-vous passés par ordre décroissant (du plus récent au plus ancien)
    upcoming.sort((a, b) => a.fullDate.toMillis() - b.fullDate.toMillis());
    past.sort((a, b) => b.fullDate.toMillis() - a.fullDate.toMillis());

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [myAppointements]);



  const checkIfCallIsStarted = async (appointmentId: string): Promise<boolean> => {
    if (!appointmentId) return false;

    const roomRef = doc(firestore, 'appointments', appointmentId);

    const roomSnapshot = (await getDoc(roomRef)).data();
    const isCallStarted = roomSnapshot?.isCallStarted;

    if (!isCallStarted) {
      await updateDoc(roomRef, { isCallStarted: true });
      return false;
    }
    return true;
  };


  // Rendu d'une liste vide
  const renderEmptyList = (type: any) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        Aucun rendez-vous {type === 'upcoming' ? 'à venir' : type === 'ongoing' ? 'en cours' : 'passé'}
      </Text>
    </View>
  );


  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={["#FF5722"]}
          />
        }
        showsVerticalScrollIndicator={true}
      >

        {/* Section Rendez-vous en cours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MES RDV EN COURS</Text>
          </View>

          {upcomingAppointments.filter(item => item.isOngoing).length === 0 ? (
            <View style={styles.emptySection}>
              {renderEmptyList('ongoing')}
            </View>
          ) : (
            upcomingAppointments.filter(item => item.isOngoing).map((item) => (
              <AppointmentCardItem
                key={item.appointment.id!}
                appointmentWithOtherUser={item}
                currentUser={currentUser!}
                joinVideoCall={joinVideoCall}
                cancelAppointment={undefined} // Désactive le bouton Annuler pour les RDV en cours
                confirmAppointment={confirmAppointment}
              />
            ))
          )}
        </View>

        {/* Section Rendez-vous à venir (hors en cours) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MES RDV À VENIR</Text>
          </View>

          {upcomingAppointments.filter(item => !item.isOngoing).length === 0 ? (
            <View style={styles.emptySection}>
              {renderEmptyList('upcoming')}
            </View>
          ) : (
            upcomingAppointments.filter(item => !item.isOngoing).map((item) => (
              <AppointmentCardItem
                key={item.appointment.id!}
                appointmentWithOtherUser={item}
                currentUser={currentUser!}
                joinVideoCall={joinVideoCall}
                cancelAppointment={cancelAppointment}
                confirmAppointment={confirmAppointment}
              />
            ))
          )}
        </View>

        {/* Section Rendez-vous passés */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MES RDV PASSÉS</Text>
          </View>

          {pastAppointments.length === 0 ? (
            <View style={styles.emptySection}>
              {renderEmptyList('past')}
            </View>
          ) : (
            pastAppointments.map((item) => (
              <AppointmentCardItem
                key={item.appointment.id!}
                appointmentWithOtherUser={item}
                currentUser={currentUser!}
                joinVideoCall={joinVideoCall}
                cancelAppointment={cancelAppointment}
                confirmAppointment={confirmAppointment}
              />
            ))
          )}
        </View>

        {/* Espace en bas pour éviter que le dernier élément soit coupé */}
        <View style={styles.bottomSpacer} />

        <LogoSpinner
          visible={loading}
          message="Rendez-vous en cours..."
          rotationDuration={1500}

        />
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20, // Espace supplémentaire en bas
  },
  header: {
    backgroundColor: '#ffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    backgroundColor: '#ffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#515C6F',
    letterSpacing: 0.5,
  },
  emptySection: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
