"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.AppointmentStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PARTICULIER"] = "PARTICULIER";
    UserRole["PRO"] = "PRO";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["PAYMENT_INITIATED"] = "PAYMENT_INITIATED";
    AppointmentStatus["PAYMENT_AUTHORIZED"] = "PAYMENT_AUTHORIZED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED_BY_CLIENT"] = "CANCELLED_BY_CLIENT";
    AppointmentStatus["CANCELLED_BY_PRO"] = "CANCELLED_BY_PRO";
    AppointmentStatus["CANCELLED_BY_PRO_PENDING"] = "CANCELLED_BY_PRO_PENDING";
    AppointmentStatus["PENDING_PAYOUT"] = "PENDING_PAYOUT";
    AppointmentStatus["PAID_OUT"] = "PAID_OUT"; // Argent versé au PRO
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SHORT_CALL_UNDER_10_MINUTES"] = "SHORT_CALL_UNDER_10_MINUTES";
    NotificationType["LOW_RATING"] = "LOW_RATING";
    NotificationType["PAYOUT_ERROR"] = "PAYOUT_ERROR";
    NotificationType["GENERAL"] = "GENERAL";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
