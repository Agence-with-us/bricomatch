import { call, put, takeEvery } from 'redux-saga/effects';
import { getDocs, collection, doc, getDoc } from 'firebase/firestore';
import { fetchServicesRequest, fetchServicesSuccess, fetchServicesFailure } from './reducer';
import { SagaIterator } from 'redux-saga';
import { firestore } from '../../config/firebase.config';
import { Service } from './types';

// Saga pour récupérer les services depuis Firestore
function* fetchServicesSaga(): SagaIterator {
  try {
    const servicesSnapshot = yield call(getDocs, collection(firestore, 'services'));
    const servicesList: Service[] = servicesSnapshot.docs.map((doc : any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Service[];

    yield put(fetchServicesSuccess(servicesList));
  } catch (error: any) {
    console.error('Erreur récupération services:', error);
    yield put(fetchServicesFailure('Erreur lors de la récupération des services.'));
  }
}

// Récupérer les détails d'un service par son ID
export function* getServiceDetails(serviceId: string): Generator<any, Service | null, any> {
  try {
    const serviceRef = doc(firestore, 'services', serviceId);
    const serviceSnapshot = yield call(getDoc, serviceRef);
    
    if (serviceSnapshot.exists()) {
      return {
        id: serviceSnapshot.id,
        ...serviceSnapshot.data()
      } as Service;
    } else {
      console.warn(`Service avec ID ${serviceId} non trouvé`);
      return null;
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération du service ${serviceId}:`, error);
    return null;
  }
}


// Watcher saga pour surveiller les actions de services
export function* watchServicesActions() {
  yield takeEvery(fetchServicesRequest.type, fetchServicesSaga);
}
