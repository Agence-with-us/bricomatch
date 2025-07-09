import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";
import { DocumentData, Timestamp } from "firebase/firestore";

export interface Invoice {
  id: string;
  amount: number;
  appointmentId: string;
  fileUrl: string;
  invoiceNumber: string;
  platformFee: number;
  totalAmount: number;
  vatAmount: number;
  userId: string;
  userRole: "PRO" | "PARTICULIER" | string;
  createdAt: Timestamp; // ISO string côté API
}

interface InvoicesState {
  invoices: Invoice[];
  lastVisible: DocumentData | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: InvoicesState = {
  invoices: [],
  lastVisible: null,
  loading: false,
  error: null,
  hasMore: true,
};

export const fetchInvoices = createAsyncThunk<
  { invoices: Invoice[]; lastVisible: DocumentData | null; hasMore: boolean },
  { userId?: string; userRole?: string },
  { state: RootState; rejectValue: string }
>(
  "invoices/fetchInvoices",
  async ({ userId, userRole }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { lastVisible } = state.invoices;
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue("Pas de token dispo");
      }

      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (userRole) params.append("userRole", userRole);
      if (lastVisible && typeof lastVisible.id === "string") {
        params.append("lastInvoiceId", lastVisible.id);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Non autorisé");

      return await res.json();
    } catch (err: any) {
      return rejectWithValue(err.message || "Erreur API");
    }
  }
);

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    resetInvoices: (state) => {
      state.invoices = [];
      state.lastVisible = null;
      state.loading = false;
      state.error = null;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;

        const newInvoices = action.payload.invoices || [];
        if (!state.lastVisible) {
          state.invoices = newInvoices;
        } else {
          state.invoices = [
            ...state.invoices,
            ...newInvoices.filter(
              (inv) => !state.invoices.some((i) => i.id === inv.id)
            ),
          ];
        }

        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors du fetch invoices";
      });
  },
});

export const { resetInvoices } = invoicesSlice.actions;
export default invoicesSlice.reducer;
