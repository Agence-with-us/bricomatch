"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  message: string;
  datetime: any;
  appointmentId?: string;
  type?: string;
  processed?: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "notifications"));
    const data: Notification[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];

    const sorted = data.sort((a, b) => {
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });
    setNotifications(sorted);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleToggleProcessed = async (
    id: string,
    current: boolean = false
  ) => {
    try {
      await updateDoc(doc(db, "notifications", id), { processed: !current });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, processed: !current } : n))
      );
    } catch (err) {
      console.error("Erreur de mise à jour du statut de la notification", err);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Button variant="outline" size="icon" onClick={fetchNotifications}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications Administrateur</CardTitle>
          <CardDescription>
            Liste des notifications liées aux rendez-vous ou aux utilisateurs.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Aucune notification trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell>{notif.message}</TableCell>
                      <TableCell>
                        {new Date(notif.datetime).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {notif.type || "Autre"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {notif.processed ? (
                          <Badge variant="outline">Traité</Badge>
                        ) : (
                          <Badge variant="destructive">Non traité</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleToggleProcessed(notif.id, notif.processed)
                            }
                          >
                            {notif.processed
                              ? "Marquer comme non lu"
                              : "Marquer comme lu"}
                          </Button>
                          {notif.appointmentId && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/dashboard/appointments/${notif.appointmentId}`
                                )
                              }
                            >
                              Voir RDV
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
