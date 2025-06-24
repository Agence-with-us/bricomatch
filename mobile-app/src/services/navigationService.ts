import { createRef } from 'react';
import { NavigationContainerRef, EventListenerCallback, EventMapCore } from '@react-navigation/native';
import { RootStackParamList } from '../types/RootStackParamList';

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

// File d'attente pour les actions de navigation
type NavigationAction = {
  type: 'navigate' | 'reset' | 'goBack' | 'replace';
  payload?: any;
};

const navigationQueue: NavigationAction[] = [];
let isNavigationReady = false;

export function setNavigationReady() {
  isNavigationReady = true;

  // Exécuter les actions en file d'attente
  if (navigationQueue.length > 0) {
    navigationQueue.forEach(action => {
      switch (action.type) {
        case 'navigate':
          navigate(action.payload.name, action.payload.params);
          break;
        case 'reset':
          reset(action.payload.name, action.payload.params);
          break;
        case 'replace':
          replace(action.payload.name, action.payload.params);
          break;
        case 'goBack':
          goBack();
          break;
      }
    });

    // Vider la file d'attente
    navigationQueue.length = 0;
  }
}

export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.current && isNavigationReady) {
    navigationRef.current.navigate(name as any, params);
  } else {
    navigationQueue.push({
      type: 'navigate',
      payload: { name, params },
    });
  }
}

// Nouvelle fonction "replace"
export function replace<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.current && isNavigationReady) {
    navigationRef.current.navigate(name as any, params);
  } else {
    navigationQueue.push({
      type: 'replace',
      payload: { name, params },
    });
  }
}

export function getCurrentRoute() {
  if (navigationRef.current) {
    return navigationRef.current.getCurrentRoute();
  }
  return null;
}

// Ajout de la fonction reset
export function reset<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.current && isNavigationReady) {
    navigationRef.current.reset({
      index: 0,
      routes: [{ name: name as any, params }],
    });
  } else {
    navigationQueue.push({
      type: 'reset',
      payload: { name, params },
    });
  }
}

// Ajout de la fonction goBack
export function goBack() {
  if (navigationRef.current && isNavigationReady) {
    navigationRef.current.goBack();
  } else {
    navigationQueue.push({
      type: 'goBack',
    });
  }
}

// Ajout de la fonction addNavigationListener
export function addNavigationListener<T extends keyof EventMapCore<any>>(
  type: T,
  callback: EventListenerCallback<EventMapCore<any>, T>
) {
  if (navigationRef.current) {
    return navigationRef.current.addListener(type as any, callback as any);
  }

  // Retourner une fonction vide si le navigation ref n'est pas prêt
  return () => { };
}