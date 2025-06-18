import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Service, ServicesState } from './types';

// État initial
const initialState: ServicesState = {
  services: [],
  loading: false,
  error: null,
};

// Création du slice Redux
const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    fetchServicesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchServicesSuccess(state, action: PayloadAction<Service[]>) {
      state.services = action.payload;
      state.loading = false;
    },
    fetchServicesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { fetchServicesRequest, fetchServicesSuccess, fetchServicesFailure } = servicesSlice.actions;
export default servicesSlice.reducer;
