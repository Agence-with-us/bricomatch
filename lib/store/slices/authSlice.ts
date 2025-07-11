import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getAuth,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// --- Types
interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isAdmin: boolean;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: "idle",
  error: null,
  isAdmin: false,
};

interface SignInParams {
  email: string;
  password: string;
}

interface SignInResult {
  user: User;
  token: string;
}

// --- Thunk: Connexion
export const signIn = createAsyncThunk<SignInResult, SignInParams>(
  "auth/signIn",
  async ({ email, password }) => {
    const authInstance = auth || getAuth();
    const userCredential = await signInWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    const user = userCredential.user;
    const token = await user.getIdToken();

    // ✅ Persist localStorage ici aussi !
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    console.log("✅ Connecté :", user.email);
    return { user, token };
  }
);

// --- Thunk: Déconnexion
export const signOut = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/signOut",
  async (_, thunkAPI) => {
    try {
      await firebaseSignOut(auth);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
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
    setUser: (
      state,
      action: PayloadAction<{ user: User | null; token: string | null }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = action.payload.user ? "succeeded" : "idle";
    },
    setStatus: (state, action: PayloadAction<AuthState["status"]>) => {
      state.status = action.payload;
    },
    setIsAdmin: (state, action: PayloadAction<boolean>) => {
      state.isAdmin = action.payload;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (typeof window !== "undefined") {
        if (action.payload) {
          localStorage.setItem("token", action.payload);
        } else {
          localStorage.removeItem("token");
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Échec de la connexion";
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

export const { setUser, setStatus, setIsAdmin, setToken } = authSlice.actions;
export default authSlice.reducer;
