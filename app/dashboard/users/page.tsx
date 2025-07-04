"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  fetchUsers,
  setFilters,
  setSearchTerm,
  deleteUser,
} from "@/lib/store/slices/usersSlice";
import DashboardLayout from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Trash2 } from "lucide-react";

export default function UsersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { filteredUsers, loading, searchTerm, hasMore, didFetch, error } =
    useSelector((state: RootState) => state.users);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortRole, setSortRole] = useState("all");
  useEffect(() => {
    if (!didFetch) {
      dispatch(fetchUsers());
    }
  }, [dispatch, didFetch]);

  // Pour charger plus d’utilisateurs
  const loadMore = () => {
    dispatch(fetchUsers());
  };

  // Réinitialiser recherche et filtres
  const refreshData = () => {
    dispatch(setFilters({ type: "all" }));
    dispatch(setSearchTerm(""));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };

  // Suppression d’un utilisateur avec confirmation
  const handleDelete = (userId: string, userName: string) => {
    if (
      window.confirm(
        `Voulez-vous vraiment supprimer l'utilisateur ${userName} ?`
      )
    ) {
      dispatch(deleteUser(userId))
        .unwrap()
        .then(() => {
          alert("Utilisateur supprimé avec succès.");
        })
        .catch((err) => {
          alert("Erreur lors de la suppression : " + err);
        });
    }
  };
  const sortedUsers =
    sortRole === "all"
      ? filteredUsers
      : filteredUsers.filter((user) =>
        sortRole === "professional"
          ? user.type === "professional"
          : user.type !== "professional"
      );
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Gestion des Utilisateurs
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            Gérez les particuliers et professionnels inscrits sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div
              className={`relative flex-1 transition-all duration-200 ${isSearchFocused ? "md:flex-[0_0_60%]" : ""
                }`}
            >
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
            <div className="flex gap-2">
              <label htmlFor="sort-role" className="text-sm font-medium flex items-center">
                Trier par rôle :
                <select
                  id="sort-role"
                  className="ml-2 border rounded px-2 py-2 text-sm"
                  value={sortRole}
                  onChange={(e) => setSortRole(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="professional">Professionnel</option>
                  <option value="particular">Particulier</option>
                </select>
              </label>
            </div>
            <Button variant="outline" size="icon" onClick={refreshData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredUsers.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-10 bg-gray-300 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center gap-3">
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={`${user.prenom} ${user.name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white">
                            {user.prenom[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <div>
                            {user.prenom} {user.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.type === "professional"
                              ? "bg-blue-600 text-white"
                              : "bg-green-700 text-white"
                          }
                        >
                          {user.type === "professional" ? "Professionnel" : "Particulier"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete(user.id, `${user.prenom} ${user.name}`)
                          }
                          disabled={loading}
                          aria-label={`Supprimer ${user.prenom} ${user.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore && !loading && filteredUsers.length > 0 && (
            <div className="mt-4 text-center">
              <Button onClick={loadMore}>Charger plus</Button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-red-600">Erreur: {error}</p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
