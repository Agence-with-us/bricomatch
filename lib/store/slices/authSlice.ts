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
}

const initialState: AuthState = {
  user: null,
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
}

// --- Thunk: Connexion
export const signIn = createAsyncThunk<SignInResult, SignInParams>(
  "auth/signIn",
  async ({ email, password }) => {
    const authInstance = auth || getAuth();
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    const user = userCredential.user;

    console.log("✅ Connecté :", user.email);
    // Pas besoin de token ici : tu le récupéreras avec getIdToken() quand tu en as besoin
    return { user };
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
    setIsAdmin: (state, action: PayloadAction<boolean>) => {
      state.isAdmin = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user; // On garde le vrai User Firebase
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Échec de la connexion";
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
  },
});

export const { setUser, setStatus, setIsAdmin } = authSlice.actions;
export default authSlice.reducer;
