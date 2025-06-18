import { all, fork } from 'redux-saga/effects';
import { watchAuthActions } from './authentification/saga';
import { watchServicesActions } from './services/saga';
import { watchUsersActions } from './users/saga';
import { watchAvailabilityActions } from './availability/saga';

export default function* rootSaga() {
  yield all([
    fork(watchAuthActions),
    fork(watchServicesActions),
    fork(watchUsersActions),
    fork(watchAvailabilityActions),
    
  ]);
}

