import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Availability } from '../../store/availability/types';
import { 
  fetchAvailabilityRequest, 
  updateConnectedProAvailabilityRequest 
} from '../../store/availability/reducer';
import { showToast } from '../../utils/toastNotification';
import GoBack from '../../components/common/GoBack';
import { UserRole } from '../../store/users/types';
import { checkOverlappingRanges, daysOfWeek, validateTimeRanges } from '../../utils/availabilityUtils';
import PageHeader from '../../components/elements/availabilities/PageHeader';
import DaySelector from '../../components/elements/availabilities/DaySelector';
import TimeRangeEditor from '../../components/elements/availabilities/TimeRangeEditor';


const ConnectedUserAvailabilityScreen: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { connectedProAvailability } = useSelector((state: RootState) => state.availability);

  // État local pour stocker les disponibilités des professionnels connectés
  const [availabilities, setAvailabilities] = useState<Availability>(
    connectedProAvailability as Availability
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (!user) return null;

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAvailabilityRequest({ userId: user.id, type: 'connected' }));
  }, [dispatch, user]);

  useEffect(() => {
    if (connectedProAvailability) {
      setAvailabilities(connectedProAvailability);
    }
  }, [connectedProAvailability]);

  /**
   * Fonction pour activer un jour et afficher son éditeur de disponibilité
   */
  const toggleDayAvailability = (day: string) => {
    setSelectedDay(day);
    if (!availabilities || !availabilities[day]) {
      setAvailabilities((prev) => ({
        ...prev,
        [day]: [{ start: '09:00', end: '17:00' }],
      }));
    }
  };

  /**
   * Fonction pour ajouter une nouvelle plage horaire au jour sélectionné
   */
  const addTimeRange = (day: string) => {
    setAvailabilities((prev) => {
      return {
        ...prev,
        [day]: [...(prev?.[day] || []), { start: '09:00', end: '17:00' }],
      };
    });
  };

  /**
   * Fonction pour mettre à jour une plage horaire d'un jour spécifique
   */
  const updateTimeRange = (
    day: string,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setAvailabilities((prev = {}) => ({
      ...prev,
      [day]: prev[day].map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      ),
    }));
  };

  /**
   * Fonction pour supprimer une plage horaire d'un jour spécifique
   */
  const removeTimeRange = (day: string, index: number) => {
    setAvailabilities((prev = {}) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  /**
   * Fonction pour sauvegarder les disponibilités de l'utilisateur
   */
  const handleSave = async () => {
    // Vérifier si l'utilisateur est un professionnel autorisé
    if (!user || user.role !== UserRole.PRO) {
      showToast("Vous n'êtes pas autorisé à modifier les disponibilités", 'Veuillez vous connecter en tant que professionnel', 'error');
      return;
    }

    // Vérifier les plages horaires pour chaque jour
    for (const day of daysOfWeek) {
      if (availabilities?.[day]?.length) {
        if (!validateTimeRanges(availabilities, day)) {
          showToast(
            `Une ou plusieurs plages horaires de ${day} ne sont pas correctement formatées`,
            'Veuillez vérifier les plages horaires',
            'error'
          );
          return;
        }
        
        if (checkOverlappingRanges(availabilities, day)) {
          showToast(
            `Une ou plusieurs plages horaires de ${day} se chevauchent`,
            'Veuillez vérifier les plages horaires',
            'error'
          );
          return;
        }
      }
    }

    // Mettre à jour les disponibilités
    dispatch(updateConnectedProAvailabilityRequest(availabilities as Availability));
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-16 px-4 pb-8">
        <GoBack />
        <PageHeader title="Modifier mes disponibilités" />

        {/* Sélecteur de jour */}
        <DaySelector 
          daysOfWeek={daysOfWeek}
          selectedDay={selectedDay}
          availabilities={availabilities}
          onSelectDay={toggleDayAvailability}
        />

        {/* Éditeur de plages horaires */}
        {selectedDay && (
          <TimeRangeEditor
            selectedDay={selectedDay}
            timeRanges={availabilities?.[selectedDay] || []}
            onAddTimeRange={() => addTimeRange(selectedDay)}
            onUpdateTimeRange={updateTimeRange}
            onRemoveTimeRange={removeTimeRange}
          />
        )}

        {/* Bouton de sauvegarde */}
        <TouchableOpacity 
          className="mt-8 bg-orange-600 py-4 rounded-xl shadow-lg" 
          onPress={handleSave}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Enregistrer mes disponibilités
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ConnectedUserAvailabilityScreen;