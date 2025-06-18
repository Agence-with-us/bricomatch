// users/sagas.ts
import { call, put, takeEvery, all } from 'redux-saga/effects';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  query, 
  where,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { SagaIterator } from 'redux-saga';
import { 
  fetchProUsersRequest, 
  fetchProUsersSuccess, 
  fetchProUsersFailure,
  fetchProUsersByServiceRequest,
  fetchProUsersByServiceSuccess,
  fetchProUsersByServiceFailure
} from './reducer';
import { firestore } from '../../config/firebase.config';
import { UserLocal, UserRole } from './types';
import { PayloadAction } from '@reduxjs/toolkit';
import { getServiceDetails } from '../services/saga';

// Convertir les documents Firestore en objets User
function convertDocsToUsers(querySnapshot: QuerySnapshot<DocumentData>): UserLocal[] {
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as UserLocal[];
}


// Enrichir un utilisateur avec les informations de son service
function* enrichUserWithServiceInfo(user: UserLocal): Generator<any, UserLocal, any> {
  if (!user.serviceTypeId) {
    return user;
  }
  
  const serviceInfo = yield call(getServiceDetails, user.serviceTypeId);
  
  if (serviceInfo) {
    return {
      ...user,
      serviceInfo
    };
  }
  
  return user;
}

// Enrichir une liste d'utilisateurs avec les informations de leurs services
function* enrichUsersWithServiceInfo(users: UserLocal[]): Generator<any, UserLocal[], any> {
  const usersWithServicesPromises = [];
  
  for (const user of users) {
    usersWithServicesPromises.push(call(enrichUserWithServiceInfo, user));
  }
  
  const usersWithServices = yield all(usersWithServicesPromises);
  return usersWithServices;
}

// Saga pour récupérer tous les utilisateurs PRO avec informations de services
function* fetchProUsersSaga(): SagaIterator {
  try {
    console.log("fetchProUsersSaga")
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('role', '==', UserRole.PRO));
    const usersSnapshot = yield call(getDocs, q);
    const basicProUsersList = convertDocsToUsers(usersSnapshot);
    
    // Enrichir chaque utilisateur avec les détails de son service
    const enrichedProUsersList = yield call(enrichUsersWithServiceInfo, basicProUsersList);
    
    yield put(fetchProUsersSuccess(enrichedProUsersList));
  } catch (error: any) {
    console.error('Erreur récupération utilisateurs PRO:', error);
    yield put(fetchProUsersFailure('Erreur lors de la récupération des utilisateurs PRO.'));
  }
}

// Saga pour récupérer les utilisateurs PRO par service avec informations de service
function* fetchProUsersByServiceSaga(action: PayloadAction<string>): SagaIterator {
  try {
    const serviceId = action.payload;
    
    // Récupérer d'abord les détails du service
    const serviceDetails = yield call(getServiceDetails, serviceId);
    
    if (!serviceDetails) {
      yield put(fetchProUsersByServiceFailure(`Service avec ID ${serviceId} non trouvé.`));
      return;
    }
    
    const usersRef = collection(firestore, 'users');
    const q = query(
      usersRef, 
      where('role', '==', UserRole.PRO),
      where('serviceTypeId', '==', serviceId)
    );
    const usersSnapshot = yield call(getDocs, q);
    const basicProUsersList = convertDocsToUsers(usersSnapshot);
    
    // Ajouter les détails du service à chaque utilisateur
    const enrichedProUsersList = basicProUsersList.map(user => ({
      ...user,
      serviceInfo: serviceDetails
    }));
    
    yield put(fetchProUsersByServiceSuccess({ 
      serviceId, 
      users: enrichedProUsersList 
    }));
  } catch (error: any) {
    console.error(`Erreur récupération utilisateurs PRO du service ${action.payload}:`, error);
    yield put(fetchProUsersByServiceFailure(`Erreur lors de la récupération des utilisateurs PRO du service ${action.payload}.`));
  }
}

// Watcher saga pour surveiller les actions utilisateurs
export function* watchUsersActions() {
  yield takeEvery(fetchProUsersRequest.type, fetchProUsersSaga);
  yield takeEvery(fetchProUsersByServiceRequest.type, fetchProUsersByServiceSaga);
}