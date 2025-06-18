import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

interface ToastModalProps {
    visible: boolean;
    type: ToastType;
    title?: string;
    message: string;
    onClose?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    showButtons?: boolean;
}

const ToastModal: React.FC<ToastModalProps> = ({
    visible,
    type,
    title,
    message,
    onClose,
    onConfirm,
    onCancel,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    showButtons = false,
}) => {

    const getModalConfig = () => {
        switch (type) {
            case 'success':
                return {
                    backgroundColor: '#d4edda',
                    borderColor: '#c3e6cb',
                    iconColor: '#155724',
                    textColor: '#155724',
                    iconName: 'check-circle',
                    defaultTitle: 'Succès'
                };
            case 'error':
                return {
                    backgroundColor: '#f8d7da',
                    borderColor: '#f5c6cb',
                    iconColor: '#721c24',
                    textColor: '#721c24',
                    iconName: 'error',
                    defaultTitle: 'Erreur'
                };
            case 'warning':
                return {
                    backgroundColor: '#fff3cd',
                    borderColor: '#ffeaa7',
                    iconColor: '#856404',
                    textColor: '#856404',
                    iconName: 'warning',
                    defaultTitle: 'Attention'
                };
            case 'info':
                return {
                    backgroundColor: '#d1ecf1',
                    borderColor: '#bee5eb',
                    iconColor: '#0c5460',
                    textColor: '#0c5460',
                    iconName: 'info',
                    defaultTitle: 'Information'
                };
            case 'confirmation':
                return {
                    backgroundColor: '#e2e3e5',
                    borderColor: '#d6d8db',
                    iconColor: '#383d41',
                    textColor: '#383d41',
                    iconName: 'help',
                    defaultTitle: 'Confirmation'
                };
            default:
                return {
                    backgroundColor: '#f8f9fa',
                    borderColor: '#dee2e6',
                    iconColor: '#6c757d',
                    textColor: '#6c757d',
                    iconName: 'notifications',
                    defaultTitle: 'Notification'
                };
        }
    };

    const config = getModalConfig();
    const modalTitle = title || config.defaultTitle;

    const handleConfirm = () => {
        onConfirm?.();
        onClose?.();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose?.();
    };

    const handleBackdropPress = () => {
        if (!showButtons) {
            onClose?.();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={handleBackdropPress}
            >
                <View style={styles.container}>
                    <TouchableOpacity activeOpacity={1}>
                        <View style={[
                            styles.modal,
                            {
                                backgroundColor: config.backgroundColor,
                                borderColor: config.borderColor,
                            }
                        ]}>
                            {/* Header avec icône et titre */}
                            <View style={styles.header}>
                                <Icon
                                    name={config.iconName}
                                    size={24}
                                    color={config.iconColor}
                                    style={styles.icon}
                                />
                                <Text style={[styles.title, { color: config.textColor }]}>
                                    {modalTitle}
                                </Text>
                            </View>

                            {/* Message */}
                            <Text style={[styles.message, { color: config.textColor }]}>
                                {message}
                            </Text>

                            {/* Boutons */}
                            {showButtons ? (
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.cancelButton]}
                                        onPress={handleCancel}
                                    >
                                        <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.confirmButton]}
                                        onPress={handleConfirm}
                                    >
                                        <Text style={styles.confirmButtonText}>{confirmText}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.button, styles.singleButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.singleButtonText}>OK</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modal: {
        width: Dimensions.get('window').width * 0.85,
        maxWidth: 400,
        borderRadius: 12,
        borderWidth: 1,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    icon: {
        marginRight: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    message: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    confirmButton: {
        backgroundColor: '#007bff',
    },
    singleButton: {
        backgroundColor: '#007bff',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    singleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ToastModal;