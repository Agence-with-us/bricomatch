import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";

// Types
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
  // ... autres champs si besoin
}

interface AppointmentsState {
  totalCount: number;
  filters: Filters;
  loading: boolean;
  error: string | null;
  appointments: Appointment[];
  currentAppointment: Appointment | null;
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

// ✅ COMPTE les rendez-vous
export const countAppointments = createAsyncThunk<
  number,
  void,
  { state: RootState; rejectValue: string }
>(
  "appointments/countAppointments",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { filters } = state.appointments;
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue("Pas de token dispo");
      }

      const params = new URLSearchParams();

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.userId && filters.userType) {
        params.append("userId", filters.userId);
        params.append("userType", filters.userType);
      }
      if (filters.date.from) {
        params.append("from", filters.date.from);
      }
      if (filters.date.to) {
        params.append("to", filters.date.to);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/count?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Non autorisé");

      const data = await res.json();
      if (typeof data.count !== "number") {
        throw new Error("Réponse invalide");
      }

      return data.count;
    } catch (err: any) {
      return rejectWithValue(err.message || "Erreur API");
    }
  }
);

// ✅ FETCH un rdv par ID
export const fetchAppointmentById = createAsyncThunk<
  Appointment,
  string,
  { state: RootState; rejectValue: string }
>(
  "appointments/fetchAppointmentById",
  async (appointmentId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue("Pas de token dispo");
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Non autorisé");

      const data = await res.json();
      if (!data.appointment) {
        throw new Error("Réponse invalide");
      }

      return data.appointment;
    } catch (err: any) {
      return rejectWithValue(err.message || "Erreur API");
    }
  }
);

// ✅ Slice
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
        state.error = action.payload || "Erreur lors du comptage";
      })

      .addCase(fetchAppointmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentById.fulfilled, (state, action) => {
        state.loading = false;

        const fetched = action.payload;
        const index = state.appointments.findIndex((a) => a.id === fetched.id);
        if (index >= 0) {
          state.appointments[index] = fetched;
        } else {
          state.appointments.push(fetched);
        }
        state.currentAppointment = fetched;
      })
      .addCase(fetchAppointmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors du fetch";
      });
  },
});

export const { setFilters } = appointmentsSlice.actions;
export default appointmentsSlice.reducer;
