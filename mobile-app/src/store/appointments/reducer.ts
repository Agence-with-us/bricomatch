// reducer.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {  AppointmentsState, AppointmentStatus, AppointmentWithOtherUserInfo } from './types';

// État initial
const initialState: AppointmentsState = {
  myAppointements: [],
  loading: false,
  error: null,
};

// Création du slice Redux
const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    fetchAppointmentsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchAppointmentsSuccess(state, action: PayloadAction<AppointmentWithOtherUserInfo[]>) {
      state.myAppointements = action.payload;
      state.loading = false;
    },
    fetchAppointmentsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    updateAppointmentStatusRequest(state, action: PayloadAction<{id: string, status: AppointmentStatus}>) {
      state.loading = true;
      state.error = null;
    },
    updateAppointmentStatusSuccess(state, action: PayloadAction<{id: string, status: AppointmentStatus}>) {
      // Mettre à jour l'appointment dans la liste
      state.myAppointements = state.myAppointements.map(item => 
        item.appointment.id === action.payload.id 
          ? { ...item, appointment: { ...item.appointment, status: action.payload.status } }
          : item
      );
      state.loading = false;
    },
    updateAppointmentStatusFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    addAppointmentRequest(state, action: PayloadAction<AppointmentWithOtherUserInfo>) {
      state.loading = true;
      state.error = null;
    },
    addAppointmentSuccess(state, action: PayloadAction<AppointmentWithOtherUserInfo>) {
      state.myAppointements.push(action.payload);
      state.loading = false;    
    },
    addAppointmentFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { 
  fetchAppointmentsRequest, 
  fetchAppointmentsSuccess, 
  fetchAppointmentsFailure,
  updateAppointmentStatusRequest,
  updateAppointmentStatusSuccess,
  updateAppointmentStatusFailure,
  addAppointmentRequest,
  addAppointmentSuccess,
  addAppointmentFailure
} = appointmentsSlice.actions;

export default appointmentsSlice.reducer;