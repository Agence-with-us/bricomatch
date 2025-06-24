import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, Animated, PanResponder,
    Dimensions, ScrollView, SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { formatDateForDisplay, generateTimeSlots } from '../../../utils/availabilityUtils';
import { Appointment, AppointmentStatus } from '../../../store/appointments/types';
import { navigate } from '../../../services/navigationService';
import { UserLocal } from '../../../store/users/types';

const { height } = Dimensions.get('window');

interface AppointmentBookingModalProps {
    visible: boolean;
    onClose: () => void;
    professionalIdInfo: UserLocal;
    appointments?: any[];
    initialShowCalendar?: boolean;
    initialDate?: string;
}

const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
    visible,
    onClose,
    professionalIdInfo,
    appointments = [],
    initialShowCalendar = true,
    initialDate = '',
}) => {
    // États pour gérer les sélections
    const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30);
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [showCalendar, setShowCalendar] = useState<boolean>(initialShowCalendar);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string, end: string, isAvailable: boolean, duration: number }[]>([]);

    const { otherProAvailability} = useSelector((state: RootState) => state.availability);
    const { user } = useSelector((state: RootState) => state.auth);
    console.log("otherProAvailability", otherProAvailability)

 
    // Animation du modal
    const modalY = useRef(new Animated.Value(height)).current;
    const modalHeight = height * 0.9; // 90% de la hauteur de l'écran



    // Gestionnaire de défilement pour fermer le modal
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) { // Seulement si on glisse vers le bas
                    modalY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) { // Seuil de fermeture
                    closeModal();
                } else {
                    // Revenir à la position initiale
                    Animated.spring(modalY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Fonction pour ouvrir le modal
    const openModal = () => {
        Animated.spring(modalY, {
            toValue: 0,
            tension: 50,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    // Fonction pour fermer le modal
    const closeModal = () => {
        Animated.timing(modalY, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    // Gérer l'ouverture du modal quand il devient visible
    useEffect(() => {
        if (visible) {
            // Si on veut ouvrir directement sur les créneaux d'une date
            if (!initialShowCalendar && initialDate) {
                setSelectedDate(initialDate);
                setShowCalendar(false);
            } else {
                setShowCalendar(true);
                setSelectedDate(initialDate || '');
            }
            openModal();
        }
    }, [visible]);


    // Gérer la sélection d'un créneau horaire
    const handleTimeSlotSelect = (timeSlot: string) => {
        setSelectedTimeSlot(timeSlot);
    };



    // Vérifier si le bouton de confirmation doit être activé
    const isConfirmButtonEnabled = selectedDate && selectedTimeSlot;

    // Gestion de la confirmation
    const handleConfirm = () => {
        if (isConfirmButtonEnabled) {
            const appointment: Appointment = {
                proId: professionalIdInfo.id,
                clientId: user?.id,
                dateTime: { toDate: () => new Date(selectedDate) }, // Conversion vers `Date`
                timeSlot: selectedTimeSlot,
                duration: selectedDuration, // Durée en minutes
                status: AppointmentStatus.PENDING,
            };
            navigate('Payment', { appointment, proInfo: professionalIdInfo })
            closeModal();
        }
    };

    // Retour au calendrier
    const handleBackToCalendar = () => {
        setShowCalendar(true);
        setSelectedTimeSlot('');
    };


    // Mettre à jour les créneaux disponibles lorsqu'une date est sélectionnée
    useEffect(() => {

        if (selectedDate && otherProAvailability) {
            const date = new Date(selectedDate);
            // Convertir en jour de la semaine français (0 à 6 avec 0 = dimanche)
            const dayOfWeek = date.getDay();

            // Convertir le jour numérique en nom de jour en français
            const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            const dayName = dayNames[dayOfWeek];

            // Vérifier si nous avons des disponibilités pour ce jour
            const dayAvailability = otherProAvailability[dayName] || otherProAvailability[dayOfWeek.toString()] || [];

            const allSlots = generateTimeSlots(dayAvailability, selectedDate, appointments);

            // Filtrer les créneaux en fonction de la durée sélectionnée
            const filteredSlots = allSlots.filter(slot => slot.duration === selectedDuration);

            setAvailableTimeSlots(filteredSlots);
        }
    }, [selectedDate, selectedDuration, otherProAvailability]);


    useEffect(() => {
        return () => {
            // selectedDate()
            setAvailableTimeSlots([])
            setSelectedTimeSlot('')
        };
    }, []);



    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: modalY }],
                            height: modalHeight,
                        },
                    ]}
                >
                    {/* Barre de défilement */}
                    <View style={styles.header} {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>

                    {/* Contenu du modal */}
                    <SafeAreaView style={styles.modalContent}>
                        {/* En-tête du modal */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.title}>Durée du créneau</Text>
                        </View>

                        {/* Sélection de la durée */}
                        <View style={styles.durationSelector}>
                            <View style={styles.durationButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.durationButton,
                                        selectedDuration === 30 && styles.durationButtonActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDuration(30);
                                        // Réinitialiser le créneau sélectionné car la durée a changé
                                        if (selectedDate && !showCalendar) {
                                            setSelectedTimeSlot('');
                                        }
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.durationButtonText,
                                            selectedDuration === 30 && styles.durationButtonTextActive,
                                        ]}
                                    >
                                        30 min
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.durationButton,
                                        selectedDuration === 60 && styles.durationButtonActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDuration(60);
                                        setSelectedTimeSlot('');


                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.durationButtonText,
                                            selectedDuration === 60 && styles.durationButtonTextActive,
                                        ]}
                                    >
                                        1 heure
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Partie principale - Calendrier ou Créneaux */}
                        <View style={styles.mainContent}>
                            {showCalendar ? (
                                // Calendrier
                                <View style={styles.calendarContainer}>
                                    <Text style={styles.sectionTitle}>Sélectionnez une date</Text>
                                    <AvailabilityCalendar
                                        professionalId={professionalIdInfo.id}
                                        defaultDate={selectedDate}
                                        onDateSelect={(date: string) => {
                                            setSelectedDate(date);
                                            setShowCalendar(false)
                                        }}
                                    />
                                </View>
                            ) : (
                                // Créneaux horaires
                                <View style={styles.timeSlotsContainer}>
                                    <View style={styles.timeSlotsHeader}>
                                        <TouchableOpacity
                                            style={styles.backButton}
                                            onPress={handleBackToCalendar}
                                        >
                                            <Icon name="arrow-back" size={20} color="#f95200" />
                                            <Text style={styles.backButtonText}>Calendrier</Text>
                                        </TouchableOpacity>


                                    </View>
                                    <Text style={styles.dateText}>
                                        {formatDateForDisplay(selectedDate)}
                                    </Text>

                                    <Text style={styles.sectionTitle}>Créneaux disponibles</Text>

                                    {
                                        availableTimeSlots.length > 0 ? <ScrollView style={styles.timeSlotsScroll}>
                                            <View style={styles.timeSlotGrid}>
                                                {availableTimeSlots.map((slot, index) => (
                                                    slot.isAvailable && (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={[
                                                                styles.timeSlot,
                                                                selectedTimeSlot === slot.start && styles.timeSlotSelected,
                                                            ]}
                                                            onPress={() => handleTimeSlotSelect(slot.start)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.timeSlotText,
                                                                    selectedTimeSlot === slot.start && styles.timeSlotTextSelected,
                                                                ]}
                                                            >
                                                                {slot.start}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )
                                                ))}
                                            </View>
                                        </ScrollView>
                                            :
                                            <View className='flex flex-1 justify-center items-center'>
                                                <Text className='text-orange-500'>Aucun créneau disponible pour cette date</Text>
                                            </View>
                                    }

                                </View>
                            )}
                        </View>

                        {/* Pied de page - Résumé et bouton de confirmation */}
                        <View style={styles.footer} className='flex-row justify-between p-5 py-4 '>
                            <View >
                                {selectedDate ? (
                                    <View>
                                        <Text className="text-muted font-bold text-xl ">
                                            {selectedDuration}€
                                        </Text>
                                        <Text >
                                            {selectedDuration === 30 ? '30 minutes' : '60 minutes'}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            <TouchableOpacity
                                className='flex justify-center p-5 rounded-full'
                                style={[

                                    isConfirmButtonEnabled
                                        ? styles.confirmButtonEnabled
                                        : styles.confirmButtonDisabled,
                                ]}
                                onPress={handleConfirm}
                                disabled={!isConfirmButtonEnabled}
                            >
                                <Text
                                    style={[
                                        styles.confirmButtonText,
                                        isConfirmButtonEnabled
                                            ? styles.confirmButtonTextEnabled
                                            : styles.confirmButtonTextDisabled,
                                    ]}
                                >
                                    Confirmer ma demande
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#DDD',
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    durationSelector: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 12,
    },
    durationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    durationButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#ffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
        borderColor: '#f95200',
        borderWidth: 1
    },
    durationButtonActive: {
        backgroundColor: '#f95200',
    },
    durationButtonText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    durationButtonTextActive: {
        color: '#FFFFFF',
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    calendarContainer: {
        flex: 1,
    },
    timeSlotsContainer: {
        flex: 1,
    },
    timeSlotsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    backButtonText: {
        marginLeft: 4,
        color: '#f95200',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        textTransform: 'capitalize',
        marginBottom: 15
    },
    timeSlotsScroll: {
        flex: 1,
    },
    timeSlotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    timeSlot: {
        width: '30%',
        padding: 12,
        margin: '1.5%',
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeSlotSelected: {
        backgroundColor: '#f95200',
    },
    timeSlotText: {
        fontSize: 14,
        color: '#333',
    },
    timeSlotTextSelected: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    noSlotsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noSlotsText: {
        color: '#666',
        fontSize: 15,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    confirmButtonEnabled: {
        backgroundColor: '#f95200',
    },
    confirmButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonTextEnabled: {
        color: '#FFFFFF',
    },
    confirmButtonTextDisabled: {
        color: '#999',
    },
});

export default AppointmentBookingModal;