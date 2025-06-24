import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Animated,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/RootStackParamList';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import UserInitials from '../../components/elements/users/UserInitials';
import { Appointment } from '../../store/appointments/types';
import { showToast } from '../../utils/toastNotification';
import axiosInstance from '../../config/axiosInstance';
import { goBack, reset } from '../../services/navigationService';
import { StripeError } from '../../types/StripeError';
import { getStripeErrorMessage } from '../../utils/stripeErrorHandler';

export default function PaymentScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'Payment'>>();
    const { appointment, proInfo } = route.params;

    const [cardDetails, setCardDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [createdAppointment, setCreatedAppointment] = useState<Appointment>();
    const [cardAnimation] = useState(new Animated.Value(0));

    const currentUser = useSelector((state: RootState) => state.auth.user);
    const { confirmPayment } = useStripe();

    if (!currentUser) {
        return null;
    }

    useEffect(() => {
        createAppointmentOnServer();
        // Animation d'entrée de la carte
        Animated.timing(cardAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const createAppointmentOnServer = async () => {
        try {
            setIsLoading(true);
            const response = await axiosInstance.post('/appointments', {
                proId: proInfo.id,
                dateTime: appointment.dateTime.toDate(),
                duration: appointment.duration,
                timeSlot: appointment.timeSlot,
            });
            setClientSecret(response.data.data.clientSecret);
            setCreatedAppointment(response.data.data.appointment);

        } catch (error : any) {
            console.error(error);
            goBack();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!cardDetails?.complete || !clientSecret) {
            showToast("Veuillez compléter les informations de votre carte", 'Veuillez remplir les champs de la carte', 'error')
            return;
        }
        try {
            setIsProcessing(true);

            const { error, paymentIntent } = await confirmPayment(clientSecret, {
                paymentMethodType: 'Card',
                paymentMethodData: {
                    billingDetails: {
                        name: `${currentUser.prenom} ${currentUser.nom}`,
                        email: currentUser.email,
                    },
                },
            });

            if (error) {
                const stripeError = error as StripeError;
                getStripeErrorMessage(stripeError);
                return;
            }

            if (paymentIntent?.status === 'RequiresCapture') {
                await axiosInstance.patch(`/appointments/${createdAppointment?.id}/payment/authorize`);
                showToast("Succès", "Votre paiement a été autorisé. Il sera débité une fois que le professionnel confirmera votre rendez-vous.", "success");
                reset('ValidationScreen', {
                    info: {
                        title: "Paiement autorisé",
                        subtitle: "Votre paiement a été autorisé. Il sera débité une fois que le professionnel confirmera votre rendez-vous.",
                        actionText: "Continuer",
                        to: "Home"
                    }
                });
            }
            else {
                showToast("Statut de paiement inattendu", "Veuillez contacter le support.", "error")
            }
        } catch (error: any) {
            showToast("Erreur lors du paiement", "Veuillez réessayer plus tard", "error")
        } finally {
            setIsProcessing(false);
        }
    };



    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF5722" />
                    <Text style={styles.loadingText}>Préparation du paiement...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
               

                {/* Appointment Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.sectionTitle}>Récapitulatif du rendez-vous</Text>

                    <View style={styles.proInfo}>
                        <UserInitials
                            nom={proInfo.prenom}
                            prenom={proInfo.nom}
                        />
                        <View style={styles.proDetails}>
                            <Text style={styles.proName}>
                                {proInfo.prenom} {proInfo.nom}
                            </Text>
                            <Text style={styles.proService}>{proInfo.serviceInfo?.name}</Text>
                        </View>
                    </View>

                    <View style={styles.appointmentDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📅 Date et heure:</Text>
                            <Text style={styles.detailValue}>
                                {appointment.dateTime.toDate().toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })} à {appointment.timeSlot}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>⏱️ Durée:</Text>
                            <Text style={styles.detailValue}>{appointment.duration} minutes</Text>
                        </View>
                    </View>
                </View>

                {/* Payment Details */}
                <View style={styles.paymentCard}>
                    <Text style={styles.sectionTitle}>💰 Détail du paiement</Text>

                    <View style={styles.priceBreakdown}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>
                                Consultation ({appointment.duration} min)
                            </Text>
                            <Text style={styles.priceValue}>
                                {(createdAppointment?.montantHT! / 100).toFixed(2)} €
                            </Text>
                        </View>

                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>TVA (20%)</Text>
                            <Text style={styles.priceValue}>
                                {((createdAppointment?.montantTotal! - createdAppointment?.montantHT!) / 100).toFixed(2)} €
                            </Text>
                        </View>

                        <View style={[styles.priceRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total à autoriser</Text>
                            <Text style={styles.totalValue}>
                                {(createdAppointment?.montantTotal! / 100).toFixed(2)} €
                            </Text>
                        </View>
                    </View>

                    <View style={styles.paymentNotice}>
                        <Text style={styles.noticeText}>
                            💡 Votre carte sera autorisée maintenant, mais le débit n'aura lieu
                            qu'après confirmation du rendez-vous par le professionnel.
                        </Text>
                    </View>
                </View>

            
                {/* Card Input */}
                <View style={styles.cardInputCard}>
                    <Text style={styles.sectionTitle}>💳 Informations de paiement</Text>

                    <View style={styles.cardFieldContainer}>
                        <CardField
                            postalCodeEnabled={false}
                            placeholders={{
                                number: '4242 4242 4242 4242',
                                expiration: 'MM/AA',
                                cvc: 'CVC'
                            }}
                            cardStyle={styles.cardStyle}
                            style={styles.cardField}
                            onCardChange={(cardDetails) => {
                                console.log(cardDetails)
                                setCardDetails(cardDetails);
                            }}

                        />
                    </View>

                    <View style={styles.securityInfo}>
                        <Text style={styles.securityText}>
                            🔒 Paiement sécurisé par Stripe SSL 256-bit
                        </Text>
                    </View>
                </View>

                {/* Enhanced Payment Button */}
                <TouchableOpacity
                    style={[
                        styles.payButton,
                        (!cardDetails?.complete || isProcessing) && styles.payButtonDisabled,
                        cardDetails?.complete && !isProcessing && styles.payButtonReady
                    ]}
                    onPress={handlePayment}
                    disabled={!cardDetails?.complete || isProcessing}
                >
                    {isProcessing ? (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={styles.processingText}>Traitement en cours...</Text>
                        </View>
                    ) : (
                        <View style={styles.payButtonContent}>
                            <Text style={styles.payButtonText}>
                                🔐 Autoriser le paiement {(createdAppointment?.montantTotal! / 100).toFixed(2)} €
                            </Text>

                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        🛡️ En continuant, vous acceptez nos conditions d'utilisation et
                        notre politique de confidentialité. Vos données sont protégées.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    backButtonText: {
        fontSize: 16,
        color: '#FF5722',
        fontWeight: '600',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5722',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    proInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    proDetails: {
        marginLeft: 16,
        flex: 1,
    },
    proName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    proService: {
        fontSize: 15,
        color: '#FF5722',
        marginTop: 4,
        fontWeight: '500',
    },
    appointmentDetails: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingTop: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 15,
        color: '#666',
        flex: 1,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        color: '#333',
        flex: 2,
        textAlign: 'right',
        fontWeight: '600',
    },
    paymentCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    priceBreakdown: {
        marginBottom: 20,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: 2,
        borderTopColor: '#FF5722',
        paddingTop: 16,
        marginTop: 12,
        backgroundColor: '#fff8f6',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: -8,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF5722',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FF5722',
    },
    paymentNotice: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
    },
    noticeText: {
        fontSize: 13,
        color: '#1565c0',
        lineHeight: 18,
        fontWeight: '500',
    },
    creditCardContainer: {
        marginHorizontal: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    creditCard: {
        width: '90%',
        height: 200,
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    creditCardFocused: {
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
    },
    cardChip: {
        width: 32,
        height: 24,
        backgroundColor: '#ffd700',
        borderRadius: 4,
        marginBottom: 24,
    },
    cardNumber: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 32,
        fontFamily: 'monospace',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardLabel: {
        fontSize: 10,
        color: '#CCCCCC',
        fontWeight: '600',
        letterSpacing: 1,
    },
    cardValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        marginTop: 4,
    },
    cardLogo: {
        position: 'absolute',
        top: 20,
        right: 24,
    },
    cardLogoText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    cardInputCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    cardFieldContainer: {
        marginBottom: 20,
    },
    cardField: {
        height: 56,
    },
    cardStyle: {
        backgroundColor: '#f8f9fa',
        borderColor: '#E5E5E5',
        borderWidth: 2,
        borderRadius: 12,
        fontSize: 16,
    },
    securityInfo: {
        alignItems: 'center',
        backgroundColor: '#f0f8f0',
        padding: 12,
        borderRadius: 8,
    },
    securityText: {
        fontSize: 13,
        color: '#2e7d32',
        fontWeight: '600',
    },
    payButton: {
        backgroundColor: '#cccccc',
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    payButtonDisabled: {
        backgroundColor: '#cccccc',
        shadowOpacity: 0.1,
    },
    payButtonReady: {
        backgroundColor: '#FF5722',
        shadowColor: '#FF5722',
        shadowOpacity: 0.3,
    },
    payButtonContent: {
        alignItems: 'center',
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    payButtonAmount: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    processingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    footer: {
        padding: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        fontWeight: '500',
    },
});