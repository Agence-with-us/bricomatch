"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase, ArrowUpRight, Clock, UserPlus } from "lucide-react";
import DashboardLayout from "@/components/dashboard/layout";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { fetchUsers } from "@/lib/store/slices/usersSlice";
import { countAppointments } from "@/lib/store/slices/appointmentsSlice";

// Simulated data - would come from API/Firestore in production
const revenueData = [
  { name: "Jan", total: 18000 },
  { name: "Feb", total: 21500 },
  { name: "Mar", total: 25000 },
  { name: "Apr", total: 19000 },
  { name: "May", total: 27500 },
  { name: "Jun", total: 32500 },
];

const appointmentsData = [
  { name: "Lun", total: 12 },
  { name: "Mar", total: 18 },
  { name: "Mer", total: 15 },
  { name: "Jeu", total: 22 },
  { name: "Ven", total: 28 },
  { name: "Sam", total: 10 },
  { name: "Dim", total: 5 },
];

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  const dispatch = useDispatch<AppDispatch>();
  const { users, loading } = useSelector((state: RootState) => state.users);

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

  const stats = useMemo(() => {
    const total = users.length;
    const clients = users.filter((u) => u.type === "client").length;
    const pros = users.filter((u) => u.type === "professional").length;

    // Nouveaux inscrits sur les 30 derniers jours
    const now = new Date();
    const oneMonthAgo = new Date(now.setDate(now.getDate() - 30));

    const newUsers = users.filter((u) => {
      const createdAt = new Date(u.createdAt);
      return createdAt >= oneMonthAgo;
    }).length;

    return { total, clients, pros, newUsers };
  }, [users]);

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
              {loading ? "---" : stats.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="mr-1 h-4 w-4" />+
                {loading ? "---" : stats.newUsers} nouveaux les 30 derniers
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
            <div className="text-2xl font-bold">{stats.clients}</div>
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
            <div className="text-2xl font-bold">{stats.pros}</div>
            <CardDescription>Utilisateurs professionnels</CardDescription>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
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
      {/* 
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analytics">Détails Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rendez-vous Récents</CardTitle>
                <CardDescription>
                  Les rendez-vous programmés pour la semaine en cours
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={appointmentsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      name="Rendez-vous"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chiffre d'Affaires</CardTitle>
                <CardDescription>
                  Évolution du chiffre d'affaires sur les 6 derniers mois
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [
                        `${(value / 1000).toFixed(1)}k€`,
                        "CA",
                      ]}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                      name="CA"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performances Détaillées</CardTitle>
              <CardDescription>
                Vue analytique complète à venir dans la prochaine version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] flex items-center justify-center text-muted-foreground">
                Module d'analytique avancée en cours de développement
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs> */}
    </DashboardLayout>
  );
}
