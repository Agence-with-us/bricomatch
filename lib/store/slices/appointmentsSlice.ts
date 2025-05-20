import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const state = getState() as { appointments: AppointmentsState };
    const { filters } = state.appointments;

    try {
      let q: any = collection(db, "appointments");
      const conditions = [];

      if (filters.status !== "all") {
        conditions.push(where("status", "==", filters.status));
      }

      if (filters.userId && filters.userType) {
        const userField = filters.userType === "client" ? "clientId" : "proId";
        conditions.push(where(userField, "==", filters.userId));
      }

      if (filters.date.from) {
        conditions.push(where("dateTime", ">=", filters.date.from));
      }

      if (filters.date.to) {
        conditions.push(where("dateTime", "<=", filters.date.to));
      }

      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }

      const snapshot = await getDocs(q);
      return snapshot.size;
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
