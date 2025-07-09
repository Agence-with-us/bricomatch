"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Users, ArrowUpRight, UserPlus, Briefcase } from "lucide-react";
import DashboardLayout from "@/components/dashboard/layout";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchUsers } from "@/lib/store/slices/usersSlice";
import { countAppointments } from "@/lib/store/slices/appointmentsSlice";
import { fetchStatsFromInvoices } from "@/lib/store/slices/statsSlice";

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const { users, loading } = useSelector((state: RootState) => state.users);
  const invoiceStats = useSelector((state: RootState) => state.stats);

  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchUsers());
    }
  }, [dispatch, users.length]);

  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);

  useEffect(() => {
    const getCount = async () => {
      try {
        const result = await dispatch(countAppointments()).unwrap();
        setAppointmentCount(result);
      } catch (err) {
        console.error("Erreur lors du comptage des rendez-vous :", err);
      }
    };
    getCount();
  }, [dispatch]);

  const userStats = useMemo(() => {
    const total = users.length;
    const clients = users.filter((u) => u.type === "client").length;
    const pros = users.filter((u) => u.type === "professional").length;

    const now = new Date();
    const oneMonthAgo = new Date(now.setDate(now.getDate() - 30));
    const newUsers = users.filter(
      (u) => new Date(u.createdAt) >= oneMonthAgo
    ).length;

    return { total, clients, pros, newUsers };
  }, [users]);

  useEffect(() => {
    dispatch(fetchStatsFromInvoices());
  }, [dispatch]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user?.email?.split("@")[0] || "Admin"}
        </h1>
        <div className="inline-flex items-center gap-2 bg-muted px-3 py-1 rounded-md text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {loading ? "---" : userStats.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="mr-1 h-4 w-4" />+
                {loading ? "---" : userStats.newUsers} nouveaux les 30 derniers
                jours
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Particuliers</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.clients}</div>
            <CardDescription>Utilisateurs particuliers</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Professionnels
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.pros}</div>
            <CardDescription>Utilisateurs professionnels</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendez-vous</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentCount === null ? "---" : appointmentCount}
            </div>
            <CardDescription>Total des rendez-vous enregistrés</CardDescription>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Chiffre d'affaires
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoiceStats.loading
                ? "---"
                : (invoiceStats.totalAmount / 100).toFixed(2)}{" "}
              €
            </div>
            <CardDescription>
              {invoiceStats.loading
                ? ""
                : `TVA : ${(invoiceStats.vatAmount / 100).toFixed(
                  2
                )} €, Frais : ${(invoiceStats.platformFees / 100).toFixed(
                  2
                )} €`}
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoiceStats.loading ? "---" : invoiceStats.invoiceCount}
            </div>
            <CardDescription>Total des factures émises</CardDescription>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
