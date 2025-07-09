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
export const countAppointments = createAsyncThunk<number, void, { state: RootState }>(
  "appointments/countAppointments",
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    if (!token) {
      throw new Error("Pas de token dispo");
    }

    const response = await fetch("/api/appointments/count", {
      headers: {
        Authorization: `Bearer ${token}`, // Utilisation du token dans l'en-tête
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors du comptage des rendez-vous");
    }

    const data = await response.json();
    return data.count;
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
      .addCase(fetchAppointmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message ?? "Erreur lors du fetch";
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
