import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from ".."; // ajuste le chemin si besoin

export interface StatsState {
  loading: boolean;
  totalAmount: number;
  vatAmount: number;
  platformFees: number;
  invoiceCount: number;
  error?: string | null;
}

const initialState: StatsState = {
  loading: false,
  totalAmount: 0,
  vatAmount: 0,
  platformFees: 0,
  invoiceCount: 0,
  error: null,
};

// Définition du thunk ici même
export const fetchStatsFromInvoices = createAsyncThunk(
  "stats/fetchStatsFromInvoices",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const token = state.auth.token;

      if (!token) {
        return thunkAPI.rejectWithValue("Token manquant");
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Non autorisé");
      }

      return await res.json();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStatsFromInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchStatsFromInvoices.fulfilled, (state, action) => {
        state.loading = false;
        if (
          action.payload &&
          typeof action.payload === 'object' &&
          'totalAmount' in action.payload
        ) {
          state.totalAmount = action.payload.totalAmount;
          state.vatAmount = action.payload.vatAmount;
          state.platformFees = action.payload.platformFees;
          state.invoiceCount = action.payload.invoiceCount;
        } else {
          state.error = "Réponse invalide de l'API";
        }
      })

      .addCase(fetchStatsFromInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default statsSlice.reducer;
