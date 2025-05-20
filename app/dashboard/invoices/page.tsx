"use client";

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { fetchInvoices, setFilters, setSearchTerm } from '@/lib/store/slices/invoicesSlice';
import DashboardLayout from '@/components/dashboard/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, FilePdf, Printer, RefreshCw, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

export default function InvoicesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { filteredInvoices, loading, filters, searchTerm, hasMore } = useSelector(
    (state: RootState) => state.invoices
  );
  
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 5000]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch, filters]);

  useEffect(() => {
    dispatch(setFilters({
      amount: {
        min: amountRange[0] > 0 ? amountRange[0] : null,
        max: amountRange[1] < 5000 ? amountRange[1] : null,
      }
    }));
  }, [dispatch, amountRange]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };

  const handleStatusChange = (value: string) => {
    dispatch(setFilters({ 
      status: value as 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled' 
    }));
  };

  const loadMore = () => {
    dispatch(fetchInvoices());
  };

  const refreshData = () => {
    // Clear filters and search
    dispatch(setFilters({ 
      status: 'all', 
      date: { from: null, to: null },
      amount: { min: null, max: null },
      userId: null,
      userType: null,
    }));
    dispatch(setSearchTerm(''));
    setAmountRange([0, 5000]);
    // Re-fetch invoices
    dispatch(fetchInvoices());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'paid':
        return <Badge variant="success">Payée</Badge>;
      case 'overdue':
        return <Badge variant="destructive">En retard</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des Factures</h1>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
          <CardDescription>
            Consultez et gérez les factures générées sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 gap-4 mb-6">
            <div className={`relative flex-1 transition-all duration-200 ${
              isSearchFocused ? 'md:flex-[0_0_40%]' : ''
            }`}>
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <Select
                value={filters.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="w-[200px]">
                <div className="text-xs text-muted-foreground mb-2">
                  Montant: {amountRange[0]}€ - {amountRange[1] === 5000 ? "5000€+" : `${amountRange[1]}€`}
                </div>
                <Slider
                  value={amountRange}
                  min={0}
                  max={5000}
                  step={100}
                  onValueChange={setAmountRange as any}
                />
              </div>
              
              <Button variant="outline" size="icon" onClick={refreshData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Professionnel</TableHead>
                  <TableHead>Date d'émission</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredInvoices.length === 0 ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-muted animate-pulse rounded float-right" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.number}</TableCell>
                      <TableCell>{invoice.clientName || '—'}</TableCell>
                      <TableCell>{invoice.proName || '—'}</TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{invoice.total.toLocaleString()}€</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <FilePdf className="h-4 w-4" />
                            <span className="sr-only">PDF</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Imprimer</span>
                          </Button>
                          <Button variant="ghost" size="sm">
                            Détails
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button 
                onClick={loadMore} 
                variant="outline"
                disabled={loading}
              >
                {loading ? 'Chargement...' : 'Charger plus'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}