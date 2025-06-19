// Fonction pour convertir l'heure de Paris en UTC
export function parisToUTC(timeSlot: string, date: string) {
    const dateOnly = date.split('T')[0]; // "2025-06-25"
    const dateParis = new Date(`${dateOnly}T${timeSlot}:00+02:00`); // UTC+2
    const utcDate = new Date(dateParis.toISOString());

    console.log('→ utcDate', utcDate.toISOString());
    return utcDate;

}