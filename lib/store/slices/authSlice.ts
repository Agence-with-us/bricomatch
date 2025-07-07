import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// --- Types
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

// --- Thunk: Connexion + Vérification admin
export const signIn = createAsyncThunk<User, SignInParams, { rejectValue: string }>(
  "auth/signIn",
  async ({ email, password }, thunkAPI) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const token = await user.getIdToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkAdmin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        return thunkAPI.rejectWithValue(errorText || "Accès refusé");
      }

      return user;
    } catch (error: any) {
      console.error("Erreur de connexion :", error);
      return thunkAPI.rejectWithValue(error.message || "Erreur de connexion");
    }
  }
);


// --- Thunk: Déconnexion
export const signOut = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/signOut",
  async (_, thunkAPI) => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Erreur lors de la déconnexion :", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// --- Slice
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
        state.error = action.payload ?? "Échec de la connexion";
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

// --- Exports
export const { setUser, setStatus } = authSlice.actions;
export default authSlice.reducer;
