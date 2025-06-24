import { call, put, takeLatest, takeEvery, select } from 'redux-saga/effects';
import { SagaIterator } from 'redux-saga';
import { getDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';
import {
  fetchAvailabilityRequest,
  fetchAvailabilitySuccess,
  fetchAvailabilityFailure,
  updateConnectedProAvailabilityRequest,
  updateConnectedProAvailabilitySuccess,
  updateConnectedProAvailabilityFailure,
} from './reducer';
import { Availability } from './types';
import { PayloadAction } from '@reduxjs/toolkit';
import { UserLocal } from '../users/types';
import { RootState } from '../store';
import { showToast } from '../../utils/toastNotification';

// Saga pour récupérer la disponibilité d'un professionnel (connecté ou autre)
function* fetchAvailabilitySaga(action: PayloadAction<{ userId: string; type: 'connected' | 'other' }>): SagaIterator {
  const { userId, type } = action.payload;
  console.log("fetchAvailabilitySaga", userId, type);

  try {
    // Récupération du document de disponibilité depuis Firestore
    const availabilityRef = doc(firestore, 'availabilities', userId);
    const availabilitySnapshot = yield call(getDoc, availabilityRef);

    if (availabilitySnapshot.exists()) {
      const availabilityData = {
        id: availabilitySnapshot.id,
        ...availabilitySnapshot.data()
      } as Availability;
      console.log("availabilityData", availabilityData)

      // Dispatch du succès avec les données et le type (connecté ou autre)
      yield put(fetchAvailabilitySuccess({
        availability: availabilityData,
        type
      }));
    } else {
      // {"Mercredi": [{"end": "17:00", "start": "09:00"}], "id": "9IBZyVrIc2YYTWjqwMKbHJsuw1k2"}
      // Document non trouvé
      yield put(fetchAvailabilitySuccess({
        availability: {
          id: availabilitySnapshot.id,
        },
        type
      }));
    }
  } catch (error: any) {
    console.error('Erreur récupération disponibilité:', error);
    yield put(fetchAvailabilityFailure(error.message || 'Erreur lors de la récupération des disponibilités'));
  }
}


function* updateConnectedProAvailabilitySaga(action: PayloadAction<Availability>): SagaIterator {
  try {
    // Récupérer l'utilisateur connecté depuis le store Redux
    const user: UserLocal | null = yield select((state: RootState) => state.auth.user);

    if (!user || !user.id) {
      throw new Error("Utilisateur non connecté");
    }

    const availability = action.payload;
    console.log("Mise à jour pour l'utilisateur:", user.id, availability);

    // Référence du document Firestore basé sur l'ID du user connecté
    const availabilityRef = doc(firestore, 'availabilities', user.id);

    // Vérifier si le document existe déjà
    const docSnapshot = yield call(getDoc, availabilityRef);

    // Supprimer `id` avant la sauvegarde pour éviter la duplication

    if (docSnapshot.exists()) {
      // Si le document existe, mise à jour avec updateDoc
      yield call(() => updateDoc(availabilityRef, availability));
    } else {
      // Si le document n'existe pas, création avec setDoc
      yield call(() => setDoc(availabilityRef, availability));
    }

    // Dispatch du succès après mise à jour
    yield put(updateConnectedProAvailabilitySuccess(availability));

    // Afficher un toast de confirmation
    yield call(showToast, "Succès", "Vos disponibilités ont été enregistrées avec succès", "success");
  } catch (error: any) {
    console.error("Erreur mise à jour disponibilité:", error);
    yield put(updateConnectedProAvailabilityFailure(error.message || "Erreur lors de la mise à jour des disponibilités"));

    // Afficher un toast d'erreur
    yield call(showToast, "Échec de l'enregistrement des disponibilités", "Veuillez réessayer plus tard", "error");
  }
}



// Watcher saga pour surveiller les actions de disponibilité
export function* watchAvailabilityActions() {
  yield takeEvery(fetchAvailabilityRequest.type, fetchAvailabilitySaga);
  yield takeLatest(updateConnectedProAvailabilityRequest.type, updateConnectedProAvailabilitySaga);
}