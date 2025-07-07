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
import { auth } from "@/lib/firebase";
import { RootState } from "..";

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
  "users/fetchUsers",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const token = await state.auth.user?.getIdToken?.();

      const res = await fetch(
        "http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/users",
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
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  "users/fetchUserStats",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const token = await state.auth.user?.getIdToken?.();

      const res = await fetch(
        "http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/users/stats",
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

export const deleteUser = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("users/deleteUser", async (userId, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as RootState;
    const token = await state.auth.user?.getIdToken?.();

    const res = await fetch(
      `http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Erreur suppression");
    }

    return userId;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// **NOUVEAU** thunk pour fetch un user par ID via API
export const fetchUserById = createAsyncThunk<
  User,
  string,
  { rejectValue: string; state: RootState }
>("users/fetchUserById", async (userId, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = await state.auth.user?.getIdToken?.();

    const res = await fetch(
      `http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/users/${userId}`,
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

        if (state.lastVisible === null) {
          state.users = action.payload.users;
        } else {
          const newUsers = action.payload.users.filter(
            (newUser: { id: string }) =>
              !state.users.some((u) => u.id === newUser.id)
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
      })

      // GESTION DU FETCH USER BY ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        const fetchedUser = action.payload;

        const idx = state.users.findIndex((u) => u.id === fetchedUser.id);
        if (idx >= 0) {
          state.users[idx] = fetchedUser;
        } else {
          state.users.push(fetchedUser);
        }

        if (state.currentUser?.id === fetchedUser.id) {
          state.currentUser = fetchedUser;
        }

        // Actualise filteredUsers aussi si besoin
        const filteredIdx = state.filteredUsers.findIndex(
          (u) => u.id === fetchedUser.id
        );
        if (filteredIdx >= 0) {
          state.filteredUsers[filteredIdx] = fetchedUser;
        }
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Erreur lors du fetch user";
      });
  },
});

export const { setSearchTerm, setFilters, setCurrentUser, resetUsers } =
  usersSlice.actions;

export default usersSlice.reducer;
