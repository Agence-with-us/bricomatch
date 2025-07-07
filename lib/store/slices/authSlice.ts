import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// État du slice
interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

interface SignInParams {
  email: string;
  password: string;
}

// 🔐 Thunk pour la connexion Firebase
export const signIn = createAsyncThunk<User, SignInParams>(
  "auth/signIn",
  async ({ email, password }, thunkAPI) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken(true);

      const res = await fetch('/api/checkAdmin', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Accès réservé aux admins');
      }

      return user;
    } catch (error) {
      if (error instanceof Error) {
        return thunkAPI.rejectWithValue(error.message);
      }
      return thunkAPI.rejectWithValue(String(error));
    }
  }
);


// 🚪 Thunk pour la déconnexion Firebase
export const signOut = createAsyncThunk("auth/signOut", async (_, thunkAPI) => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Slice d'authentification
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.status = action.payload ? "succeeded" : "idle";
    },
    setStatus: (state, action: PayloadAction<AuthState["status"]>) => {
      state.status = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

// Export des actions et du reducer
export const { setUser, setStatus } = authSlice.actions;
export default authSlice.reducer;
