import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, query, where, orderBy, getDocs, getDoc, doc } from 'firebase/firestore';
import { RootState } from '../../store/store';
import { Appointment } from '../../store/appointments/types';
import { Service } from '../../store/services/types';
import { firestore } from '../../config/firebase.config';
import { UserRole } from '../../store/users/types';
import { navigate } from '../../services/navigationService';
import LogoSpinner from '../../components/common/LogoSpinner';

// Type pour les factures
interface Invoice {
  id: string;
  appointmentId: string;
  createdAt: any;
  fileUrl: string;
  invoiceNumber: string;
  platformFee: number;
  userId: string;
  userRole: string;
}

// Composant principal
const FacturesScreen = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { services } = useSelector((state: RootState) => state.services);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointmentsCache, setAppointmentsCache] = useState({});
  const [userInfoCache, setUserInfoCache] = useState({});

  const [factures, setFactures] = useState<Array<{
    invoice: Invoice;
    appointment: Appointment | null;
    otherUser: any | null;
    service: Service | null;
  }>>([]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error("Utilisateur non connecté");
        return;
      }

      // Créer une requête pour récupérer les factures de l'utilisateur connecté
      const invoicesQuery = query(
        collection(firestore, 'invoices'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const invoicesData = [];

      // Récupérer les données des factures
      for (const docSnap of querySnapshot.docs) {
        const invoice = {
          id: docSnap.id,
          ...docSnap.data()
        } as Invoice;

        // Récupérer les informations du rendez-vous associé si pas déjà en cache
        if (invoice.appointmentId && !appointmentsCache[invoice.appointmentId]) {
          try {
            const appointmentDoc = await getDoc(doc(firestore, 'appointments', invoice.appointmentId));
            if (appointmentDoc.exists()) {
              const appointmentData = {
                id: appointmentDoc.id,
                ...appointmentDoc.data()
              } as Appointment;

              setAppointmentsCache(prev => ({
                ...prev,
                [invoice.appointmentId]: appointmentData
              }));

              // Récupérer les informations de l'autre utilisateur (pro ou client)
              const otherUserId = user.role === UserRole.PRO ? appointmentData.clientId : appointmentData.proId;

              if (otherUserId && !userInfoCache[otherUserId]) {
                try {
                  const userDoc = await getDoc(doc(firestore, 'users', otherUserId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();

                    setUserInfoCache(prev => ({
                      ...prev,
                      [otherUserId]: {
                        ...userData,
                        nom: userData.nom,
                        prenom: userData.prenom,
                        photoUrl: userData.photoUrl,
                        serviceInfo: services?.find(({ id }) => id === userData.serviceTypeId)
                      }
                    }));
                  }
                } catch (error) {
                  console.error("Erreur lors de la récupération des informations utilisateur:", error);
                }
              }
            }
          } catch (error) {
            console.error("Erreur lors de la récupération du rendez-vous:", error);
          }
        }

        invoicesData.push(invoice);
      }

      setInvoices(invoicesData);
    } catch (error) {
      console.error("Erreur lors du chargement des factures:", error);
      Alert.alert("Erreur", "Impossible de charger vos factures");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialiser les factures au chargement
  useEffect(() => {
    loadInvoices();
  }, [user]);

  // Préparer les données des factures
  useEffect(() => {
    if (invoices && invoices.length > 0) {
      // Transformer les factures avec les informations supplémentaires
      const facturesData = invoices.map(invoice => {
        // Récupérer le rendez-vous associé depuis le cache
        const appointment = appointmentsCache[invoice.appointmentId] || null;

        let otherUser = null;
        let service = null;

        if (appointment) {
          // Déterminer l'ID de l'autre utilisateur
          const otherUserId = user.role === UserRole.PRO ? appointment.clientId : appointment.proId;

          // Récupérer les informations de l'autre utilisateur depuis le cache
          otherUser = userInfoCache[otherUserId] || null;

          // Récupérer les informations du service
          if (otherUser && otherUser.serviceInfo) {
            service = otherUser.serviceInfo;
          } else if (user.role === UserRole.PARTICULIER && user.serviceTypeId) {
            service = services.find(s => s.id === user.serviceTypeId) || null;
          }
        }

        return {
          invoice,
          appointment,
          otherUser,
          service
        };
      });

      setFactures(facturesData);
    }
  }, [invoices, appointmentsCache, userInfoCache, user, services]);

  // Fonction pour naviguer vers le détail de la facture
  const navigateToFactureDetail = (factureData: {
    invoice: Invoice;
    appointment: Appointment | null;
    otherUser: any | null;
    service: Service | null;
  }) => {
    navigate('FactureDetailsScreen', { facture: factureData });
  };

  // Formatage de la date
  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date non disponible';
    }
  };

  // Fonction pour rafraîchir les données
  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  // Fonction pour télécharger la facture PDF
  const downloadInvoice = (fileUrl: string, invoiceNumber: string) => {
      Linking.openURL(fileUrl);
   
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF5722"]} />
      }
    >
      <View className="flex-1 px-6">
        {/* Contenu principal */}
        <View className="w-full mt-6">
          <Text className="text-2xl text-muted font-bold mb-6">Historique des factures</Text>

          {factures.length > 0 ? (
            <View className="space-y-4">
              {factures.map((factureData, index) => (
                <TouchableOpacity
                  key={factureData.invoice.id || index}
                  onPress={() => navigateToFactureDetail(factureData)}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                  activeOpacity={0.7}
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-muted">
                        {factureData.invoice.invoiceNumber}
                      </Text>
                      
                    
                      {factureData.otherUser && (
                        <Text className="text-gray-600 mt-1">
                          {user?.role === UserRole.PRO ? 'Client' : 'Professionnel'}: {factureData.otherUser.prenom} {factureData.otherUser.nom}
                        </Text>
                      )}
                      
                      <Text className="text-gray-500 text-sm mt-1">
                        Créée le {formatDate(factureData.invoice.createdAt)}
                      </Text>
                      
                      {factureData.appointment && (
                        <Text className="text-gray-500 text-sm mt-1">
                          RDV: {formatDate(factureData.appointment.dateTime)} - {factureData.appointment.timeSlot}
                        </Text>
                      )}
                      
  
                    </View>

                    <View className="flex-row items-center space-x-2">
                      {/* Bouton de téléchargement PDF */}
                      <TouchableOpacity
                        onPress={() => downloadInvoice(factureData.invoice.fileUrl, factureData.invoice.invoiceNumber)}
                        className="bg-orange-500 rounded-lg p-2"
                        activeOpacity={0.7}
                      >
                        <Icon name="download-outline" size={20} color="white" />
                      </TouchableOpacity>
                      
                      {/* Flèche pour voir les détails */}
                      <Icon name="chevron-forward" size={20} color="#CCCCCC" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-10">
              <Icon name="document-text-outline" size={64} color="#CCCCCC" />
              <Text className="text-gray-500 mt-4 text-center">
                Vous n'avez pas encore de factures.{'\n'}
                Les factures apparaîtront ici lorsqu'elles seront générées.
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <LogoSpinner
        visible={loading}
        message="Chargement des factures..."
        rotationDuration={1500}
      />
    </ScrollView>
  );
};

export default FacturesScreen;