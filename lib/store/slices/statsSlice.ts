import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "..";

export const fetchStatsFromInvoices = createAsyncThunk(
  "stats/fetchStatsFromInvoices",
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const token = await state.auth.user?.getIdToken?.();

      const res = await fetch("http://cc0kgscgc4s40w4k8ws88gg8.217.154.126.165.sslip.io/api/invoices/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Non autorisé");
      }

      return await res.json();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);
