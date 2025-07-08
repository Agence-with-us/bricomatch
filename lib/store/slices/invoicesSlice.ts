import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
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
  createdAt: Timestamp;
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

export const fetchInvoices = createAsyncThunk(
  "invoices/fetchInvoices",
  async (
    { userId, userRole }: { userId?: string; userRole?: string },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as { invoices: InvoicesState; auth: { user: any } };
    const { lastVisible } = state.invoices;
    try {
      const user = state.auth.user;
      const token = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : null;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (userRole) params.append('userRole', userRole);
      if (lastVisible && typeof lastVisible.id === 'string') {
        params.append('lastInvoiceId', lastVisible.id);
      }

      const res = await fetch(`http://cc0kgscgc4s40w4kws88gg8.217.154.126.165.sslip.io/api/invoices?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Non autorisé');
      }

      return await res.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
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
        if (state.lastVisible === null) {
          state.invoices = action.payload.invoices;
        } else {
          const newInvoices = action.payload.invoices.filter(
            (inv: { id: string; }) => !state.invoices.some((i) => i.id === inv.id)
          );
          state.invoices = [...state.invoices, ...newInvoices];
        }
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetInvoices } = invoicesSlice.actions;
export default invoicesSlice.reducer;
