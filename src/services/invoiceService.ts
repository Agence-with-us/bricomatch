import * as path from 'path';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase';
import { getStorage } from '../config/firebase';
import { Appointment, Invoice, UserRole } from '../types';
import { getUserById } from './userService';
import { calculatePlatformFeeHorsTVA, calculateProShareHorsTVA } from '../config/stripe';
import admin from 'firebase-admin';

const db = getFirestore();
const invoicesCollection = db.collection('invoices');
const countersCollection = db.collection('counters');

// Format date en français
const formatDateFr = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Format currency en euros
const formatEuros = (amount: number): string => {
  return (amount / 100).toFixed(2).replace('.', ',') + ' €';
};

// Obtenir un numéro de facture séquentiel
const getNextInvoiceNumber = async (): Promise<string> => {
  const counterRef = countersCollection.doc('invoices');

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let currentCount = 1;
    if (counterDoc.exists) {
      currentCount = counterDoc.data()?.currentCount + 1 || 1;
    }

    transaction.set(counterRef, { currentCount });

    // Format: INV-ANNÉE-NUMÉRO (ex: INV-2025-00001)
    const year = new Date().getFullYear();
    const paddedCount = String(currentCount).padStart(5, '0');
    return `F-${year}-${paddedCount}`;
  });
};

// Generate an invoice PDF and store it in Firebase Storage
export const generateInvoice = async (
  appointment: Appointment,
  userRole: UserRole
): Promise<Invoice> => {
  try {
    // Get the user information
    const userId = userRole === UserRole.PARTICULIER ? appointment.clientId : appointment.proId;
    const user = await getUserById(userId);

    if (!user) {
      throw new Error(`Utilisateur non trouvé: ${userId}`);
    }

    // Get the other party information
    const otherUserId = userRole === UserRole.PARTICULIER ? appointment.proId : appointment.clientId;
    const otherUser = await getUserById(otherUserId);

    if (!otherUser) {
      throw new Error(`Autre utilisateur non trouvé: ${otherUserId}`);
    }

    // Get next invoice number
    const invoiceNumber = await getNextInvoiceNumber();

    // Create temporary directory if it doesn't exist
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    // Create PDF
    const pdfPath = path.join(tmpDir, `facture-${appointment.id}-${userRole.toLowerCase()}.pdf`);
    const pdfDoc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Start writing the PDF
    pdfDoc.pipe(fs.createWriteStream(pdfPath));

    // Add content to PDF
    addInvoiceHeader(pdfDoc, userRole, invoiceNumber);

    // Add parties information
    addPartiesInfo(
      pdfDoc,
      user,
      otherUser,
      userRole
    );

    // Add appointment details
    addAppointmentDetails(
      pdfDoc,
      appointment,
      userRole,
      user
    );

    // Add footer
    addInvoiceFooter(pdfDoc, invoiceNumber);

    // Finalize the PDF
    pdfDoc.end();

    // Wait for the PDF to be fully written
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    // Upload the PDF to Firebase Storage
    const bucket = getStorage().bucket();
    const filename = `factures/${appointment.id}/${userRole.toLowerCase()}.pdf`;
    await bucket.upload(pdfPath, {
      destination: filename,
      metadata: {
        contentType: 'application/pdf',
      },
    });

    // Generate a signed URL (valid for 1 year)
    const [url] = await bucket.file(filename).getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    // Save invoice record in Firestore
    const invoiceId = uuidv4();
    const invoice: Invoice = {
      id: invoiceId,
      appointmentId: appointment.id!,
      userId,
      userRole,
      invoiceNumber, // Add the sequential invoice number
      platformFee: userRole === UserRole.PRO ? appointment.montantHT : 0,
      fileUrl: url,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await invoicesCollection.doc(invoiceId).set(invoice);

    // Clean up the temporary file
    fs.unlinkSync(pdfPath);

    return invoice;
  } catch (error) {
    console.error('Erreur lors de la génération de la facture:', error);
    throw error;
  }
};

// Helper function to add invoice header
const addInvoiceHeader = (
  doc: PDFKit.PDFDocument,
  userRole: UserRole,
  invoiceNumber: string
) => {
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
  if (userRole === UserRole.PARTICULIER) {
    doc.fontSize(11).font('Helvetica-Oblique').text('Facture Client', 400);
  } else {
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
const addPartiesInfo = (
  doc: PDFKit.PDFDocument,
  user: any,
  otherUser: any,
  userRole: UserRole
) => {
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

  if (userRole === UserRole.PARTICULIER) {
    // Invoice for client - recipient is the client
    doc.fontSize(10).font('Helvetica').text(`${user.prenom} ${user.nom}`, 350);
    doc.text(user.adresse || 'Adresse non spécifiée');
    doc.text(user.codePostal ? `${user.codePostal} ${user.ville || ''}` : 'Code postal non spécifié');
    doc.text(`Email: ${user.email}`);
    doc.text(`Tél: ${user.telephone || 'Non spécifié'}`);
  } else {
    // Invoice for pro - recipient is the professional
    doc.fontSize(10).font('Helvetica').text(`${user.prenom} ${user.nom}`, 350);
    doc.text(user.societe || 'Indépendant');
    doc.text(user.adresse || 'Adresse non spécifiée');
    doc.text(user.codePostal ? `${user.codePostal} ${user.ville || ''}` : 'Code postal non spécifié');
    if (user.siret) doc.text(`SIRET: ${user.siret}`);
    if (user.TVA_ID) doc.text(`N° TVA: ${user.TVA_ID}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Tél: ${user.telephone || 'Non spécifié'}`);
  }

  doc.moveDown(2);
};

// Helper function to add appointment details
const addAppointmentDetails = (
  doc: PDFKit.PDFDocument,
  appointment: Appointment,
  userRole: UserRole,
  user: any
) => {
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

  if (userRole === UserRole.PARTICULIER) {
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

  } else {
    // Professional invoice format
    const platformFee = calculatePlatformFeeHorsTVA(appointment.montantHT);
    const proShare = calculateProShareHorsTVA(appointment.montantHT);

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
    } else {
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
const createTableHeader = (doc: PDFKit.PDFDocument) => {
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
const addInvoiceFooter = (doc: PDFKit.PDFDocument, invoiceNumber: string) => {
  // Position at the bottom of the page
  const pageHeight = doc.page.height;

  // Add line
  doc.lineCap('butt')
    .moveTo(50, pageHeight - 100)
    .lineTo(550, pageHeight - 100)
    .stroke();

  // Add footer text
  doc.fontSize(8).font('Helvetica').text(
    'Bricomatch SAS - 123 Avenue des Services, 75001 Paris - SIRET: 123 456 789 00010 - N° TVA: FR123456789',
    50, pageHeight - 90, { align: 'center', width: 500 }
  );

  doc.fontSize(8).text(
    'Facture générée électroniquement - Dispensée de signature',
    50, pageHeight - 75, { align: 'center', width: 500 }
  );

  // Add page number
  doc.fontSize(8).text(
    `Facture N° ${invoiceNumber} - Page 1/1`,
    50, pageHeight - 60, { align: 'center', width: 500 }
  );
};

// Get an invoice by ID
export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  try {
    const doc = await invoicesCollection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Invoice;
  } catch (error) {
    console.error(`Error fetching invoice with ID ${id}:`, error);
    throw error;
  }
};

// Get invoices for a user
export const getUserInvoices = async (userId: string): Promise<Invoice[]> => {
  try {
    const snapshot = await invoicesCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Invoice));
  } catch (error) {
    console.error(`Error fetching invoices for user ${userId}:`, error);
    throw error;
  }
};