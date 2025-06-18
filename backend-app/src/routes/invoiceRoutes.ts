import express from 'express';
import { getAuth } from '../config/firebase';
import { authenticate, AuthRequest, authorizeRoles } from '../middleware/auth';
import { getInvoiceById, getUserInvoices } from '../services/invoiceService';
import { UserRole } from '../types';

const router = express.Router();

// Get all invoices for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const invoices = await getUserInvoices(req.user.id);

    return res.status(200).json({
      success: true,
      data: invoices,
      message: 'Invoices retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoices'
    });
  }
});

// Get a specific invoice
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const invoice = await getInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    // Check if the user has permission to access this invoice
    if (invoice.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
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
  } catch (error) {
    console.error(`Error fetching invoice with ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoice'
    });
  }
});

export default router;