"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuth } from "firebase/auth";

interface User {
  nom: string;
  prenom: string;
  email: string;
}

interface Appointment {
  id: string;
  clientId: string;
  proId: string;
  dateTime: any;
  duration: number;
  montantHT: number;
  montantTotal: number;
  status: string;
  stripePaymentIntentId?: string;
  timeSlot: string;
}

export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [pro, setPro] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);
      setError(null);

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("Utilisateur non authentifié");
        const token = await user.getIdToken();

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Accès refusé ou erreur serveur');
        }

        const data = await res.json();

        setAppointment(data.appointment);
        setClient(data.client);
        setPro(data.pro);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError(String(e));
        }
      }

      setLoading(false);
    };

    if (id) fetchData();
  }, [id]);


  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-center mt-10">Chargement du rendez-vous...</p>
      </DashboardLayout>
    );
  }

  if (notFound || !appointment) {
    return (
      <DashboardLayout>
        <p className="text-center mt-10 text-red-500">
          Rendez-vous introuvable.
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Détail du rendez-vous
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rendez-vous #{appointment.id}</CardTitle>
          <CardDescription>
            Prévu le {new Date(appointment.dateTime).toLocaleString("fr-FR")}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div>
            <h3 className="font-semibold">Client</h3>
            {client ? (
              <>
                <p>
                  {client.prenom} {client.nom}
                </p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold">Professionnel</h3>
            {pro ? (
              <>
                <p>
                  {pro.prenom} {pro.nom}
                </p>
                <p className="text-sm text-muted-foreground">{pro.email}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold">Détails</h3>
            <ul className="text-sm">
              <li>Durée : {appointment.duration} minutes</li>
              <li>Heure : {appointment.timeSlot}</li>
              <li>Montant HT : {(appointment.montantHT / 100).toFixed(2)} €</li>
              <li>
                Montant TTC : {(appointment.montantTotal / 100).toFixed(2)} €
              </li>
              <li>
                Statut :
                <Badge variant="outline" className="ml-2">
                  {appointment.status}
                </Badge>
              </li>
              {appointment.stripePaymentIntentId && (
                <li>
                  Paiement Stripe :
                  <a
                    href={`https://dashboard.stripe.com/test/payments/${appointment.stripePaymentIntentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 ml-2 underline"
                  >
                    Voir dans Stripe
                  </a>
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function setError(arg0: null) {
  throw new Error("Function not implemented.");
}
