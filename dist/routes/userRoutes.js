"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.post('/create-stripe-connect', auth_1.authenticate, (0, auth_1.authorizeRoles)(types_1.UserRole.PRO), userController_1.createStripeConnectAccount);
exports.default = router;
