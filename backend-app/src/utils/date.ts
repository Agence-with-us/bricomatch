// Fonction pour convertir l'heure de Paris en UTC
export function parisToUTC(timeSlot: string, date: string) {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    console.log("hours", hours);
    console.log("minutes", minutes);
    
    // Créer une date avec l'heure de Paris
    const parisDate = new Date(`${date.split('T')[0]}T${timeSlot}:00`);
    console.log("parisDate", parisDate);
    // La date créée est en heure locale (Paris), on la convertit en UTC
    const utcDate = new Date(parisDate.getTime() - (parisDate.getTimezoneOffset() * 60000));
    console.log("utcDate", utcDate);
    return utcDate;
}