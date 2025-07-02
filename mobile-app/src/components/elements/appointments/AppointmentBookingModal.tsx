// Importation des bibliothèques nécessaires
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
import { checkSlotAvailability, getProfessionalAppointmentsByDate } from '../../../services/appointmentService';
import { blockingStatuses } from '../../../utils/appointmentUtils';
// Récupère la hauteur de l'écran
const { height } = Dimensions.get('window');

// Déclaration des types des props attendues par le composant
interface AppointmentBookingModalProps {
    visible: boolean; // Affichage du modal
    onClose: () => void; // Fonction de fermeture
    professionalIdInfo: UserLocal; // Infos du professionnel
    initialShowCalendar?: boolean; // Afficher d'abord le calendrier
    initialDate?: string; // Date initialement sélectionnée
}

/**
 * Composant principal pour la réservation d'un rendez-vous
 *Il affiche les jours de disponilité d'un pro et les créneaux disponibles pour une date donnée
 * les créneaux sont filtrés (Pas de créneaux déjà réservés ou en cours de réservation ou en cours de paiement ou passés)
 * @param {Object} props - Props du composant
 * @param {boolean} props.visible - Indique si le modal est visible
 * @param {Function} props.onClose - Fonction appelée lors de la fermeture du modal
 * @param {UserLocal} props.professionalIdInfo - Informations du professionnel
 * @param {boolean} props.initialShowCalendar - Indique si le calendrier doit être affiché en premier
 * @param {string} props.initialDate - Date initialement sélectionnée
 * @returns {JSX.Element} - Le composant AppointmentBookingModal
 */
const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
    visible,
    onClose,
    professionalIdInfo,
    initialShowCalendar = true,
    initialDate = '',
}) => {
    // États pour la gestion des sélections et de l'affichage
    const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30); // Durée sélectionnée (30 ou 60 minutes)
    const [selectedDate, setSelectedDate] = useState<string>(initialDate); // Date choisie
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(''); // Créneau choisi
    const [showCalendar, setShowCalendar] = useState<boolean>(initialShowCalendar); // Affichage du calendrier
    const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string, end: string, isAvailable: boolean, duration: number }[]>([]); // Créneaux disponibles
    const [loadingSlots, setLoadingSlots] = useState(false); // Chargement des créneaux

    // Récupération des disponibilités depuis Redux (format : {Mercredi: {start: string, end: string}})
    const { otherProAvailability } = useSelector((state: RootState) => state.availability);

    // Récupération des disponibilités du particulier connecté
    const { user } = useSelector((state: RootState) => state.auth);

    // Animation pour la montée/descente du modal
    const modalY = useRef(new Animated.Value(height)).current;
    const modalHeight = height * 0.9;

    // Gestion du glisser-pour-fermer (pan responder)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    modalY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    closeModal();
                } else {
                    Animated.spring(modalY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Ouvre le modal avec animation
    const openModal = () => {
        Animated.spring(modalY, {
            toValue: 0,
            tension: 50,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    // Ferme le modal avec animation
    const closeModal = () => {
        Animated.timing(modalY, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    // Gère l'ouverture du modal selon les props
    useEffect(() => {
        if (visible) {
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

    // Gère la sélection d'un créneau horaire
    const handleTimeSlotSelect = (timeSlot: string) => {
        setSelectedTimeSlot(timeSlot);
    };

    // Vérifie si le bouton "Confirmer" doit être activé
    const isConfirmButtonEnabled = selectedDate && selectedTimeSlot;

    // Lorsque l'utilisateur confirme un créneau
    const handleConfirm = async () => {
        // Si le bouton "Confirmer" est activé
        if (isConfirmButtonEnabled) {
            // Vérifie si le créneau est toujours disponible (en temps réel) ( pour deux vérifications)
            const isStillAvailable = await checkSlotAvailability(
                professionalIdInfo.id,
                new Date(selectedDate),
                selectedTimeSlot
            );
            if (!isStillAvailable) {
                alert('Ce créneau vient d\'être réservé. Merci de choisir un autre créneau.');
                return;
            }

            // Création de l'objet rendez-vous
            const appointment: Appointment = {
                proId: professionalIdInfo.id,
                clientId: user?.id,
                dateTime: { toDate: () => new Date(selectedDate) },
                timeSlot: selectedTimeSlot,
                duration: selectedDuration,
                status: AppointmentStatus.PENDING,
            };

            // Navigation vers la page de paiement
            navigate('Payment', { appointment, proInfo: professionalIdInfo });
            closeModal();
        }
    };

    // Retourner à l'écran de sélection de date
    const handleBackToCalendar = () => {
        setShowCalendar(true);
        setSelectedTimeSlot('');
    };

    // Chargement des créneaux disponibles à chaque changement de date/durée
    useEffect(() => {
        const fetchAndSetSlots = async () => {
            // Si la date est sélectionnée et que les disponibilités du pro sont disponibles
            if (selectedDate && otherProAvailability) {
                setLoadingSlots(true);
                const date = new Date(selectedDate); // format : 2025-07-01
                const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi ...
                const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                const dayName = dayNames[dayOfWeek]; // format : Mercredi

                // Récupère les disponibilités pour ce jour
                const dayAvailability = otherProAvailability[dayName] || otherProAvailability[dayOfWeek.toString()] || [];

                // Filtrer les rendez-vous à statut bloquant sur cette date, 
                // Récupère les rendez-vous existants du pro pour la date sélectionnée
                let proAppointments: Appointment[] = [];
                try {
                    proAppointments = await getProfessionalAppointmentsByDate(professionalIdInfo.id, selectedDate,
                        blockingStatuses
                    );
                } catch (e) {
                    console.error('Erreur lors de la récupération des rendez-vous pro par date:', e);
                }

                // Génère tous les créneaux possibles pour la date sélectionnée
                const allSlots = generateTimeSlots(dayAvailability, selectedDate, proAppointments);
                // Filtre les créneaux pour ne garder que ceux de la durée sélectionnée
                const filteredSlots = allSlots.filter(slot => slot.duration === selectedDuration);
                // On affiche les créneaux disponibles
                setAvailableTimeSlots(filteredSlots);
                setLoadingSlots(false);
            }
        };
        fetchAndSetSlots();
    }, [selectedDate, selectedDuration, otherProAvailability]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            setAvailableTimeSlots([]);
            setSelectedTimeSlot('');
        };
    }, []);

    // Affichage debug (à supprimer en prod)

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
                    {/* Barre de fermeture draggable */}
                    <View style={styles.header} {...panResponder.panHandlers}>
                        <View style={styles.handleBar} />
                    </View>

                    <SafeAreaView style={styles.modalContent}>
                        {/* En-tête de sélection de durée */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.title}>Durée du créneau</Text>
                        </View>

                        {/* Boutons de sélection de durée */}
                        <View style={styles.durationSelector}>
                            <View style={styles.durationButtons}>
                                {/* Bouton 30 min */}
                                <TouchableOpacity
                                    style={[
                                        styles.durationButton,
                                        selectedDuration === 30 && styles.durationButtonActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDuration(30);
                                        // Réinitialise le créneau si on change de durée après avoir quitté le calendrier
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

                                {/* Bouton 60 min */}
                                <TouchableOpacity
                                    style={[
                                        styles.durationButton,
                                        selectedDuration === 60 && styles.durationButtonActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedDuration(60);
                                        setSelectedTimeSlot(''); // Réinitialiser le créneau sélectionné
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

                        {/* Zone principale : soit calendrier, soit créneaux horaires */}
                        <View style={styles.mainContent}>
                            {showCalendar ? (
                                // Affichage du calendrier pour sélectionner une date
                                <View style={styles.calendarContainer}>
                                    <Text style={styles.sectionTitle}>Sélectionnez une date</Text>
                                    <AvailabilityCalendar
                                        professionalId={professionalIdInfo.id}
                                        defaultDate={selectedDate}
                                        onDateSelect={(date: string) => {
                                            setSelectedDate(date);
                                            setShowCalendar(false); // Une fois la date choisie, on passe aux créneaux
                                        }}
                                    />
                                </View>
                            ) : (
                                // Affichage des créneaux disponibles pour la date sélectionnée
                                <View style={styles.timeSlotsContainer}>
                                    <View style={styles.timeSlotsHeader}>
                                        {/* Bouton retour au calendrier */}
                                        <TouchableOpacity
                                            style={styles.backButton}
                                            onPress={handleBackToCalendar}
                                        >
                                            <Icon name="arrow-back" size={20} color="#f95200" />
                                            <Text style={styles.backButtonText}>Calendrier</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Affichage de la date sélectionnée */}
                                    <Text style={styles.dateText}>
                                        {formatDateForDisplay(selectedDate)}
                                    </Text>

                                    <Text style={styles.sectionTitle}>Créneaux disponibles</Text>

                                    {/* Affichage conditionnel des créneaux */}
                                    {loadingSlots ? (
                                        // En cours de chargement
                                        <View className='flex flex-1 justify-center items-center'>
                                            <Text>Chargement des créneaux...</Text>
                                        </View>
                                    ) : availableTimeSlots.length > 0 ? (
                                        // Créneaux disponibles
                                        <ScrollView style={styles.timeSlotsScroll}>
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
                                    ) : (
                                        // Aucun créneau disponible
                                        <View className='flex flex-1 justify-center items-center'>
                                            <Text className='text-orange-500'>Aucun créneau disponible pour cette date</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Pied du modal : récapitulatif et bouton de confirmation */}
                        <View style={styles.footer} className='flex-row justify-between p-5 py-4 '>
                            {/* Résumé durée + prix */}
                            <View>
                                {selectedDate ? (
                                    <View>
                                        <Text className="text-muted font-bold text-xl ">
                                            {selectedDuration}€
                                        </Text>
                                        <Text>
                                            {selectedDuration === 30 ? '30 minutes' : '60 minutes'}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Bouton de confirmation */}
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
