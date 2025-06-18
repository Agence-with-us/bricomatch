import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Availability } from './types';

export interface AvailabilityState {
    connectedProAvailability: Availability | null; // Disponibilité du professionnel connecté
    otherProAvailability: Availability | null; // Disponibilité d'un autre professionnel
    isLoading: boolean;
    error?: string; // `undefined` si pas d'erreur
}

// État initial avec `null` pour éviter les objets vides indéfinis
const initialAvailabilityState: AvailabilityState = {
    connectedProAvailability: null,
    otherProAvailability: null,
    isLoading: false,
    error: undefined,
};

// Fonction de mise à jour dynamique (évite la duplication de code)
const updateAvailability = (state: AvailabilityState, availability: Availability, type: 'connected' | 'other') => {
    if (type === 'connected') {
        state.connectedProAvailability = availability;
    } else {
        state.otherProAvailability = availability;
    }
};

const availabilitySlice = createSlice({
    name: 'availability',
    initialState: initialAvailabilityState,
    reducers: {
        // Déclenche la récupération de disponibilité
        fetchAvailabilityRequest(state, action: PayloadAction<{ userId: string; type: 'connected' | 'other' }>) {
            state.isLoading = true;
            state.error = undefined;
        },

        // Succès : Met à jour la disponibilité
        fetchAvailabilitySuccess(state, action: PayloadAction<{ availability: Availability; type: 'connected' | 'other' }>) {
            state.isLoading = false;
            updateAvailability(state, action.payload.availability, action.payload.type);
        },

        // Échec : Stocke l'erreur
        fetchAvailabilityFailure(state, action: PayloadAction<string>) {
            state.isLoading = false;
            state.error = action.payload;
        },

        // Déclenche la mise à jour de la disponibilité du PRO connecté
        updateConnectedProAvailabilityRequest(state, action: PayloadAction<Availability>) {
            state.isLoading = true;
            state.error = undefined;
        },

        // Succès : Met à jour la disponibilité du PRO connecté
        updateConnectedProAvailabilitySuccess(state, action: PayloadAction<Availability>) {
            state.isLoading = false;
            state.connectedProAvailability = action.payload;
        },

        // Échec : Stocke l'erreur
        updateConnectedProAvailabilityFailure(state, action: PayloadAction<string>) {
            state.isLoading = false;
            state.error = action.payload;
        },
    },
});

// Exportation des actions pour les utiliser dans les composants et les `dispatch`
export const {
    fetchAvailabilityRequest,
    fetchAvailabilitySuccess,
    fetchAvailabilityFailure,
    updateConnectedProAvailabilityRequest,
    updateConnectedProAvailabilitySuccess,
    updateConnectedProAvailabilityFailure,
} = availabilitySlice.actions;

export default availabilitySlice.reducer;
