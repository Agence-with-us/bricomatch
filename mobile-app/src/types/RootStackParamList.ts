import { Appointment, AppointmentWithOtherUserInfo } from "../store/appointments/types";
import { UserLocal } from "../store/users/types";

export type RootStackParamList = {

    HomeSearch: { serviceId: string };

    FicheProfessionnel: { professionnel: UserLocal };
    ConnectedUserAvailability: undefined;

    Payment: { appointment: Appointment, proInfo: UserLocal }
    ValidationScreen: { info: { title: string; subtitle: string; actionText: string; to: string } };
    VideoCall: { appointmentEtUser: AppointmentWithOtherUserInfo; needToStartCall: boolean }

    ProfileScreen: undefined;
    ProfileInfoScreen: undefined;

    AppLandingScreen: undefined;
    CompleteProfile: undefined;
    Register: { role: string };

    FacturesScreen: undefined;
    FactureDetailsScreen: { facture: any }

    ChatList: undefined;
    ChatScreen: { chat: { chatId: string; otherUserInfo: UserLocal } }

    Login: undefined;
    Home: undefined; // Pas de paramètres pour l'écran Home
    Profile: { userId: string }; // Nécessite un userId pour accéder au profil
    Services: undefined; // Pas de paramètres pour les paramètres
    Appointments: undefined;
    CreateAppointment: undefined;
};