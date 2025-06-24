export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  photoUrl?: string;
  serviceTypeId?: string;
  description?: string;
}
