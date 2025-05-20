import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  proId: string;
  appointmentId?: string;
  clientName?: string;
  proName?: string;
  amount: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  issueDate: string;
  paidDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  notes?: string;
  [key: string]: any;
}

interface InvoicesState {
  invoices: Invoice[];
  filteredInvoices: Invoice[];
  currentInvoice: Invoice | null;
  lastVisible: DocumentData | null;
  searchTerm: string;
  filters: {
    status: 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled';
    date: {
      from: string | null;
      to: string | null;
    };
    amount: {
      min: number | null;
      max: number | null;
    };
    userId: string | null;
    userType: 'client' | 'professional' | null;
  };
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: InvoicesState = {
  invoices: [],
  filteredInvoices: [],
  currentInvoice: null,
  lastVisible: null,
  searchTerm: '',
  filters: {
    status: 'all',
    date: {
      from: null,
      to: null,
    },
    amount: {
      min: null,
      max: null,
    },
    userId: null,
    userType: null,
  },
  loading: false,
  error: null,
  hasMore: true,
};

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { invoices: InvoicesState };
    const { lastVisible, filters } = state.invoices;
    
    try {
      let invoicesQuery = collection(db, 'invoices');
      
      // Apply filters
      if (filters.status !== 'all') {
        invoicesQuery = query(invoicesQuery, where('status', '==', filters.status));
      }
      
      if (filters.userId && filters.userType) {
        const userIdField = filters.userType === 'client' ? 'clientId' : 'proId';
        invoicesQuery = query(invoicesQuery, where(userIdField, '==', filters.userId));
      }
      
      if (filters.date.from) {
        invoicesQuery = query(invoicesQuery, where('issueDate', '>=', filters.date.from));
      }
      
      if (filters.date.to) {
        invoicesQuery = query(invoicesQuery, where('issueDate', '<=', filters.date.to));
      }
      
      // Order and paginate
      invoicesQuery = query(invoicesQuery, orderBy('issueDate', 'desc'), limit(20));
      
      if (lastVisible) {
        invoicesQuery = query(invoicesQuery, startAfter(lastVisible));
      }
      
      const querySnapshot = await getDocs(invoicesQuery);
      const invoicesData: Invoice[] = [];
      
      for (const document of querySnapshot.docs) {
        const invoiceData = document.data();
        
        // Fetch related entity names
        let clientName = '';
        let proName = '';
        
        if (invoiceData.clientId) {
          const clientDoc = await getDoc(doc(db, 'users', invoiceData.clientId));
          if (clientDoc.exists()) {
            clientName = clientDoc.data().name || '';
          }
        }
        
        if (invoiceData.proId) {
          const proDoc = await getDoc(doc(db, 'users', invoiceData.proId));
          if (proDoc.exists()) {
            proName = proDoc.data().name || '';
          }
        }
        
        // Filter by amount range if needed (post-query filtering)
        if (
          (filters.amount.min !== null && invoiceData.amount < filters.amount.min) ||
          (filters.amount.max !== null && invoiceData.amount > filters.amount.max)
        ) {
          continue;
        }
        
        invoicesData.push({ 
          id: document.id, 
          ...invoiceData,
          clientName,
          proName,
        } as Invoice);
      }
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      return {
        invoices: invoicesData,
        lastVisible: lastDoc || null,
        hasMore: !querySnapshot.empty,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      if (action.payload) {
        const search = action.payload.toLowerCase();
        state.filteredInvoices = state.invoices.filter(
          (invoice) =>
            invoice.number.toLowerCase().includes(search) ||
            invoice.clientName?.toLowerCase().includes(search) ||
            invoice.proName?.toLowerCase().includes(search)
        );
      } else {
        state.filteredInvoices = state.invoices;
      }
    },
    setFilters: (state, action: PayloadAction<Partial<InvoicesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.lastVisible = null; // Reset pagination when filters change
    },
    setCurrentInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.currentInvoice = action.payload;
    },
    resetInvoices: (state) => {
      state.invoices = [];
      state.filteredInvoices = [];
      state.lastVisible = null;
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
          // First page or reset
          state.invoices = action.payload.invoices;
        } else {
          // Append to existing list
          state.invoices = [...state.invoices, ...action.payload.invoices];
        }
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
        
        // Apply current search term to filtered invoices
        if (state.searchTerm) {
          const search = state.searchTerm.toLowerCase();
          state.filteredInvoices = state.invoices.filter(
            (invoice) =>
              invoice.number.toLowerCase().includes(search) ||
              invoice.clientName?.toLowerCase().includes(search) ||
              invoice.proName?.toLowerCase().includes(search)
          );
        } else {
          state.filteredInvoices = state.invoices;
        }
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchTerm, setFilters, setCurrentInvoice, resetInvoices } = invoicesSlice.actions;
export default invoicesSlice.reducer;