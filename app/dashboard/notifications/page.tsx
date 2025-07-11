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
import { useRouter } from "next/navigation";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

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


    const handleAppointmentAction = async (
        appointmentId: string,
        action: "accepter" | "refuser"
    ) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Utilisateur non connecté");

            const token = await getIdToken(user);

            const res = await fetch(
                `https://api.brico-match.com/appointment/${action}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        appointmentId,
                        type_action: action,
                    }),
                }
            );

            if (!res.ok) throw new Error("Erreur API");

            // Recharger les notifications après action
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Utilisateur non connecté");

            const token = await getIdToken(user);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("Erreur API");

            const data: Notification[] = await res.json();
            setNotifications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleToggleProcessed = async (id: string, current: boolean = false) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Utilisateur non connecté");

            const token = await getIdToken(user);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ processed: !current }),
                }
            );

            if (!res.ok) throw new Error("Erreur API");

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, processed: !current } : n))
            );
        } catch (err) {
            console.error(err);
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
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        onClick={() => handleToggleProcessed(notif.id, notif.processed)}
                                                    >
                                                        {notif.processed ? "Marquer comme non lu" : "Marquer comme lu"}
                                                    </Button>

                                                    {notif.appointmentId && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.push(`/dashboard/appointments/${notif.appointmentId}`)
                                                            }
                                                        >
                                                            Voir RDV
                                                        </Button>
                                                    )}

                                                    {notif.appointmentId &&
                                                        (notif.type === "SHORT_CALL_UNDER_10_MINUTES" ||
                                                            notif.type === "LOW_RATING") && (
                                                            <>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        handleAppointmentAction(notif.appointmentId!, "refuser")
                                                                    }
                                                                >
                                                                    Refuser
                                                                </Button>
                                                                <Button
                                                                    variant="default"
                                                                    onClick={() =>
                                                                        handleAppointmentAction(notif.appointmentId!, "accepter")
                                                                    }
                                                                >
                                                                    Accepter
                                                                </Button>
                                                            </>
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
