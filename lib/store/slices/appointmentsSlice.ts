import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface Filters {
  status: "all" | "pending" | "confirmed" | "completed" | "cancelled";
  date: {
    from: string | null;
    to: string | null;
  };
  userId: string | null;
  userType: "client" | "professional" | null;
}

interface Appointment {
  id: string;
  date: string;
  status: string;
  userId: string;
  userType: "client" | "professional";
  // ... autres propriétés
}

interface AppointmentsState {
  totalCount: number;
  filters: Filters;
  loading: boolean;
  error: string | null;
  appointments: Appointment[];  // on stocke la liste
  currentAppointment: Appointment | null; // pour fetchById
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
  appointments: [],
  currentAppointment: null,
};

export const countAppointments = createAsyncThunk<
  number,
  void,
  { rejectValue: string; state: { appointments: AppointmentsState; auth: { user: any } } }
>(
  "appointments/countAppointments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { filters } = state.appointments;
      const token = await state.auth.user?.getIdToken();

      const params = new URLSearchParams();

      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.userId && filters.userType) {
        params.append("userId", filters.userId);
        params.append("userType", filters.userType);
      }
      if (filters.date.from) params.append("from", filters.date.from);
      if (filters.date.to) params.append("to", filters.date.to);

      const res = await fetch(
        `http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/appointments/count?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Non autorisé");
      }

      const data = await res.json();
      return data.count;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// **NOUVEAU** thunk pour fetch un rdv par ID
export const fetchAppointmentById = createAsyncThunk<
  Appointment,
  string,
  { rejectValue: string; state: { appointments: AppointmentsState; auth: { user: any } } }
>(
  "appointments/fetchAppointmentById",
  async (appointmentId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = await state.auth.user?.getIdToken();

      const res = await fetch(
        `http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Non autorisé");
      }

      const data = await res.json();
      return data.appointment;
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
      })

      // Gestion fetchAppointmentById
      .addCase(fetchAppointmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentById.fulfilled, (state, action) => {
        state.loading = false;
        const fetchedAppointment = action.payload;

        // Ajoute ou remplace dans state.appointments
        const idx = state.appointments.findIndex((a) => a.id === fetchedAppointment.id);
        if (idx >= 0) {
          state.appointments[idx] = fetchedAppointment;
        } else {
          state.appointments.push(fetchedAppointment);
        }

        state.currentAppointment = fetchedAppointment;
      })
      .addCase(fetchAppointmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors du fetch appointment";
      });
  },
});

export const { setFilters } = appointmentsSlice.actions;

export default appointmentsSlice.reducer;
