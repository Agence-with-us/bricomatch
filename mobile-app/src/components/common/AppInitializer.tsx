import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { fetchServicesRequest } from '../../store/services/reducer';

const AppInitializer = () => {
  
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const { services } = useSelector((state: RootState) => state.services);
  
  // Surveillance de l'état loading pour détecter les blocages
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadingStateRef = useRef<boolean>(false);
  
  

  // Surveillance du loading pour détecter les blocages
  useEffect(() => {
    if (loading && !lastLoadingStateRef.current) {
      lastLoadingStateRef.current = true;
      
      // Définir un timeout pour détecter les blocages
      loadingTimeoutRef.current = setTimeout(() => {
        console.error('🚨 BLOQUAGE DÉTECTÉ - Loading actif depuis plus de 10 secondes');
        console.error('🚨 État actuel:', { isAuthenticated, userId: user?.id, userRole: user?.role });
        
        // Forcer la réinitialisation de l'état loading
        // Ici on pourrait dispatcher une action pour forcer la réinitialisation
      }, 10000); // 10 secondes
      
    } else if (!loading && lastLoadingStateRef.current) {
      lastLoadingStateRef.current = false;
      
      // Nettoyer le timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [loading, isAuthenticated, user?.id, user?.role]);

  useNotifications();

  const dispatch = useDispatch();

  useEffect(() => {
    if (services.length === 0) {
      dispatch(fetchServicesRequest());
    }
  }, [dispatch, services.length]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Ce composant ne rend rien visuellement.
  return null;
};

export default AppInitializer; 