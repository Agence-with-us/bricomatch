import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";


interface Filters {
  status: "all" | "pending" | "confirmed" | "completed" | "cancelled";
  date: {
    from: string | null;
    to: string | null;
  };
  userId: string | null;
  userType: "client" | "professional" | null;
}

interface AppointmentsState {
  totalCount: number;
  filters: Filters;
  loading: boolean;
  error: string | null;
}

const initialState: AppointmentsState = {
  totalCount: 0,
  filters: {
    status: "all",
    date: {
      from: null,
      to: null,
    },
    userId: null,
    userType: null,
  },
  loading: false,
  error: null,
};

export const countAppointments = createAsyncThunk(
  "appointments/countAppointments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { appointments: AppointmentsState; auth: { user: any } };
      const { filters } = state.appointments;

      const token = await state.auth.user?.getIdToken();

      // Construire query params
      const params = new URLSearchParams();

      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.userId && filters.userType) {
        params.append('userId', filters.userId);
        params.append('userType', filters.userType);
      }
      if (filters.date.from) params.append('from', filters.date.from);
      if (filters.date.to) params.append('to', filters.date.to);

      const res = await fetch(`http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/appointments/count?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Non autorisé');
      }

      const data = await res.json();
      return data.count;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);


const appointmentsSlice = createSlice({
  name: "appointments",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<Filters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(countAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(countAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.totalCount = action.payload;
      })
      .addCase(countAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters } = appointmentsSlice.actions;

export default appointmentsSlice.reducer;
