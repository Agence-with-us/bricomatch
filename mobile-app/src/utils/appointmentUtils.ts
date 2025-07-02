import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentStatus } from "../store/appointments/types";

export const formatDateTimeFromTimeStamp = (timestamp: any) => {
    if (!timestamp) {
        console.error("Erreur: `timestamp` est undefined ou incorrect", timestamp);
        return "Date invalide";
    }

    // 🔹 Vérifie si `timestamp.toDate()` existe → Firebase Timestamp
    const date = timestamp.toDate ? timestamp.toDate() 
              : new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);

    return format(date, "EEEE d MMMM yyyy", { locale: fr });
};


export function formatTimeRangeFromTimestamp(startTimestamp: any, duration: number): string {
  // Convertir startTimestamp en objet Date
  let startDate: Date;
  if (startTimestamp && typeof startTimestamp.toDate === 'function') {
    startDate = startTimestamp.toDate();
  } else {
    startDate = new Date(startTimestamp);
  }
  
  // Calcul de l'heure de fin en ajoutant la durée (en minutes)
  const endDate = new Date(startDate.getTime() + duration * 60000);

  // Fonction pour formater une date au format "HH:mm"
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
}


export const formatFullDateTimeFromTimeStamp = (timestamp: any) => {
    if (!timestamp) {
        console.error("Erreur: `timestamp` est undefined ou incorrect", timestamp);
        return "Date invalide";
    }

    // 🔹 Vérifie si `timestamp` est un `Firebase Timestamp`, sinon conversion depuis Unix
    const date = timestamp.toDate ? timestamp.toDate() 
              : new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);

    return format(date, "dd MMMM yyyy à HH:mm", { locale: fr });
};

/**
 * Statuts de rendez-vous bloquants pour la réservation d'un rendez-vous
 * 
 * @returns {string[]} - Les statuts de rendez-vous bloquants
 */
export const blockingStatuses = [
  AppointmentStatus.PENDING, AppointmentStatus.PAYMENT_INITIATED, AppointmentStatus.PAYMENT_AUTHORIZED, AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED, AppointmentStatus.PENDING_PAYOUT, AppointmentStatus.PAID_OUT, AppointmentStatus.CANCELLED_BY_PRO_PENDING
];