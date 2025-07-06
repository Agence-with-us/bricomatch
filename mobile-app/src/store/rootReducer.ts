import { combineReducers } from 'redux';
import authReducer from './authentification/reducer';
import servicesReducer from './services/reducer';
import usersReducer from './users/reducer';
import availabilityReducer from './availability/reducer';
import appointmentsReducer from './appointments/reducer';

const rootReducer = combineReducers({
  auth: authReducer,
  services : servicesReducer,
  users : usersReducer,
  availability : availabilityReducer,
  appointments : appointmentsReducer
});

export default rootReducer;
