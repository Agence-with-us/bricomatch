"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serviceController_1 = require("../controllers/serviceController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all services
router.get('/', auth_1.authenticate, serviceController_1.getAllServices);
// Get service by ID
router.get('/:id', auth_1.authenticate, serviceController_1.getServiceById);
exports.default = router;
