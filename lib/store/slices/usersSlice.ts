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
  doc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface User {
  id: string;
  type: "client" | "professional";
  name: string;
  prenom: string;
  photoUrl?: string;
  email: string;
  createdAt: string;
  phone?: string;
  [key: string]: any;
}

interface UsersState {
  users: User[];
  filteredUsers: User[];
  currentUser: User | null;
  lastVisible: DocumentData | null;
  searchTerm: string;
  filters: {
    type: "all" | "client" | "professional";
  };
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  didFetch: boolean;
  stats: {
    totalUsers: number;
    clients: number;
    pros: number;
  };
}

const initialState: UsersState = {
  users: [],
  filteredUsers: [],
  currentUser: null,
  lastVisible: null,
  searchTerm: "",
  filters: {
    type: "all",
  },
  loading: false,
  error: null,
  hasMore: true,
  didFetch: false,
  stats: {
    totalUsers: 0,
    clients: 0,
    pros: 0,
  },
};

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const idToken = await auth.currentUser?.getIdToken(); // récupère le token de l'utilisateur connecté
      const res = await fetch('https://ton-backend.coolify-domaine.com/api/users', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) throw new Error('Erreur serveur');
      return await res.json();
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);


export const fetchUserStats = createAsyncThunk(
  "users/fetchUserStats",
  async (_, { rejectWithValue }) => {
    try {
      const usersRef = collection(db, "users");

      const [clientsSnap, prosSnap] = await Promise.all([
        getDocs(query(usersRef, where("role", "==", "PARTICULIER"))),
        getDocs(query(usersRef, where("role", "==", "PRO"))),
      ]);

      return {
        totalUsers: clientsSnap.size + prosSnap.size,
        clients: clientsSnap.size,
        pros: prosSnap.size,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUser = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("users/deleteUser", async (userId, { rejectWithValue }) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);
    return userId;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;

      if (action.payload) {
        const search = action.payload.toLowerCase();
        state.filteredUsers = state.users.filter(
          (user) =>
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            (user.phone && user.phone.includes(action.payload))
        );
      } else {
        state.filteredUsers = [...state.users];
      }
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<UsersState["filters"]>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
      state.lastVisible = null;
      state.users = [];
      state.filteredUsers = [];
      state.hasMore = true;
      state.didFetch = false;
    },
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    resetUsers: (state) => {
      state.users = [];
      state.filteredUsers = [];
      state.lastVisible = null;
      state.hasMore = true;
      state.didFetch = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.didFetch = true;

        if (state.lastVisible === null) {
          state.users = action.payload.users;
        } else {
          const newUsers = action.payload.users.filter(
            (newUser: { id: string; }) => !state.users.some((u) => u.id === newUser.id)
          );
          state.users = [...state.users, ...newUsers];
        }

        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;

        if (state.searchTerm) {
          const search = state.searchTerm.toLowerCase();
          state.filteredUsers = state.users.filter(
            (user) =>
              user.name.toLowerCase().includes(search) ||
              user.email.toLowerCase().includes(search) ||
              (user.phone && user.phone.includes(state.searchTerm))
          );
        } else {
          state.filteredUsers = [...state.users];
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.filteredUsers = state.filteredUsers.filter(
          (u) => u.id !== action.payload
        );
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors de la suppression";
      });
  },
});

export const { setSearchTerm, setFilters, setCurrentUser, resetUsers } =
  usersSlice.actions;

export default usersSlice.reducer;
