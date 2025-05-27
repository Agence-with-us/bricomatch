"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const invoiceService_1 = require("../services/invoiceService");
const types_1 = require("../types");
const router = express_1.default.Router();
// Get all invoices for the authenticated user
router.get('/', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const invoices = yield (0, invoiceService_1.getUserInvoices)(req.user.id);
        return res.status(200).json({
            success: true,
            data: invoices,
            message: 'Invoices retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching user invoices:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve invoices'
        });
    }
}));
// Get a specific invoice
router.get('/:id', auth_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const invoice = yield (0, invoiceService_1.getInvoiceById)(id);
        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Invoice not found'
            });
        }
        // Check if the user has permission to access this invoice
        if (invoice.userId !== req.user.id && req.user.role !== types_1.UserRole.ADMIN) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this invoice'
            });
        }
        return res.status(200).json({
            success: true,
            data: invoice,
            message: 'Invoice retrieved successfully'
        });
    }
    catch (error) {
        console.error(`Error fetching invoice with ID ${req.params.id}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve invoice'
        });
    }
}));
exports.default = router;
