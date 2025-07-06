// saga.ts
import { call, put, takeEvery, select } from 'redux-saga/effects';
import { getDocs, collection, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { fetchAppointmentsRequest, fetchAppointmentsSuccess, fetchAppointmentsFailure, addAppointmentFailure, addAppointmentSuccess, addAppointmentRequest, updateAppointmentStatusRequest, updateAppointmentStatusFailure, updateAppointmentStatusSuccess } from './reducer';
import { SagaIterator } from 'redux-saga';
import { firestore } from '../../config/firebase.config';
import { Appointment, AppointmentStatus, AppointmentWithOtherUserInfo } from './types';
import { RootState } from '../store';
import { getServiceDetails } from '../services/saga';
import { PayloadAction } from '@reduxjs/toolkit';

// Sélecteur pour récupérer l'utilisateur actuel
const getCurrentUser = (state: RootState) => state.auth.user;

// Saga pour récupérer les rendez-vous avec les informations utilisateur
function* fetchAppointmentsSaga(): SagaIterator {
    try {
        // Récupérer l'utilisateur actuel depuis le store Redux
        const currentUser = yield select(getCurrentUser);

        if (!currentUser) {
            console.error("Utilisateur non connecté");
            yield put(fetchAppointmentsFailure("Utilisateur non connecté"));
            return;
        }

        // Définition du champ de filtrage en fonction du rôle
        const field = currentUser.role === "PRO" ? "proId" : "clientId";

        // Créer une requête pour récupérer les rendez-vous de l'utilisateur connecté
        const appointmentsQuery = query(
            collection(firestore, 'appointments'),
            where(field, '==', currentUser.id),
            where('status', 'not-in', [AppointmentStatus.PAYMENT_INITIATED]),
            orderBy('status'),
            orderBy('dateTime', 'asc')
        );

        const querySnapshot = yield call(getDocs, appointmentsQuery);
        const combinedAppointmentsData: AppointmentWithOtherUserInfo[] = [];

        // Récupérer les données de rendez-vous et des utilisateurs
        for (const docSnap of querySnapshot.docs) {
            const appointment = {
                id: docSnap.id,
                ...docSnap.data()
            } as Appointment;

            // Récupérer les informations de l'autre utilisateur (pro ou client)
            const otherUserId = currentUser.role === "PRO" ? appointment.clientId : appointment.proId;

            let otherUserInfo = null;

            // Récupérer les informations de l'utilisateur directement depuis Firestore
            if (otherUserId) {
                try {
                    const userDoc = yield call(getDoc, doc(firestore, 'users', otherUserId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // Récupérer les informations du service si disponible
                        let serviceInfo = null;
                        if (userData.serviceTypeId) {
                            serviceInfo = yield call(getServiceDetails, userData.serviceTypeId);
                        }

                        otherUserInfo = {
                            id: otherUserId,
                            nom: userData.nom,
                            prenom: userData.prenom,
                            photoUrl: userData?.photoUrl || "",
                            serviceInfo
                        };
                    }
                } catch (error) {
                    console.error("Erreur lors de la récupération des informations utilisateur:", error);
                }
            }



            // Combiner les informations de rendez-vous et d'utilisateur
            combinedAppointmentsData.push({
                appointment,
                otherUser: otherUserInfo || {
                    id: otherUserId || "",
                    nom: "",
                    prenom: "",
                    photoUrl: "",
                },
                endTime: '',
                fullDate: '',
                isOngoing: '',
                timeStatus: ''
            });
        }

        yield put(fetchAppointmentsSuccess(combinedAppointmentsData));
    } catch (error: any) {
        console.error("Erreur lors de la récupération des rendez-vous:", error);
        yield put(fetchAppointmentsFailure(error.message || "Erreur lors de la récupération des rendez-vous"));
    }
}


// Saga pour ajouter un rendez-vous créé à la liste
function* addAppointmentSaga(action: PayloadAction<AppointmentWithOtherUserInfo>): SagaIterator {
    try {
        const collectionRef = collection(firestore, 'appointments');
        const docSnap = yield call(getDoc, doc(collectionRef, action.payload.appointment.id));
        if (docSnap.exists()) {
            const appointment = docSnap.data() as Appointment;
            console.log("appointment", appointment);
            const appointmentWithOtherUserInfo = {
                appointment,
                otherUser: action.payload.otherUser
            } as AppointmentWithOtherUserInfo;
            yield put(addAppointmentSuccess(appointmentWithOtherUserInfo));
        }
        else {
            yield put(addAppointmentSuccess(action.payload));
        }
    } catch (error: any) {
        console.error("Erreur lors de l'ajout du rendez-vous:", error);
        yield put(addAppointmentFailure(error.message || "Erreur lors de l'ajout du rendez-vous"));
    }
}

function* updateAppointmentSaga(action: PayloadAction<{id: string, status: AppointmentStatus}>): SagaIterator {

    try {
        console.log("action", action.payload);
        yield put(updateAppointmentStatusSuccess(action.payload));
    } catch (error: any) {
        console.error("Erreur lors de la mise à jour du rendez-vous:", error);
        yield put(updateAppointmentStatusFailure(error.message || "Erreur lors de la mise à jour du rendez-vous"));
    }
}

// Watcher saga pour surveiller les actions d'appointments
export function* watchAppointmentsActions() {
    yield takeEvery(fetchAppointmentsRequest.type, fetchAppointmentsSaga);
    yield takeEvery(addAppointmentRequest.type, addAppointmentSaga);
    yield takeEvery(updateAppointmentStatusRequest.type, updateAppointmentSaga);
}