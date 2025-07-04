"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchInvoices, resetInvoices } from "@/lib/store/slices/invoicesSlice";
import DashboardLayout from "@/components/dashboard/layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

function formatCentToEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function InvoicesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { invoices, loading, error, hasMore } = useSelector(
    (state: RootState) => state.invoices
  );
  const [appointments, setAppointments] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, UserInfo>>({});

  useEffect(() => {
    dispatch(fetchInvoices({}));
    return () => {
      dispatch(resetInvoices());
    };
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(resetInvoices());
    dispatch(fetchInvoices({}));
  };

  const loadMore = () => {
    dispatch(fetchInvoices({}));
  };

  const fetchUser = async (userId: string) => {
    if (!userId || users[userId]) return;
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as Omit<UserInfo, "id">;
        setUsers((prev) => ({
          ...prev,
          [userId]: { id: userId, ...userData },
        }));
      }
    } catch (err) {
      console.error("Erreur récupération utilisateur", err);
    }
  };
  const fetchAppointment = async (appointmentId: string) => {
    if (!appointmentId || appointments[appointmentId]) return;
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      const appointmentSnap = await getDoc(appointmentRef);
      if (appointmentSnap.exists()) {
        setAppointments((prev) => ({
          ...prev,
          [appointmentId]: { id: appointmentId, ...appointmentSnap.data() },
        }));
      }
    } catch (err) {
      console.error("Erreur récupération appointment", err);
    }
  };
  useEffect(() => {
    invoices.forEach((invoice) => {
      if (invoice.userId && !users[invoice.userId]) {
        fetchUser(invoice.userId);
      }
      if (invoice.appointmentId && !appointments[invoice.appointmentId]) {
        fetchAppointment(invoice.appointmentId);
      }
    });
  }, [invoices]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Factures</h1>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Factures</CardTitle>
          <CardDescription>
            Affichage des factures pour les professionnels et particuliers.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Montant HT</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>Frais Plateforme</TableHead>
                  <TableHead>Total TTC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && invoices.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {users[invoice.userId] ? (
                            <>
                              <span className="font-medium">
                                {users[invoice.userId].nom || "Nom inconnu"} {users[invoice.userId].prenom || "Nom inconnu"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {users[invoice.userId].email}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Chargement...</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            invoice.userRole === "PRO"
                              ? "bg-blue-600 text-white"
                              : "bg-orange-500 text-white"
                          }
                        >
                          {invoice.userRole === "PRO" ? "Professionnel" : "Particulier"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {appointments[invoice.appointmentId]
                          ? formatCentToEuro(appointments[invoice.appointmentId].montantHT)
                          : <span className="text-xs text-muted-foreground">...</span>
                        }
                      </TableCell>
                      <TableCell>
                        {appointments[invoice.appointmentId]
                          ? formatCentToEuro(
                            appointments[invoice.appointmentId].montantTotal -
                            appointments[invoice.appointmentId].montantHT
                          )
                          : <span className="text-xs text-muted-foreground">...</span>
                        }
                      </TableCell>
                      <TableCell>
                        {formatCentToEuro(invoice.platformFee ?? 0)}
                      </TableCell>
                      <TableCell>
                        {appointments[invoice.appointmentId]
                          ? formatCentToEuro(appointments[invoice.appointmentId].montantTotal)
                          : <span className="text-xs text-muted-foreground">...</span>
                        }
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const rawDate = invoice.createdAt;
                          if (!rawDate) return "N/A";
                          if (typeof rawDate?.toDate === "function") {
                            return rawDate.toDate().toLocaleString("fr-FR");
                          }
                          return "Date invalide";
                        })()}
                      </TableCell>
                      <TableCell>
                        <a
                          href={invoice.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ouvrir
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore && !loading && invoices.length > 0 && (
            <div className="text-center mt-4">
              <Button onClick={loadMore}>Charger plus</Button>
            </div>
          )}

          {error && (
            <p className="text-center text-red-600 mt-4">Erreur : {error}</p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
