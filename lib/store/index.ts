import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import usersReducer from "./slices/usersSlice";
import appointmentsReducer from "./slices/appointmentsSlice";
import invoicesReducer from "./slices/invoicesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    appointments: appointmentsReducer,
    invoices: invoicesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
