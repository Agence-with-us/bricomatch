"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { signOut } from "@/lib/store/slices/authSlice";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/components/dashboard/layout";
import { useState } from "react";
import { updateEmail, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AccountPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const [email, setEmail] = useState(user?.email || "");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSignOut = async () => {
        await dispatch(signOut());
        router.push("/login");
    };

    const handleUpdateEmail = async () => {
        setLoading(true);
        setMessage(null);
        try {
            if (auth.currentUser && email) {
                await updateEmail(auth.currentUser, email);
                setMessage("Email mis à jour !");
            }
        } catch (err: any) {
            setMessage(err.message || "Erreur lors de la mise à jour de l'email.");
        }
        setLoading(false);
    };

    const handleUpdatePassword = async () => {
        setLoading(true);
        setMessage(null);
        try {
            if (auth.currentUser && password) {
                await updatePassword(auth.currentUser, password);
                setMessage("Mot de passe mis à jour !");
                setPassword("");
            }
        } catch (err: any) {
            if (err.code === "auth/requires-recent-login") {
                setMessage("Pour changer votre mot de passe, veuillez vous déconnecter puis vous reconnecter.");
            } else {
                setMessage(err.message || "Erreur lors de la mise à jour du mot de passe.");
            }
        }
        setLoading(false);
    };

    if (!user) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <span>Chargement...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-muted">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex flex-col items-center gap-2">
                            <Avatar className="w-16 h-16">
                                <AvatarFallback>
                                    {user.email?.charAt(0).toUpperCase() || "A"}
                                </AvatarFallback>
                            </Avatar>
                            <CardTitle>Mon compte</CardTitle>
                            <CardDescription>Modifier votre email ou mot de passe</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="font-semibold block mb-1">Email</label>
                                <input
                                    type="email"
                                    className="border rounded px-2 py-1 w-full"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                                <Button
                                    className="mt-2 w-full"
                                    onClick={handleUpdateEmail}
                                    disabled={loading || email === user.email}
                                    type="button"
                                >
                                    Mettre à jour l'email
                                </Button>
                            </div>
                            <div>
                                <label className="font-semibold block mb-1">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    className="border rounded px-2 py-1 w-full"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <Button
                                    className="mt-2 w-full"
                                    onClick={handleUpdatePassword}
                                    disabled={loading || !password}
                                    type="button"
                                >
                                    Mettre à jour le mot de passe
                                </Button>
                            </div>
                            {message && (
                                <div className="text-center text-sm mt-2">{message}</div>
                            )}
                        </div>
                        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                            Déconnexion
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}