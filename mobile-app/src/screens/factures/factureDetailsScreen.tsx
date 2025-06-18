import React from "react";
import { Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../../types/RootStackParamList";
import GoBack from "../../components/common/GoBack";
import UserInitials from "../../components/elements/users/UserInitials";

type FactureDetailsScreenProps = RouteProp<RootStackParamList, 'FactureDetailsScreen'>;

const formatDateString = (dateString: string | Date, format?: Intl.DateTimeFormatOptions): string => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString('fr-FR', {
        ...(format ? format : {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    });
};

// Fonction pour formater les dates Firebase
const formatFirebaseDate = (timestamp: any, format?: Intl.DateTimeFormatOptions): string => {
    try {
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('fr-FR', {
            ...(format ? format : {
                weekday: 'long',
                day: 'numeric',
                month: 'long',  
                year: 'numeric',
            })
        });
    } catch (error) {
        return 'Date non disponible';
    }
};

// Fonction pour télécharger la facture
const downloadFacture = async (fileUrl: string, invoiceNumber: string) => {
    console.log("Téléchargement de la facture:", invoiceNumber);
    try {
        if (fileUrl) {
            // Ouvrir le PDF dans le navigateur ou une app externe
            await Linking.openURL(fileUrl);
        } else {
            Alert.alert('Erreur', 'Lien de téléchargement non disponible.');
        }
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        Alert.alert('Erreur', 'Impossible de télécharger la facture. Veuillez réessayer plus tard.');
    }
};

export default function FactureDetailsScreen() {
    const route = useRoute<FactureDetailsScreenProps>();
    const { facture } = route.params;
    
    console.log('Données facture:', facture);
    
    // Récupération des données avec gestion des cas null
    const invoice = facture.invoice;
    const appointment = facture.appointment;
    const otherUser = facture.otherUser;
    const service = facture.service;

    return (
        <ScrollView className="flex-1 pt-12 px-2.5 bg-background flex-col">
            <View className="w-full flex-row justify-between items-center">
                <GoBack />
                <Text className="text-muted text-xl font-bold m-auto">
                    Facture {invoice?.invoiceNumber || 'N/A'}
                </Text>
            </View>

            {/* RÉSUMÉ */}
            <View className="mt-10">
                <Text className="text-muted-disabled text-[15px] font-bold mb-2">RÉSUMÉ</Text>
                <View className="p-4 bg-accent rounded-[20px] flex-row" style={{
                    shadowColor: '#00000005',
                    shadowOffset: { width: 0, height: 5 },
                    shadowRadius: 20,
                    elevation: 8,
                }}>
                    <View className="w-[70%] flex-col">
                        <Text className="text-base">Facture {invoice?.invoiceNumber || 'N/A'}</Text>
                        <Text className="text-base font-bold capitalize">
                            {invoice?.createdAt ? 
                                formatFirebaseDate(invoice.createdAt, {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                }) : 'Date non disponible'
                            }
                        </Text>
                    </View>
                    <View className="w-[30%] flex-col">
                        <Text className="text-base">Total</Text>
                        <Text className="text-base font-bold capitalize">
                            {appointment?.montantTotal ? `${(appointment.montantTotal / 100).toFixed(2)}€` : 'N/A'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* PRESTATAIRE */}
            <View className="mt-8">
                <Text className="text-muted-disabled text-[15px] font-bold mb-2">
                    {invoice?.userRole === 'PRO' ? 'CLIENT' : 'PRESTATAIRE'}
                </Text>
                <View className="p-4 bg-accent rounded-[20px] flex-row" style={{
                    shadowColor: '#00000005',
                    shadowOffset: { width: 0, height: 5 },
                    shadowRadius: 20,
                    elevation: 8,
                }}>
                    <View className="flex-row items-center justify-between flex-1">
                        <View className="rounded-full h-[60] w-[60] border-[0.5px] border-muted/[5%] items-center justify-center">
                            {otherUser?.photoUrl ? (
                                <Image src={otherUser.photoUrl} className="rounded-full h-[55] w-[55]" />
                            ) : (
                                <UserInitials 
                                    nom={otherUser?.nom || ''} 
                                    prenom={otherUser?.prenom || ''} 
                                />
                            )}
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-base text-muted font-bold">
                                {otherUser ? `${otherUser.prenom} ${otherUser.nom}` : 'Utilisateur inconnu'}
                            </Text>
                            <Text className="text-base text-muted font-normal">
                                {service?.name || 'Service non spécifié'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* DESCRIPTION DU SERVICE */}
            {appointment && (
                <View className="mt-8">
                    <Text className="text-muted-disabled text-[15px] font-bold mb-2">DESCRIPTION</Text>
                    <View className="p-4 bg-accent rounded-[20px] flex-row" style={{
                        shadowColor: '#00000005',
                        shadowOffset: { width: 0, height: 5 },
                        shadowRadius: 20,
                        elevation: 8,
                    }}>
                        <View className="w-[70%] flex-col">
                            <Text className="text-base">
                                Consultation {appointment.duration} min
                            </Text>
                            <Text className="text-base font-bold capitalize">
                                {formatFirebaseDate(appointment.dateTime, {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: '2-digit',
                                })} - {appointment.timeSlot}
                            </Text>
                        </View>
                        <View className="w-[30%] flex-col">
                            <Text className="text-base">Prix HT</Text>
                            <Text className="text-base font-bold capitalize">
                                {(appointment.montantHT / 100).toFixed(2)}€
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* DÉTAILS MONTANT */}
            <View className="mt-8">
                <Text className="text-muted-disabled text-[15px] font-bold mb-2">DÉTAILS MONTANT</Text>
                <View className="p-4 bg-accent rounded-[20px]" style={{
                    shadowColor: '#00000005',
                    shadowOffset: { width: 0, height: 5 },
                    shadowRadius: 20,
                    elevation: 8,
                }}>
                    {appointment && (
                        <>
                            {/* Montant HT */}
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-base">Montant HT</Text>
                                <Text className="text-base font-bold">{(appointment.montantHT / 100).toFixed(2)}€</Text>
                            </View>
                            
                            {/* TVA */}
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-base">TVA (20%)</Text>
                                <Text className="text-base font-bold">
                                    {((appointment.montantTotal - appointment.montantHT) / 100).toFixed(2)}€
                                </Text>
                            </View>
                            
                           
                            
                            {/* Ligne de séparation */}
                            <View className="border-t border-gray-200 my-3" />
                            
                            {/* Total */}
                            <View className="flex-row justify-between">
                                <Text className="text-lg font-bold">Total TTC</Text>
                                <Text className="text-lg font-bold">{(appointment.montantTotal / 100).toFixed(2)}€</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* INFORMATIONS FACTURE */}
            <View className="mt-8">
                <Text className="text-muted-disabled text-[15px] font-bold mb-2">INFORMATIONS</Text>
                <View className="p-4 bg-accent rounded-[20px]" style={{
                    shadowColor: '#00000005',
                    shadowOffset: { width: 0, height: 5 },
                    shadowRadius: 20,
                    elevation: 8,
                }}>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base">Numéro de facture</Text>
                        <Text className="text-base font-bold">{invoice?.invoiceNumber || 'N/A'}</Text>
                    </View>
                    
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base">Date de création</Text>
                        <Text className="text-base font-bold">
                            {invoice?.createdAt ? 
                                formatFirebaseDate(invoice.createdAt, {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                }) : 'N/A'
                            }
                        </Text>
                    </View>
                    
                </View>
            </View>

            {/* BOUTON TÉLÉCHARGER */}
            <View className="my-10 mb-20">
                <TouchableOpacity 
                    className="rounded-[30px] bg-secondary h-[60px] items-center justify-center w-full"
                    onPress={() => downloadFacture(invoice?.fileUrl || '', invoice?.invoiceNumber || '')}
                >
                    <View className="flex-row items-center">
                        <Icon name="download-outline" size={20} color="#FFFFFF" className="mr-2" />
                        <Text className="text-accent font-bold ml-2">TÉLÉCHARGER LA FACTURE</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}