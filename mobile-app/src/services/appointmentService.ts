// appointmentService.ts
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Appointment, AppointmentStatus } from '../store/appointments/types';
import { firestore } from '../config/firebase.config';
import { blockingStatuses } from '../utils/appointmentUtils';



export const createAppointment = async (appointment: Appointment): Promise<{ id: string }> => {
  try {

    // Créer un paymentIntent simulé (juste un ID pour le moment)
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();

    // Ajouter le rendez-vous dans Firestore
    const appointmentData = {
      ...appointment,
      dateTime: new Date(appointment.dateTime.toDate()),
      createdAt: new Date(),
      paymentIntentId,
      roomId
    };

    const docRef = await addDoc(collection(firestore, 'appointments'), appointmentData);

    return { id: docRef.id };
  } catch (error) {
    console.error('Erreur lors de la création du rendez-vous:', error);
    throw error;
  }
};

/**
 * Vérifie si un créneau est disponible pour un professionnel.
 * 
 * @param proId - L'ID du professionnel
 * @param date - La date du créneau
 * @param timeSlot - L'heure de début du créneau
 * @returns true si le créneau est disponible, sinon false
 */
export const checkSlotAvailability = async (
  proId: string,
  date: Date,
  timeSlot: string
): Promise<boolean> => {
  try {
    // Récupérer les rendez-vous du professionnel pour cette date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les rendez-vous du professionnel pour cette date
    const appointments = await getProfessionalAppointmentsByDate(proId, date.toISOString(), blockingStatuses);
    // Vérifier si le créneau est déjà pris
    for (const appointment of appointments) {
      if (appointment.timeSlot === timeSlot) {
        return false;
      }
    }
    // Si le créneau n'est pas pris, on retourne true
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification de disponibilité:', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> => {
  try {
    const appointmentRef = doc(firestore, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      status,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    throw error;
  }
};

export const getAppointmentById = async (id: string): Promise<Appointment | null> => {
  try {
    const appointmentRef = doc(firestore, 'appointments', id);
    const appointmentSnap = await getDoc(appointmentRef);

    if (appointmentSnap.exists()) {
      const data = appointmentSnap.data() as Appointment;
      return {
        ...data,
        id: appointmentSnap.id
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération du rendez-vous:', error);
    throw error;
  }
};

export const getClientAppointments = async (clientId: string): Promise<Appointment[]> => {
  try {
    const appointmentsRef = collection(firestore, 'appointments');
    const q = query(
      appointmentsRef,
      where('clientId', '==', clientId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Appointment));
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous client:', error);
    throw error;
  }
};

export const getProfessionalAppointments = async (proId: string): Promise<Appointment[]> => {
  try {
    const appointmentsRef = collection(firestore, 'appointments');
    const q = query(
      appointmentsRef,
      where('proId', '==', proId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Appointment));
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous pro:', error);
    throw error;
  }
};

export const getProfessionalAppointmentsByDate = async (proId: string, date: string, status?: string | string[]): Promise<Appointment[]> => {
  try {
    // Début et fin de la journée
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsRef = collection(firestore, 'appointments');
    let q;

    // Ajout du filtre par status si fourni
    if (status) {
      if (Array.isArray(status)) {
        // Si plusieurs statuts, utiliser 'in'
        q = query(
          appointmentsRef,
          where('proId', '==', proId),
          where('dateTime', '>=', startOfDay),
          where('dateTime', '<=', endOfDay),
          where('status', 'in', status)
        );
      } else {
        // Un seul statut
        q = query(
          appointmentsRef,
          where('proId', '==', proId),
          where('dateTime', '>=', startOfDay),
          where('dateTime', '<=', endOfDay),
          where('status', '==', status)
        );
      }
    } else {
      // Pas de filtre status
      q = query(
        appointmentsRef,
        where('proId', '==', proId),
        where('dateTime', '>=', startOfDay),
        where('dateTime', '<=', endOfDay)
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Appointment));
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous pro par date:', error);
    throw error;
  }
};