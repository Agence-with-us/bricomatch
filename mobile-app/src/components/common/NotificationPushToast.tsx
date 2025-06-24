import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface NotificationToastProps {
  text1?: string; // Titre de la notification
  text2?: string; // Corps de la notification
  props: { 
    type: 'notification' | 'message' | 'appointment' | 'reminder' | 'alert';
    onPress?: () => void;
    showIcon?: boolean;
  };
}

export default function NotificationPushToast({ text1, text2, props }: NotificationToastProps) {
  const getToastStyle = () => {
    switch (props.type) {
      case 'notification':
        return {
          backgroundColor: '#EEF2FF',
          borderColor: '#6366F1',
          titleColor: '#4338CA',
        };
      case 'message':
        return {
          backgroundColor: '#ECFDF5',
          borderColor: '#10B981',
          titleColor: '#047857',
        };
      case 'appointment':
        return {
          backgroundColor: '#FFF7ED',
          borderColor: '#F59E0B',
          titleColor: '#D97706',
        };
      case 'reminder':
        return {
          backgroundColor: '#F0F9FF',
          borderColor: '#0EA5E9',
          titleColor: '#0284C7',
        };
      case 'alert':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: '#EF4444',
          titleColor: '#DC2626',
        };
      default:
        return {
          backgroundColor: '#EEF2FF',
          borderColor: '#6366F1',
          titleColor: '#4338CA',
        };
    }
  };

  const getIcon = () => {
    if (!props.showIcon) return null;
    
    switch (props.type) {
      case 'notification':
        return '🔔';
      case 'message':
        return '💬';
      case 'appointment':
        return '📅';
      case 'reminder':
        return '⏰';
      case 'alert':
        return '🚨';
      default:
        return '🔔';
    }
  };

  const style = getToastStyle();
  const icon = getIcon();

  const ToastContent = (
    <View
      style={{
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 20,
        backgroundColor: style.backgroundColor,
        borderWidth: 1,
        borderColor: style.borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        alignItems: 'center',
        maxWidth: '95%',
        minWidth: '80%',
      }}
    >
      {/* Header avec icône */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {icon && (
          <Text
            style={{
              fontSize: 20,
              marginRight: 8,
            }}
          >
            {icon}
          </Text>
        )}
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: style.titleColor,
            textAlign: 'center',
            flex: 1,
          }}
          numberOfLines={2}
        >
          {text1 || 'Nouvelle notification'}
        </Text>
      </View>

      {/* Corps du message */}
      {text2 ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: '#374151',
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
          }}
          numberOfLines={3}
        >
          {text2}
        </Text>
      ) : null}

      {/* Indicateur tactile si onPress est défini */}
      {props.onPress && (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: style.borderColor + '20',
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: style.titleColor,
              fontWeight: '600',
            }}
          >
            Appuyer pour voir
          </Text>
        </View>
      )}
    </View>
  );

  // Si onPress est défini, rendre le toast tactile
  if (props.onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={props.onPress}
        style={{ alignItems: 'center' }}
      >
        {ToastContent}
      </TouchableOpacity>
    );
  }

  // Sinon, rendre le toast statique
  return (
    <View style={{ alignItems: 'center' }}>
      {ToastContent}
    </View>
  );
}

// Fonction utilitaire pour utiliser le toast avec vos notifications
export const showNotificationToast = (remoteMessage: any, onPress?: () => void) => {
  const title = remoteMessage.notification?.title || 'Nouvelle notification';
  const body = remoteMessage.notification?.body || '';
  
  // Déterminer le type basé sur les données de la notification
  let type: 'notification' | 'message' | 'appointment' | 'reminder' | 'alert' = 'notification';
  
  if (remoteMessage.data?.type) {
    type = remoteMessage.data.type;
  } else if (title.toLowerCase().includes('message')) {
    type = 'message';
  } else if (title.toLowerCase().includes('rendez-vous') || title.toLowerCase().includes('appointment')) {
    type = 'appointment';
  } else if (title.toLowerCase().includes('rappel') || title.toLowerCase().includes('reminder')) {
    type = 'reminder';
  } else if (title.toLowerCase().includes('urgent') || title.toLowerCase().includes('alert')) {
    type = 'alert';
  }

  // Utiliser votre système de toast existant
  // Supposant que vous avez une fonction showToast
  return {
    text1: title,
    text2: body,
    props: {
      type,
      onPress,
      showIcon: true,
    }
  };
};

// Exemple d'utilisation dans votre handleForegroundNotification
/**
 * Gère les notifications reçues en foreground
 */
/*
handleForegroundNotification(remoteMessage: any) {
  console.log('Traitement notification foreground:', remoteMessage.notification?.title);
  
  const toastData = showNotificationToast(remoteMessage, () => {
    // Action quand l'utilisateur tape sur la notification
    console.log('Notification toast pressée');
    // Naviguer vers l'écran approprié
    // NavigationService.navigate('NotificationDetails', { data: remoteMessage.data });
  });
  
  // Afficher le toast avec votre système existant
  Toast.show({
    type: 'notificationToast', // Vous devrez enregistrer ce type
    text1: toastData.text1,
    text2: toastData.text2,
    props: toastData.props,
    position: 'top',
    visibilityTime: 5000,
    autoHide: true,
    topOffset: 60,
  });
}
*/