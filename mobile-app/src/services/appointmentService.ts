// appointmentService.ts
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Appointment, AppointmentStatus } from '../store/appointments/types';
import { firestore } from '../config/firebase.config';



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
    
    const appointmentsRef = collection(firestore, 'appointments');
    const q = query(
      appointmentsRef,
      where('proId', '==', proId),
      where('dateTime', '>=', startOfDay),
      where('dateTime', '<=', endOfDay),
      where('status', 'in', [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    );
    
    const querySnapshot = await getDocs(q);
    
    // Vérifier si le créneau est déjà pris
    for (const doc of querySnapshot.docs) {
      const appointment = doc.data();
      if (appointment.timeSlot === timeSlot) {
        return false;
      }
    }
    
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