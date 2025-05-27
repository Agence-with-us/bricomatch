"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getUserInvoices = exports.getInvoiceById = exports.generateInvoice = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const uuid_1 = require("uuid");
const firebase_1 = require("../config/firebase");
const firebase_2 = require("../config/firebase");
const types_1 = require("../types");
const userService_1 = require("./userService");
const stripe_1 = require("../config/stripe");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const db = (0, firebase_1.getFirestore)();
const invoicesCollection = db.collection('invoices');
const countersCollection = db.collection('counters');
// Format date en français
const formatDateFr = (date) => {
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
// Format currency en euros
const formatEuros = (amount) => {
    return (amount / 100).toFixed(2).replace('.', ',') + ' €';
};
// Obtenir un numéro de facture séquentiel
const getNextInvoiceNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const counterRef = countersCollection.doc('invoices');
    return db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const counterDoc = yield transaction.get(counterRef);
        let currentCount = 1;
        if (counterDoc.exists) {
            currentCount = ((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.currentCount) + 1 || 1;
        }
        transaction.set(counterRef, { currentCount });
        // Format: INV-ANNÉE-NUMÉRO (ex: INV-2025-00001)
        const year = new Date().getFullYear();
        const paddedCount = String(currentCount).padStart(5, '0');
        return `F-${year}-${paddedCount}`;
    }));
});
// Generate an invoice PDF and store it in Firebase Storage
const generateInvoice = (appointment, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the user information
        const userId = userRole === types_1.UserRole.PARTICULIER ? appointment.clientId : appointment.proId;
        const user = yield (0, userService_1.getUserById)(userId);
        if (!user) {
            throw new Error(`Utilisateur non trouvé: ${userId}`);
        }
        // Get the other party information
        const otherUserId = userRole === types_1.UserRole.PARTICULIER ? appointment.proId : appointment.clientId;
        const otherUser = yield (0, userService_1.getUserById)(otherUserId);
        if (!otherUser) {
            throw new Error(`Autre utilisateur non trouvé: ${otherUserId}`);
        }
        // Get next invoice number
        const invoiceNumber = yield getNextInvoiceNumber();
        // Create temporary directory if it doesn't exist
        const tmpDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }
        // Create PDF
        const pdfPath = path.join(tmpDir, `facture-${appointment.id}-${userRole.toLowerCase()}.pdf`);
        const pdfDoc = new pdfkit_1.default({
            margin: 50,
            size: 'A4'
        });
        // Start writing the PDF
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        // Add content to PDF
        addInvoiceHeader(pdfDoc, userRole, invoiceNumber);
        // Add parties information
        addPartiesInfo(pdfDoc, user, otherUser, userRole);
        // Add appointment details
        addAppointmentDetails(pdfDoc, appointment, userRole, user);
        // Add footer
        addInvoiceFooter(pdfDoc, invoiceNumber);
        // Finalize the PDF
        pdfDoc.end();
        // Wait for the PDF to be fully written
        yield new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 1000);
        });
        // Upload the PDF to Firebase Storage
        const bucket = (0, firebase_2.getStorage)().bucket();
        const filename = `factures/${appointment.id}/${userRole.toLowerCase()}.pdf`;
        yield bucket.upload(pdfPath, {
            destination: filename,
            metadata: {
                contentType: 'application/pdf',
            },
        });
        // Generate a signed URL (valid for 1 year)
        const [url] = yield bucket.file(filename).getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        // Save invoice record in Firestore
        const invoiceId = (0, uuid_1.v4)();
        const invoice = {
            id: invoiceId,
            appointmentId: appointment.id,
            userId,
            userRole,
            invoiceNumber, // Add the sequential invoice number
            platformFee: userRole === types_1.UserRole.PRO ? appointment.montantHT : 0,
            fileUrl: url,
            createdAt: firebase_admin_1.default.firestore.Timestamp.now(),
        };
        yield invoicesCollection.doc(invoiceId).set(invoice);
        // Clean up the temporary file
        fs.unlinkSync(pdfPath);
        return invoice;
    }
    catch (error) {
        console.error('Erreur lors de la génération de la facture:', error);
        throw error;
    }
});
exports.generateInvoice = generateInvoice;
// Helper function to add invoice header
const addInvoiceHeader = (doc, userRole, invoiceNumber) => {
    // Add logo (placeholder - you should add your actual logo)
    // doc.image('path/to/logo.png', 50, 45, { width: 120 });
    // Add company name as a placeholder for logo
    doc.fontSize(22).font('Helvetica-Bold').text('Bricomatch', 50, 50);
    // Add facture title
    doc.fontSize(18).font('Helvetica-Bold').text('FACTURE', 400, 50);
    // Add invoice number and date on the right side
    doc.fontSize(10).font('Helvetica').text(`N° ${invoiceNumber}`, 400, 80);
    doc.fontSize(10).text(`Date: ${formatDateFr(new Date())}`, 400);
    // Add document type based on user role
    if (userRole === types_1.UserRole.PARTICULIER) {
        doc.fontSize(11).font('Helvetica-Oblique').text('Facture Client', 400);
    }
    else {
        doc.fontSize(11).font('Helvetica-Oblique').text('Facture Professionnel', 400);
    }
    // Add a line separator
    doc.moveDown(2);
    doc.lineCap('butt')
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
    doc.moveDown();
};
// Helper function to add parties information
const addPartiesInfo = (doc, user, otherUser, userRole) => {
    // Company information on the left
    doc.fontSize(10).font('Helvetica-Bold').text('ÉMETTEUR', 50, doc.y);
    doc.fontSize(10).font('Helvetica').text('Bricomatch SAS');
    doc.text('123 Avenue des Services');
    doc.text('75001 Paris, France');
    doc.text('SIRET: 123 456 789 00010');
    doc.text('N° TVA: FR123456789');
    doc.text('Email: contact@bricomatch.fr');
    doc.text('Tél: +33 1 23 45 67 89');
    // Recipient information on the right
    doc.fontSize(10).font('Helvetica-Bold').text('DESTINATAIRE', 350, 170);
    if (userRole === types_1.UserRole.PARTICULIER) {
        // Invoice for client - recipient is the client
        doc.fontSize(10).font('Helvetica').text(`${user.prenom} ${user.nom}`, 350);
        doc.text(user.adresse || 'Adresse non spécifiée');
        doc.text(user.codePostal ? `${user.codePostal} ${user.ville || ''}` : 'Code postal non spécifié');
        doc.text(`Email: ${user.email}`);
        doc.text(`Tél: ${user.telephone || 'Non spécifié'}`);
    }
    else {
        // Invoice for pro - recipient is the professional
        doc.fontSize(10).font('Helvetica').text(`${user.prenom} ${user.nom}`, 350);
        doc.text(user.societe || 'Indépendant');
        doc.text(user.adresse || 'Adresse non spécifiée');
        doc.text(user.codePostal ? `${user.codePostal} ${user.ville || ''}` : 'Code postal non spécifié');
        if (user.siret)
            doc.text(`SIRET: ${user.siret}`);
        if (user.TVA_ID)
            doc.text(`N° TVA: ${user.TVA_ID}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Tél: ${user.telephone || 'Non spécifié'}`);
    }
    doc.moveDown(2);
};
// Helper function to add appointment details
const addAppointmentDetails = (doc, appointment, userRole, user) => {
    doc.fontSize(12).font('Helvetica-Bold').text('DÉTAILS DE LA PRESTATION', { underline: true });
    doc.moveDown();
    // Add service details
    doc.fontSize(10).font('Helvetica').text(`Date de rendez-vous: ${formatDateFr(appointment.dateTime.toDate())}`);
    doc.text(`Durée: ${appointment.duration} minutes`);
    doc.moveDown();
    // Create table header
    createTableHeader(doc);
    // Create table row for service
    let y = doc.y;
    doc.font('Helvetica').text('1', 50, y);
    doc.text('1', 330, y, { width: 50, align: 'center' });
    doc.text(formatEuros(appointment.montantHT), 380, y, { width: 70, align: 'right' });
    doc.text(formatEuros(appointment.montantHT), 450, y, { width: 70, align: 'right' });
    // Move down
    doc.moveDown(2);
    // Add summary table
    const summaryY = doc.y + 10;
    doc.lineCap('butt')
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
    // Summary table
    doc.fontSize(10).font('Helvetica');
    if (userRole === types_1.UserRole.PARTICULIER) {
        // Client invoice format
        doc.text('Montant HT:', 380, summaryY, { width: 100, align: 'right' });
        doc.text(formatEuros(appointment.montantHT), 480, summaryY, { width: 70, align: 'right' });
        doc.text('TVA (20%):', 380, summaryY + 20, { width: 100, align: 'right' });
        doc.text(formatEuros(appointment.montantTotal - appointment.montantHT), 480, summaryY + 20, { width: 70, align: 'right' });
        doc.font('Helvetica-Bold');
        doc.text('Total TTC:', 380, summaryY + 40, { width: 100, align: 'right' });
        doc.text(formatEuros(appointment.montantTotal), 480, summaryY + 40, { width: 70, align: 'right' });
        // Payment information
        doc.moveDown(3);
        doc.fontSize(10).font('Helvetica').text('Paiement traité via Stripe');
        doc.text('Cette facture a été réglée en totalité.');
    }
    else {
        // Professional invoice format
        const platformFee = (0, stripe_1.calculatePlatformFeeHorsTVA)(appointment.montantHT);
        const proShare = (0, stripe_1.calculateProShareHorsTVA)(appointment.montantHT);
        doc.text('Montant total HT:', 380, summaryY, { width: 100, align: 'right' });
        doc.text(formatEuros(appointment.montantHT), 480, summaryY, { width: 70, align: 'right' });
        doc.text('Frais de plateforme (33,33%):', 380, summaryY + 20, { width: 100, align: 'right' });
        doc.text(formatEuros(platformFee), 480, summaryY + 20, { width: 70, align: 'right' });
        doc.font('Helvetica-Bold');
        doc.text('Votre part HT:', 380, summaryY + 40, { width: 100, align: 'right' });
        doc.text(formatEuros(proShare), 480, summaryY + 40, { width: 70, align: 'right' });
        // VAT info depends on professional's status
        if (user.TVA_SOUMI) {
            doc.moveDown();
            doc.fontSize(9).font('Helvetica-Oblique').text('Note: En tant que professionnel assujetti à la TVA, vous êtes responsable du paiement de la TVA sur votre part.');
        }
        else {
            doc.moveDown();
            doc.fontSize(9).font('Helvetica-Oblique').text('Note: N\'étant pas assujetti à la TVA, aucune TVA n\'est facturée sur votre part.');
        }
        // Payment information
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica').text('Paiement traité via Stripe');
        doc.text('Ce montant sera transféré sur votre compte bancaire selon les conditions générales.');
    }
};
// Helper function to create table header
const createTableHeader = (doc) => {
    const y = doc.y;
    // Add light gray background for header
    doc.rect(50, y, 500, 20).fill('#f5f5f5');
    // Add header text
    doc.fontSize(10).font('Helvetica-Bold')
        .fillColor('#000')
        .text('N°', 50, y + 5, { width: 30 })
        .text('Description', 80, y + 5, { width: 240 })
        .text('Qté', 330, y + 5, { width: 50, align: 'center' })
        .text('Prix HT', 380, y + 5, { width: 70, align: 'right' })
        .text('Total HT', 450, y + 5, { width: 70, align: 'right' });
    // Move down after header
    doc.moveDown();
};
// Helper function to add invoice footer
const addInvoiceFooter = (doc, invoiceNumber) => {
    // Position at the bottom of the page
    const pageHeight = doc.page.height;
    // Add line
    doc.lineCap('butt')
        .moveTo(50, pageHeight - 100)
        .lineTo(550, pageHeight - 100)
        .stroke();
    // Add footer text
    doc.fontSize(8).font('Helvetica').text('Bricomatch SAS - 123 Avenue des Services, 75001 Paris - SIRET: 123 456 789 00010 - N° TVA: FR123456789', 50, pageHeight - 90, { align: 'center', width: 500 });
    doc.fontSize(8).text('Facture générée électroniquement - Dispensée de signature', 50, pageHeight - 75, { align: 'center', width: 500 });
    // Add page number
    doc.fontSize(8).text(`Facture N° ${invoiceNumber} - Page 1/1`, 50, pageHeight - 60, { align: 'center', width: 500 });
};
// Get an invoice by ID
const getInvoiceById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield invoicesCollection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    }
    catch (error) {
        console.error(`Error fetching invoice with ID ${id}:`, error);
        throw error;
    }
});
exports.getInvoiceById = getInvoiceById;
// Get invoices for a user
const getUserInvoices = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield invoicesCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error(`Error fetching invoices for user ${userId}:`, error);
        throw error;
    }
});
exports.getUserInvoices = getUserInvoices;
