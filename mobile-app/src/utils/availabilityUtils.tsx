import { addMinutes, format, isWithinInterval, parse } from "date-fns";
import { Availability, TimeRange } from "../store/availability/types";
import { Appointment } from "../store/appointments/types";
import { fr } from "date-fns/locale";


export const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Fonction pour formater une chaîne de caractères en heure (format HH:MM).
 * 
 * @param input - La chaîne de caractères à formater
 * @returns La chaîne de caractères formatée en heure
 */
export const formatTime = (input: string): string => {
  // Supprime tous les caractères non numériques
  const numbers = input.replace(/\D/g, '');

  // Si la chaîne a 2 caractères ou moins, pas besoin de formater avec ":"
  if (numbers.length <= 2) {
    return numbers;
  }

  // Formate en HH:MM
  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
};

  // Formater la date pour l'affichage
 export const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
};

/**
 * Vérifie si les plages horaires d'un jour sont valides (début < fin).
 * 
 * @param availabilities - Les disponibilités à vérifier
 * @param day - Le jour de la semaine à vérifier
 * @returns true si toutes les plages horaires sont valides, sinon false
 */
export const validateTimeRanges = (availabilities: Availability, day: string): boolean => {
  const ranges = availabilities?.[day] || [];

  for (const range of ranges) {
    // Vérification du format valide HH:MM
    if (!isValidTimeFormat(range.start) || !isValidTimeFormat(range.end)) {
      return false;
    }

    // Vérification que début < fin
    if (range.start >= range.end) {
      return false;
    }
  }

  return true;
};

/**
 * Vérifie si une valeur de temps est au format HH:MM valide.
 * 
 * @param time - La chaîne de temps à vérifier
 * @returns true si le format est valide, sinon false
 */
export const isValidTimeFormat = (time: string): boolean => {
  // Vérification du format HH:MM
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) {
    return false;
  }

  const [hours, minutes] = time.split(':').map(Number);

  // Vérifie que les heures sont entre 0 et 23
  if (hours < 0 || hours > 23) {
    return false;
  }

  // Vérifie que les minutes sont entre 0 et 59
  if (minutes < 0 || minutes > 59) {
    return false;
  }

  return true;
};

/**
 * Vérifie les plages horaires chevauchantes pour un jour donné.
 * 
 * @param availabilities - Les disponibilités à vérifier
 * @param day - Le jour de la semaine à vérifier
 * @returns true si des plages horaires se chevauchent, sinon false
 */
export const checkOverlappingRanges = (availabilities: Availability, day: string): boolean => {
  const ranges = availabilities?.[day] || [];

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (
        (ranges[i].start < ranges[j].end && ranges[i].end > ranges[j].start) ||
        (ranges[j].start < ranges[i].end && ranges[j].end > ranges[i].start)
      ) {
        return true; // Chevauchement trouvé
      }
    }
  }

  return false; // Aucun chevauchement
};

/**
 * Trie les plages horaires par ordre croissant.
 * 
 * @param availabilities - Les disponibilités à trier
 * @returns Les disponibilités avec les plages horaires triées
 */
export const sortTimeRanges = (availabilities: Availability): Availability => {
  const sortedAvailabilities = { ...availabilities };

  Object.keys(sortedAvailabilities).forEach(day => {
    if (sortedAvailabilities[day] && sortedAvailabilities[day].length > 1) {
      sortedAvailabilities[day] = sortedAvailabilities[day].sort((a, b) =>
        a.start.localeCompare(b.start)
      );
    }
  });

  return sortedAvailabilities;
};

/**
 * Convertit une valeur de temps au format HH:MM en minutes depuis minuit.
 * Utile pour comparer les heures entre elles.
 * 
 * @param time - L'heure au format HH:MM
 * @returns Le nombre de minutes depuis minuit
 */
export const timeToMinutes = (time: string): number => {
  if (!isValidTimeFormat(time)) return 0;

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};



/**
 * Vérifie si un créneau est déjà pris par un rendez-vous.
 * 
 * @param date - La date du créneau
 * @param startTime - L'heure de début du créneau
 * @param endTime - L'heure de fin du créneau
 * @param appointments - Les rendez-vous existants
 * @returns true si le créneau est déjà pris par un rendez-vous, sinon false
 */
export const isSlotBooked = (date: string, startTime: string, endTime: string, appointments: Appointment[]) => {
  // Convertir la date et l'heure du créneau en objets Date
  const slotStart = parse(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const slotEnd = parse(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

  // Vérifier s'il y a un chevauchement avec un rendez-vous existant
  return appointments.some(appointment => {
    // Vérifier si le rendez-vous est pour la même date
    const appointmentDate = appointment.dateTime.toDate();
    const appointmentDateStr = format(appointmentDate, 'yyyy-MM-dd');

    // Si le rendez-vous n'est pas pour la date sélectionnée, ignorer
    if (appointmentDateStr !== date) return false;

    const appointmentStart = appointmentDate;
    const appointmentEnd = addMinutes(appointmentDate, appointment.duration);

    // Vérifier si le créneau chevauche le rendez-vous
    return (
      // Chevauchement quelconque entre le créneau et le rendez-vous
      isWithinInterval(slotStart, { start: appointmentStart, end: appointmentEnd }) ||
      isWithinInterval(slotEnd, { start: appointmentStart, end: appointmentEnd }) ||
      isWithinInterval(appointmentStart, { start: slotStart, end: slotEnd }) ||
      isWithinInterval(appointmentEnd, { start: slotStart, end: slotEnd })
    );
  });
};

/**
 * Génère les créneaux disponibles pour une date donnée.
 * 
 * @param dayAvailability - Les disponibilités pour un jour donné
 * @param selectedDate - La date sélectionnée
 * @param appointments - Les rendez-vous existants
 * @returns Les créneaux disponibles
 */
export const generateTimeSlots = (dayAvailability: TimeRange[], selectedDate: string, appointments: Appointment[]) => {
  // Création d'un tableau pour stocker les créneaux disponibles
  const slots: { start: string, end: string, isAvailable: boolean, duration: number }[] = [];

  // Vérification si la date sélectionnée est aujourd'hui
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  // Parcours des plages horaires de disponibilité
  dayAvailability.forEach(range => {
    const startTime = parse(range.start, 'HH:mm', new Date());
    const endTime = parse(range.end, 'HH:mm', new Date());

    // Créneaux de 30 minutes (durée sélectionnée)
    const slotDuration30 = 30;
    let currentSlotStart = startTime;

    // Parcours des créneaux de 30 minutes
    while (addMinutes(currentSlotStart, slotDuration30) <= endTime) {
      const slotEnd = addMinutes(currentSlotStart, slotDuration30);
      const formattedStart = format(currentSlotStart, 'HH:mm');
      const formattedEnd = format(slotEnd, 'HH:mm');

      // Filtrer les slots passés si c'est aujourd'hui (pour ne pas afficher les créneaux passés)
      if (isToday) {
        const slotDateTime = parse(`${selectedDate} ${formattedStart}`, 'yyyy-MM-dd HH:mm', new Date());
        if (slotDateTime < now) {
          currentSlotStart = slotEnd;
          continue;
        }
      }

      // Vérification si le créneau n'est pas déjà réservé
      const isSlotAvailable = !isSlotBooked(selectedDate, formattedStart, formattedEnd, appointments);
      slots.push({
        start: formattedStart,
        end: formattedEnd,
        isAvailable: isSlotAvailable,
        duration: slotDuration30
      });
      // Avancer de 30 minutes
      currentSlotStart = slotEnd;
    }

    // Créneaux de 1h (60 minutes)
    const slotDuration60 = 60;
    currentSlotStart = startTime;
    while (addMinutes(currentSlotStart, slotDuration60) <= endTime) {
      const slotEnd = addMinutes(currentSlotStart, slotDuration60);
      const formattedStart = format(currentSlotStart, 'HH:mm');
      const formattedEnd = format(slotEnd, 'HH:mm');

      // Filtrer les slots passés si c'est aujourd'hui (pour ne pas afficher les créneaux passés)
      if (isToday) {
        const slotDateTime = parse(`${selectedDate} ${formattedStart}`, 'yyyy-MM-dd HH:mm', new Date());
        if (slotDateTime < now) {
          currentSlotStart = addMinutes(currentSlotStart, slotDuration30); // avancer de 30 minutes
          continue;
        }
      }

      // Pour un créneau de 1h, il faut vérifier que les deux créneaux de 30 minutes sont disponibles
      const slot1Start = formattedStart;
      const slot1End = format(addMinutes(currentSlotStart, 30), 'HH:mm');
      const slot2Start = slot1End;
      const slot2End = formattedEnd;
      // Vérification si le créneau n'est pas déjà réservé
      const isSlot1Available = !isSlotBooked(selectedDate, slot1Start, slot1End, appointments);
      const isSlot2Available = !isSlotBooked(selectedDate, slot2Start, slot2End, appointments);
      // Vérification si les deux créneaux sont disponibles
      const isSlotAvailable = isSlot1Available && isSlot2Available;
      slots.push({
        start: formattedStart,
        end: formattedEnd,
        isAvailable: isSlotAvailable,
        duration: slotDuration60
      });
      currentSlotStart = addMinutes(currentSlotStart, slotDuration30); // Avancer de 30 minutes
    }
  });

  // Trier les créneaux par heure de début et durée (pour afficher les créneaux les plus proches en premier)
  return slots.sort((a, b) => {
    const startComparison = a.start.localeCompare(b.start);
    if (startComparison !== 0) return startComparison;
    return a.duration - b.duration;
  });
};
