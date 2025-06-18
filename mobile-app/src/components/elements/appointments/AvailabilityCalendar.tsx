import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { format, addMonths } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailabilityRequest } from '../../../store/availability/reducer';
import { RootState } from '../../../store/store';
import Icon from 'react-native-vector-icons/Ionicons';
import LogoSpinner from '../../common/LogoSpinner';


// Configuration de la locale française pour le calendrier
LocaleConfig.locales['fr'] = {
    monthNames: [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ],
    monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
    today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';




interface AvailabilityCalendarProps {
    professionalId: string;
    onDateSelect?: (date: string) => void; // Callback quand une date est sélectionnée
    defaultDate?: string;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
    professionalId,
    onDateSelect,
    defaultDate
}) => {
    const dispatch = useDispatch();

    // State local
    // Initialise `selectedDate` avec la valeur passée ou le jour actuel
    const [selectedDate, setSelectedDate] = useState<string>(defaultDate ?? format(new Date(), 'yyyy-MM-dd'));
    const [markedDates, setMarkedDates] = useState<{ [key: string]: { marked: boolean, dotColor: string } }>({});
    const [currentMonthView, setCurrentMonthView] = useState<string>(format(new Date(), 'yyyy-MM')); // Nouveau state pour suivre le mois affiché
    const { otherProAvailability, isLoading, error } = useSelector((state: RootState) => state.availability);


    // Au chargement, récupérer les disponibilités du professionnel
    useEffect(() => {
        dispatch(fetchAvailabilityRequest({ userId: professionalId, type: 'other' }));
    }, [dispatch]);

    // Mettre à jour les jours marqués lorsque les disponibilités changent ou lorsque le mois affiché change
    useEffect(() => {
        if (otherProAvailability) {
            // Générer les dates marquées pour plusieurs mois (mois actuel + 6 mois)
            updateMarkedDates();
        }
    }, [otherProAvailability, currentMonthView]);



    // Fonction pour mettre à jour les dates marquées
    const updateMarkedDates = () => {
        if (!otherProAvailability) return;

        const marked: { [key: string]: { marked: boolean, dotColor: string } } = {};
        const today = new Date();

        // Générer des dates pour les 6 prochains mois
        for (let i = 0; i < 6; i++) {
            const targetMonth = addMonths(new Date(currentMonthView + '-01'), i);

            // Pour chaque jour de la semaine avec des disponibilités
            Object.keys(otherProAvailability).forEach(day => {
                if (otherProAvailability[day]?.length > 0) {
                    // Convertir le jour (nom ou numéro) en dates réelles pour le mois cible
                    const datesInTargetMonth = createDatesForMonth(day, targetMonth);

                    // Marquer chaque date correspondante
                    datesInTargetMonth.forEach(date => {
                        // Ne pas marquer les jours dans le passé
                        if (date >= today) {
                            marked[format(date, 'yyyy-MM-dd')] = {
                                marked: true,
                                dotColor: '#FF9500' // Orange
                            };
                        }
                    });
                }
            });
        }

        setMarkedDates(marked);
    };


    // Fonction pour créer des dates pour un mois spécifique
    const createDatesForMonth = (day: number | string, targetDate: Date) => {
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const dates = [];

        // Convertir le nom du jour en numéro si nécessaire
        let dayNumber: number;
        if (typeof day === 'string') {
            const dayMap: { [key: string]: number } = {
                'Dimanche': 0, 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3,
                'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6
            };
            dayNumber = dayMap[day] !== undefined ? dayMap[day] : parseInt(day);
        } else {
            dayNumber = day;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(targetYear, targetMonth, i);
            if (date.getDay() === dayNumber) {
                dates.push(date);
            }
        }

        return dates;
    };

    // Gestion de la sélection d'une date sur le calendrier
    const handleDateSelect = (day: { dateString: string }) => {
        setSelectedDate(day.dateString);
        // Appeler le callback si fourni
        if (onDateSelect) {
            onDateSelect(day.dateString);
        }
    };

    // Gestion du changement de mois dans le calendrier
    const handleMonthChange = (month: { month: number, year: number }) => {
        // Format le mois affiché au format YYYY-MM
        const newMonthView = `${month.year}-${String(month.month).padStart(2, '0')}`;
        setCurrentMonthView(newMonthView);
    };


    if (error) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>Erreur: {error}</Text>
            </View>
        );
    }

    return (
        <View className=''>
            <Calendar
                current={selectedDate}
                onDayPress={handleDateSelect}
                onMonthChange={handleMonthChange}
                markedDates={{
                    ...markedDates,
                    [selectedDate]: {
                        ...markedDates[selectedDate],
                        selected: true,
                        selectedColor: '#f95200',
                    }
                }}
                firstDay={1} // Commencer par lundi
                minDate={format(new Date(), 'yyyy-MM-dd')} // Désactiver les dates passées
                theme={{
                    todayTextColor: '#f95200',

                }}
                renderArrow={(direction: any) => (
                    <View className="border border-muted/10 rounded-full p-2">
                        <Icon
                            name={`chevron-${direction === 'left' ? 'back' : 'forward'}`}
                            color="rgba(0,0,0,0.6)"
                            size={15}
                        />
                    </View>
                )}
                className="bg-white rounded-md "
            />
            <LogoSpinner
                visible={isLoading}
                message="Disponibilitées en cours..."
                rotationDuration={1500}

            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    }
});

export default AvailabilityCalendar;