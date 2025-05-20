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
import { db } from "@/lib/firebase";
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
    const state = getState() as { invoices: InvoicesState };
    const { lastVisible } = state.invoices;
    try {
      const invoicesRef = collection(db, "invoices");

      let constraints = [];

      if (userId && userId !== "") {
        constraints.push(where("userId", "==", userId));
      }
      if (userRole && userRole !== "") {
        constraints.push(where("userRole", "==", userRole));
      }

      constraints.push(orderBy("invoiceNumber", "desc"));
      constraints.push(limit(20));

      if (lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      const invoicesQuery = query(invoicesRef, ...constraints);

      const querySnapshot = await getDocs(invoicesQuery);

      const invoicesData: Invoice[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Invoice, "id">),
      }));

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;

      return {
        invoices: invoicesData,
        lastVisible: lastDoc,
        hasMore: !querySnapshot.empty,
      };
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
            (inv) => !state.invoices.some((i) => i.id === inv.id)
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
