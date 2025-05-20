// lib/store/slices/statsSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StatsState {
  totalAmount: number;
  vatAmount: number;
  platformFees: number;
  invoiceCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  totalAmount: 0,
  vatAmount: 0,
  platformFees: 0,
  invoiceCount: 0,
  loading: false,
  error: null,
};

export const fetchStatsFromInvoices = createAsyncThunk(
  "stats/fetchStatsFromInvoices",
  async (_, thunkAPI) => {
    try {
      // Étape 1 : récupérer les utilisateurs PRO
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("role", "==", "PRO"))
      );

      const proUserIds = usersSnapshot.docs.map((doc) => doc.id);

      // Étape 2 : récupérer toutes les factures
      const invoicesSnapshot = await getDocs(collection(db, "invoices"));

      let total = 0;
      let vat = 0;
      let platform = 0;
      let count = 0;

      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId; // 👈 ce champ doit exister dans chaque facture

        if (proUserIds.includes(userId)) {
          total += data.totalAmount || 0;
          vat += data.vatAmount || 0;
          platform += data.platformFee || 0;
          count += 1;
        }
      });

      return {
        totalAmount: total,
        vatAmount: vat,
        platformFees: platform,
        invoiceCount: count,
      };
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
        state.totalAmount = action.payload.totalAmount;
        state.vatAmount = action.payload.vatAmount;
        state.platformFees = action.payload.platformFees;
        state.invoiceCount = action.payload.invoiceCount;
      })
      .addCase(fetchStatsFromInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default statsSlice.reducer;
