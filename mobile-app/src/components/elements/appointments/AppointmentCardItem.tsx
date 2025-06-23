// AppointmentCardItem.tsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppointmentStatus, AppointmentWithOtherUserInfo } from '../../../store/appointments/types';
import UserInitials from '../users/UserInitials';
import { UserLocal, UserRole } from '../../../store/users/types';
import { navigate } from '../../../services/navigationService';
import { formatDateTimeFromTimeStamp, formatTimeRangeFromTimestamp } from '../../../utils/appointmentUtils';
import { User } from '../../../store/authentification/types';

// Définition des props du composant
interface AppointmentCardItemProps {
    appointmentWithOtherUser: AppointmentWithOtherUserInfo;
    currentUser?: User;
    joinVideoCall: (appointment: AppointmentWithOtherUserInfo) => void;
    cancelAppointment: (appointmentId: string) => void;
    confirmAppointment: (appointmentId: string) => void;
}

const AppointmentCardItem: React.FC<AppointmentCardItemProps> = ({
    appointmentWithOtherUser,
    currentUser,
    joinVideoCall,
    cancelAppointment,
    confirmAppointment,
}) => {

    const getStatusInfo = () => {
        const status = appointmentWithOtherUser.appointment.status;
        const isClient = currentUser?.role === UserRole.PARTICULIER;
        const isPro = currentUser?.role === UserRole.PRO;

        switch (status) {
            case AppointmentStatus.PAYMENT_AUTHORIZED:
                if (isClient) {
                    return {
                        message: "En attente de confirmation par le professionnel",
                        messageStyle: styles.pendingMessage,
                        iconName: "time-outline" as const,
                        iconColor: "#FF9800"
                    };
                }
                return null;

            case AppointmentStatus.CONFIRMED:
                return {
                    message: "Rendez-vous confirmé",
                    messageStyle: styles.confirmedMessage,
                    iconName: "checkmark-circle-outline" as const,
                    iconColor: "#4CAF50"
                };

            case AppointmentStatus.COMPLETED:
                return {
                    message: "Rendez-vous terminé",
                    messageStyle: styles.completedMessage,
                    iconName: "checkmark-done-outline" as const,
                    iconColor: "#2196F3"
                };

            case AppointmentStatus.CANCELLED_BY_CLIENT:
                if (isPro) {
                    return {
                        message: "Le client a annulé ce rendez-vous",
                        messageStyle: styles.cancelledMessage,
                        iconName: "close-circle-outline" as const,
                        iconColor: "#F44336"
                    };
                } else {
                    return {
                        message: "Vous avez annulé ce rendez-vous",
                        messageStyle: styles.cancelledMessage,
                        iconName: "close-circle-outline" as const,
                        iconColor: "#F44336"
                    };
                }

            case AppointmentStatus.CANCELLED_BY_PRO:
                if (isClient) {
                    return {
                        message: "Le professionnel a annulé ce rendez-vous",
                        messageStyle: styles.cancelledMessage,
                        iconName: "close-circle-outline" as const,
                        iconColor: "#F44336"
                    };
                } else {
                    return {
                        message: "Vous avez annulé ce rendez-vous",
                        messageStyle: styles.cancelledMessage,
                        iconName: "close-circle-outline" as const,
                        iconColor: "#F44336"
                    };
                }

            case AppointmentStatus.CANCELLED_BY_PRO_PENDING:
                if (isPro) {
                    return {
                        message: "Annulation en attente de validation par un administrateur",
                        messageStyle: styles.pendingMessage,
                        iconName: "hourglass-outline" as const,
                        iconColor: "#FF9800"
                    };
                }
                return null;

            default:
                return null;
        }
    };

    const getAvailableActions = () => {
        const status = appointmentWithOtherUser.appointment.status;
        const isClient = currentUser?.role === UserRole.PARTICULIER;
        const isPro = currentUser?.role === UserRole.PRO;
        const isPastAppointment = appointmentWithOtherUser.timeStatus === "past";

        const actions = {
            canJoin: false,
            canCancel: false,
            canConfirm: false
        };

        // Action REJOINDRE LA VISIO
        if (appointmentWithOtherUser.isOngoing && status === AppointmentStatus.CONFIRMED) {
            actions.canJoin = true;
        }

        // Action ANNULER
        if (!isPastAppointment) {
            if (status === AppointmentStatus.PAYMENT_AUTHORIZED) {
                actions.canCancel = true; // Les deux peuvent annuler
            } else if (status === AppointmentStatus.CONFIRMED) {
                actions.canCancel = true; // Les deux peuvent annuler
            }
        }

        // Action CONFIRMER (uniquement pour les PRO)
        if (isPro && status === AppointmentStatus.PAYMENT_AUTHORIZED) {
            actions.canConfirm = true;
        }

        return actions;
    };

    const statusInfo = getStatusInfo();
    const actions = getAvailableActions();


    return (
        <View style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
                <View style={styles.userInfoContainer}>
                    <View style={styles.avatarContainer}>
                        {appointmentWithOtherUser.otherUser?.photoUrl ? (
                            <Image
                                source={{ uri: appointmentWithOtherUser.otherUser.photoUrl }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <UserInitials
                                nom={appointmentWithOtherUser.otherUser.nom}
                                prenom={appointmentWithOtherUser.otherUser.prenom}
                            />
                        )}
                    </View>
                    <View style={styles.userTextContainer}>
                        <Text style={styles.userName}>
                            {appointmentWithOtherUser.otherUser.nom}{' '}
                            {appointmentWithOtherUser.otherUser.prenom}
                        </Text>
                        <Text style={styles.userProfession}>
                            {appointmentWithOtherUser.otherUser?.serviceInfo?.name ? 
                                appointmentWithOtherUser.otherUser?.serviceInfo?.name : "Particulier"}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.forwardButton}
                    onPress={() => {
                        currentUser?.role === UserRole.PARTICULIER && navigate('FicheProfessionnel', {
                            professionnel: appointmentWithOtherUser.otherUser as UserLocal,
                        });
                    }}
                >
                    <Ionicons name="chevron-forward" size={24} color="#FF5722" />
                </TouchableOpacity>
            </View>

            <View style={styles.appointmentDetails}>
                <Text style={styles.appointmentDate}>
                    {formatDateTimeFromTimeStamp(appointmentWithOtherUser.appointment.dateTime)}
                </Text>
                <View style={styles.timeSlotContainer}>
                    <Text style={styles.timeSlot}>
                        {formatTimeRangeFromTimestamp(
                            appointmentWithOtherUser.appointment.dateTime, 
                            appointmentWithOtherUser.appointment.duration
                        )}
                    </Text>
                </View>
            </View>

            {/* Affichage du statut */}
            {statusInfo && (
                <View style={styles.statusContainer}>
                    <Ionicons 
                        name={statusInfo.iconName} 
                        size={18} 
                        color={statusInfo.iconColor} 
                        style={styles.statusIcon}
                    />
                    <Text style={statusInfo.messageStyle}>
                        {statusInfo.message}
                    </Text>
                </View>
            )}

            {/* Actions disponibles */}
            <View style={styles.appointmentActions}>
                {actions.canJoin && (
                    <TouchableOpacity
                        style={styles.joinButton}
                        onPress={() => joinVideoCall(appointmentWithOtherUser)}
                    >
                        <Text style={styles.joinButtonText}>REJOINDRE LA VISIO</Text>
                    </TouchableOpacity>
                )}

                {actions.canConfirm && (
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => confirmAppointment(appointmentWithOtherUser.appointment.id!)}
                    >
                        <Text style={styles.confirmButtonText}>Confirmer</Text>
                    </TouchableOpacity>
                )}

                {actions.canCancel && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => cancelAppointment(appointmentWithOtherUser.appointment.id!)}
                    >
                        <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    appointmentCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginVertical: 8,
        marginHorizontal: 16,
        elevation: 3,
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 10,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userTextContainer: {},
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userProfession: {
        fontSize: 14,
        color: '#666',
    },
    timeSlotContainer: {
        backgroundColor: '#ffff',
        borderRadius: 15,
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: "#f95200"
    },
    timeSlot: {
        color: '#f95200',
        fontSize: 14,
        fontWeight: '500',
    },
    forwardButton: {
        backgroundColor: '#f7f0eb',
        padding: 8,
        borderRadius: 20,
    },
    appointmentDetails: {
        marginTop: 12,
    },
    appointmentDate: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
    },
    statusIcon: {
        marginRight: 8,
    },
    pendingMessage: {
        fontSize: 14,
        color: '#FF9800',
        fontWeight: '500',
        flex: 1,
    },
    confirmedMessage: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
        flex: 1,
    },
    completedMessage: {
        fontSize: 14,
        color: '#2196F3',
        fontWeight: '500',
        flex: 1,
    },
    cancelledMessage: {
        fontSize: 14,
        color: '#F44336',
        fontWeight: '500',
        flex: 1,
    },
    appointmentActions: {
        flexDirection: 'row',
        marginTop: 15,
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
    },
    joinButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginRight: 8,
        marginBottom: 5,
    },
    joinButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    cancelButton: {
        backgroundColor: '#F44336',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginRight: 8,
        marginBottom: 5,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    confirmButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginRight: 8,
        marginBottom: 5,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default AppointmentCardItem;