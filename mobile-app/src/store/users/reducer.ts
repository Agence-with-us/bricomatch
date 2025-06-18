// users/reducer.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {  UsersState } from './types';
import { User } from '../../types/UserType';

const initialState: UsersState = {
  proUsers: [],
  proUsersByService: {},
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Actions pour récupérer tous les utilisateurs PRO
    fetchProUsersRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchProUsersSuccess(state, action: PayloadAction<User[]>) {
      state.proUsers = action.payload;
      state.loading = false;
      
      // Organiser les utilisateurs PRO par service
      state.proUsersByService = action.payload.reduce((acc, user) => {
        if (user.serviceTypeId) {
          if (!acc[user.serviceTypeId]) {
            acc[user.serviceTypeId] = [];
          }
          acc[user.serviceTypeId].push(user);
        }
        return acc;
      }, {} as Record<string, User[]>);
    },
    fetchProUsersFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Actions pour récupérer les utilisateurs PRO par service
    fetchProUsersByServiceRequest(state, action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchProUsersByServiceSuccess(state, action: PayloadAction<{ serviceId: string; users: User[] }>) {
      state.proUsersByService[action.payload.serviceId] = action.payload.users;
      state.loading = false;
    },
    fetchProUsersByServiceFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    }
  },
});

export const {
  fetchProUsersRequest,
  fetchProUsersSuccess,
  fetchProUsersFailure,
  fetchProUsersByServiceRequest,
  fetchProUsersByServiceSuccess,
  fetchProUsersByServiceFailure
} = usersSlice.actions;

export default usersSlice.reducer;
