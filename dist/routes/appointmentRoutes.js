"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const appointmentController_1 = require("../controllers/appointmentController");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = express_1.default.Router();
// Create a new appointment (client only)
router.post('/', auth_1.authenticate, (0, auth_1.authorizeRoles)(types_1.UserRole.PARTICULIER), appointmentController_1.createAppointment);
// Confirm an appointment (pro only)
router.patch('/:id/confirm', auth_1.authenticate, (0, auth_1.authorizeRoles)(types_1.UserRole.PRO), appointmentController_1.confirmAppointment);
router.patch('/:id/payment/authorize', auth_1.authenticate, (0, auth_1.authorizeRoles)(types_1.UserRole.PARTICULIER), appointmentController_1.autoriserPaiementAppointment);
// Cancel an appointment (pro only)
router.patch('/:id/cancel', auth_1.authenticate, appointmentController_1.cancelAppointment);
// Évaluer un rendez-vous (client uniquement)
// Le client envoie dans le corps : appointmentId, proId et rating
router.post('/evaluation', auth_1.authenticate, (0, auth_1.authorizeRoles)(types_1.UserRole.PARTICULIER), appointmentController_1.evaluerAppointment);
exports.default = router;
