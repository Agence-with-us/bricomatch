import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/RootStackParamList';
import GoBack from '../../components/common/GoBack';
import { UserLocal } from '../../store/users/types';
import { ProfileStatusAvatar } from '../../components/elements/fiche-professionnel/ProfileStatusAvatar';
import AvailabilityCalendar from '../../components/elements/appointments/AvailabilityCalendar';
import AppointmentBookingModal from '../../components/elements/appointments/AppointmentBookingModal';
import { navigate } from '../../services/navigationService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { fetchAvailabilityRequest } from '../../store/availability/reducer';


export const FicheProfessionnelScreen: React.FC = () => {

    const route = useRoute<RouteProp<RootStackParamList, 'FicheProfessionnel'>>();

    if (!route?.params?.professionnel) return null;
    const [selectedProffesionnel, setSelectedProfessionnel] = useState<UserLocal>(route.params.professionnel)
    const [openBookModalAppointment, setOpenBookModalAppointment] = useState<boolean>(false)
    const [openDirectToSlots, setOpenDirectToSlots] = useState<boolean>(false);
    const [defaultDate, setDefaultDate] = useState<string>('');
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();

     // Au chargement, récupérer les disponibilités du professionnel
     useEffect(() => {
            dispatch(fetchAvailabilityRequest({ userId: selectedProffesionnel.id, type: 'other' }));
        
    }, [ selectedProffesionnel.id]);
    
    const handleBookModalAppointment = () => {
        if (!user) {
            navigate('Login');
        } else {
            // Date du jour au format yyyy-mm-dd
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            setDefaultDate(todayStr);
            setOpenDirectToSlots(true);
            setOpenBookModalAppointment(true);
        }
    }

    // Handler pour la sélection de date dans le calendrier principal
    const handleDateSelect = (date: string) => {
        if (!user) {
            navigate('Login');
        } else {
            setDefaultDate(date);
            setOpenDirectToSlots(true);
            setOpenBookModalAppointment(true);
        }
    }

    return (
        <View className="flex-1 pt-9 bg-background" key={`${selectedProffesionnel.id}`}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} className="flex-1 bg-background px-2.5 pt-3">
                <View className="w-full flex-row justify-between items-center">
                    {!openBookModalAppointment && (<GoBack />)}
                </View>
                <View className="mt-20 bg-accent rounded-[20px] pb-6">
                    <View className="w-[126] h-[126] items-center justify-center rounded-full mx-auto -mt-[60px] bg-accent">
                        <ProfileStatusAvatar user={selectedProffesionnel} />
                    </View>
                    <Text className="mx-auto text-muted text-[25px] font-bold mt-2.5">{selectedProffesionnel.nom}</Text>
                    <Text className="mx-auto text-muted/50 text-base font-normal">{selectedProffesionnel.serviceInfo?.name}</Text>
                    <View className="flex-row items-center justify-center gap-x-1 mt-2">
                        <Text className="text-xl text-muted font-bold mr-1">{selectedProffesionnel.averageRating?.toFixed(1) || 0}</Text>
                        {Array.from({ length: 5 }).map((_, index) => {
                            const isFullStar = index < Math.floor(selectedProffesionnel.averageRating || 0);
                            const isHalfStar = !isFullStar && index < (selectedProffesionnel.averageRating || 0);

                            return (
                                <Icon
                                    name={isFullStar ? "star" : isHalfStar ? "star-half" : "star"}
                                    size={14}
                                    color={isFullStar || isHalfStar ? "#FFC107" : "#D9E1E894"}
                                    key={index}
                                />
                            );
                        })}
                    </View>

                    <View className="flex-row justify-center mt-3">
                        <TouchableOpacity
                            className="border border-secondary px-5 py-1.5 items-center rounded-[30px]"
                            onPress={handleBookModalAppointment}
                        >
                            <Text className="text-secondary text-base">Contacter {selectedProffesionnel.nom?.split(" ")?.[0]}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="mt-7 flex-1">
                    <Text className="text-muted-disabled text-[15px] font-bold mb-2">À PROPOS</Text>
                    <View className="p-4 bg-accent rounded-[20px]">
                        <Text className="text-muted text-base font-normal">
                            {selectedProffesionnel.description
                                ? selectedProffesionnel.description
                                : "Aucune description disponible pour le moment. N'hésitez pas à le contacter pour en savoir plus sur ses services !"}
                        </Text>
                    </View>
                </View>
                <View className="mt-10 flex-1">
                    <Text className="text-muted-disabled text-[15px] font-bold mb-2">DISPONIBILITÉS</Text>
                </View>
                <AvailabilityCalendar professionalId={selectedProffesionnel.id} onDateSelect={handleDateSelect} />
            </ScrollView>
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center p-4 py-5 bg-accent  border-t border-t-gray-300">
                <Text className="text-muted font-semibold text-base flex-1">À partir de {30} €/ht</Text>
                <TouchableOpacity className="rounded-[30px] bg-secondary h-[60px] items-center justify-center flex-1 px-10" onPress={handleBookModalAppointment}>
                    <Text className="text-accent">PRENDRE RDV</Text>
                </TouchableOpacity>
            </View>
            <AppointmentBookingModal
                visible={openBookModalAppointment}
                onClose={() => {
                  setOpenBookModalAppointment(false);
                  setOpenDirectToSlots(false);
                }}
                professionalIdInfo={selectedProffesionnel}
                initialShowCalendar={!openDirectToSlots ? true : false}
                initialDate={defaultDate}
            />
        </View>
    );
};

export default FicheProfessionnelScreen;
