import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { navigate } from '../services/navigationService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Si l'utilisateur n'est pas authentifié, rediriger vers le AppLandingScreen
    if (!isAuthenticated || !user) {
      navigate('AppLandingScreen');
    }
  }, [isAuthenticated, user]);

  // Si l'utilisateur n'est pas authentifié, ne pas rendre le composant
  if (!isAuthenticated || !user) {
    return null;
  }

  // Si l'utilisateur est authentifié, rendre le composant enfant
  return <>{children}</>;
};

export default ProtectedRoute;