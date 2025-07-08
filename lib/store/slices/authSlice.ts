import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getAuth,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// --- Types
interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  token: string | null
  isAdmin: boolean;
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
  email: string | null;
  uid: string;
  token: string;
}

// --- Thunk: Connexion + récupération token
export const signIn = createAsyncThunk<
  SignInResult,
  SignInParams
>(
  'auth/signIn',
  async ({ email, password }) => {
    // Utiliser l'instance auth de firebase ou getAuth()
    const authInstance = auth || getAuth();
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();

    if (!token) throw new Error("Token non récupéré");

    return { email: user.email, uid: user.uid, token };
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = "succeeded";

        state.user = {
          email: action.payload.email,
          uid: action.payload.uid,

        } as unknown as User;

        state.error = null;
        state.token = action.payload.token; // ✅ On stocke le token
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

export const { setUser, setStatus, setIsAdmin } = authSlice.actions;
export default authSlice.reducer;
