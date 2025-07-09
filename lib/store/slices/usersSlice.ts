import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";
import { DocumentData } from "firebase/firestore";

interface User {
  id: string;
  type: "client" | "professional";
  name: string;
  prenom: string;
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
  filters: { type: "all" | "client" | "professional" };
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
  filters: { type: "all" },
  loading: false,
  error: null,
  hasMore: true,
  didFetch: false,
  stats: { totalUsers: 0, clients: 0, pros: 0 },
};

// ✅ FETCH USERS
export const fetchUsers = createAsyncThunk<
  any,
  void,
  { state: RootState; rejectValue: string }
>("users/fetchUsers", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Pas de token dispo");
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Non autorisé");

    return await res.json();
  } catch (err: any) {
    return rejectWithValue(err.message || "Erreur API");
  }
});

// ✅ FETCH USER STATS
export const fetchUserStats = createAsyncThunk<
  any,
  void,
  { state: RootState; rejectValue: string }
>("users/fetchUserStats", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Pas de token dispo");
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Non autorisé");

    return await res.json();
  } catch (err: any) {
    return rejectWithValue(err.message || "Erreur API");
  }
});

// ✅ DELETE USER
export const deleteUser = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: string }
>("users/deleteUser", async (userId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Pas de token dispo");
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error("Erreur suppression");

    return userId;
  } catch (err: any) {
    return rejectWithValue(err.message || "Erreur API");
  }
});

// ✅ FETCH USER BY ID
export const fetchUserById = createAsyncThunk<
  User,
  string,
  { state: RootState; rejectValue: string }
>("users/fetchUserById", async (userId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Pas de token dispo");
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error("Non autorisé");

    return await res.json();
  } catch (err: any) {
    return rejectWithValue(err.message || "Erreur API");
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
          (u) =>
            u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            (u.phone && u.phone.includes(action.payload))
        );
      } else {
        state.filteredUsers = [...state.users];
      }
    },
    setFilters: (state, action: PayloadAction<Partial<UsersState["filters"]>>) => {
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
        state.users = action.payload.users || [];
        state.filteredUsers = [...state.users];
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors du fetch users";
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
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        const user = action.payload;
        const idx = state.users.findIndex((u) => u.id === user.id);
        if (idx >= 0) state.users[idx] = user;
        else state.users.push(user);
        state.currentUser = user;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.error = action.payload || "Erreur lors du fetch user";
      });
  },
});

export const { setSearchTerm, setFilters, setCurrentUser, resetUsers } =
  usersSlice.actions;

export default usersSlice.reducer;
