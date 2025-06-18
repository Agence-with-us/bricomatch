// Interface représentant une plage horaire avec une heure de début et de fin
export interface TimeRange {
    start: string;
    end: string;
  }
  
  // Interface représentant les disponibilités avec un jour comme clé et une liste de plages horaires
  export interface Availability {
    [key: string]: TimeRange[];
  }