import { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';

import {
  createAppointment as createAppointmentService,
  confirmAppointment as confirmAppointmentService,
  cancelAppointmentAdvancedService as cancelAppointmentService,
  autoriserPaiementAppointmentService,
  evaluerAppointmentService
} from '../services/appointmentService';
import { AuthRequest } from '../middleware/auth';
import { Appointment, AppointmentStatus, UserRole } from '../types';
import { createPaymentIntent, capturePaymentIntent, refundPayment } from '../services/paymentService';
import { getUserById } from '../services/userService';
import { generateInvoice } from '../services/invoiceService';
import { ClientError } from '../helpers/ClientError';
import { createOrActivateChat } from '../services/chatService';

// Create a new appointment and initialize payment
export const createAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { proId, dateTime, duration, timeSlot } = req.body;

    // Vérifie si l'utilisateur est authentifié
    if (!req.user) {
      throw new ClientError("Authentification requise", 401);
    }

    // Vérifie que seul un utilisateur de type CLIENT (PARTICULIER) peut créer un rendez-vous
    if (req.user.role !== UserRole.PARTICULIER) {
      throw new ClientError("Seuls les clients (PARTICULIER) peuvent créer des rendez-vous", 403);
    }

    // Vérification de la durée du rendez-vous
    if (duration !== 30 && duration !== 60) {
      throw new ClientError("La durée doit être soit de 30 minutes, soit de 60 minutes", 400);
    }

    // Récupérer les données du professionnel
    const pro = await getUserById(proId);
    if (!pro || pro.role !== UserRole.PRO) {
      throw new ClientError("Professionnel non trouvé", 404);
    }

    // On crée la date complète en combinant la date et le timeSlot
    const fullDate = new Date(dateTime); // Par exemple, "2025-06-07"
    const [hours, minutes] = timeSlot.split(':').map(Number); // Par exemple, "09:00"
    fullDate.setHours(hours, minutes, 0, 0);

    // Calculer le montant de base et le montant total avec TVA
    const baseAmount = duration * 100;             // Montant hors TVA
    const vatAmount = Math.round(baseAmount * 0.2);  // TVA à 20%
    const totalAmount = baseAmount + vatAmount;      // Montant total




    // Créer l'intention de paiement via Stripe
    const paymentIntent = await createPaymentIntent(totalAmount, 'eur', {
      appointmentDuration: duration,
      clientId: req.user.id,
      proId: proId
    });

    if (!paymentIntent || !paymentIntent.id) {
      throw new ClientError("La création du paiement a échoué", 500);
    }

    // Création du rendez-vous avec le statut PAYMENT_INITIATED
    const appointmentData: Partial<Appointment> = {
      proId,
      clientId: req.user.id,
      dateTime: admin.firestore.Timestamp.fromDate(fullDate),
      duration,
      timeSlot, // On conserve éventuellement le timeSlot si besoin
      status: AppointmentStatus.PAYMENT_INITIATED,
      // Stocker le montant total et le montant hors TVA
      montantTotal: totalAmount,
      montantHT: baseAmount,
      stripePaymentIntentId: paymentIntent.id
    };
    const appointment = await createAppointmentService(appointmentData);

    return res.status(201).json({
      success: true,
      data: {
        appointment,
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    // Transmet l'erreur au middleware de gestion des erreurs de l'application
    next(error);
  }
};



/**
 * Contrôleur pour confirmer un rendez-vous et traiter le paiement (réservé aux professionnels, PRO).
 */
export const confirmAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Vérification de l'authentification
    if (!req.user) {
      throw new ClientError("L'authentification est requise", 401);
    }

    // Seul un professionnel (PRO) peut confirmer un rendez-vous
    if (req.user.role !== UserRole.PRO) {
      throw new ClientError("Seuls les professionnels (PRO) peuvent confirmer les rendez-vous", 403);
    }

    // Récupérer le rendez-vous et vérifier que le pro en est bien le propriétaire
    const appointment = await confirmAppointmentService(id, req.user.id);

    if (!appointment) {
      throw new ClientError("Rendez-vous introuvable ou déjà confirmé", 404);
    }

    // Générer des factures pour le client et pour le professionnel
    const clientInvoice = await generateInvoice(appointment, UserRole.PARTICULIER);
    const proInvoice = await generateInvoice(appointment, UserRole.PRO);

    // Créer ou activer la discussion entre le PRO et le client
    let chatId: string | null = null;
    try {
      chatId = await createOrActivateChat(
        req.user.id, // ID du PRO
        appointment.clientId, // ID du client
        appointment.id! // ID du rendez-vous
      );
    } catch (chatError) {
      console.error('Erreur lors de la création/activation du chat:', chatError);
      // Ne pas faire échouer la confirmation si le chat échoue
    }

    return res.status(200).json({
      success: true,
      data: {
        appointment,
        clientInvoice,
        proInvoice
      },
      message: "Rendez-vous confirmé et paiement traité"
    });
  } catch (error) {
    next(error)
  }
};

// Cancel appointment and refund payment (PRO only)
export const cancelAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Vérification de l'authentification
    if (!req.user) {
      throw new ClientError("L'authentification est requise", 401);
    }

    const updatedAppointment = await cancelAppointmentService(id, req.user.id, req.user?.role);
    return res.status(200).json({
      success: true,
      updatedAppointment,
      message: "Rendez‑vous annulé avec succès"
    });
  } catch (error) {
    next(error)
  }
};

/**
 * Contrôleur pour autoriser le paiement d'un rendez-vous.
 * Seuls les PARTICULIERS (clients) peuvent effectuer cette opération.
 */
export const autoriserPaiementAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;


    // Seuls les PARTICULIERS ont le droit d'autoriser le paiement
    if (req.user!.role !== UserRole.PARTICULIER) {
      throw new ClientError("Seuls les utilisateurs particuliers peuvent autoriser le paiement", 403);
    }

    // Appel du service pour mettre à jour le statut de paiement
    const appointment = await autoriserPaiementAppointmentService(id, req.user!.id);

    if (!appointment) {
      throw new ClientError("Rendez-vous non trouvé ou pas éligible à l'autorisation de paiement", 404);
    }

    return res.status(200).json({
      success: true,
      data: appointment,
      message: "Le paiement a été autorisé"
    });
  } catch (error) {
    next(error)
  }
};




/**
 * Contrôleur pour évaluer un rendez-vous.
 * Le client envoie l'id du rendez-vous, l'id du professionnel et une note (rating sur 5).
 */
export const evaluerAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId, proId, rating } = req.body;

    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      throw new ClientError("L'authentification est requise", 401);
    }
    // Seul un client (PARTICULIER) peut évaluer un rendez-vous
    if (req.user.role !== UserRole.PARTICULIER) {
      throw new ClientError("Seul un client peut évaluer un rendez-vous", 403);
    }

    // Déléguer la logique métier au service
    const evaluationResult = await evaluerAppointmentService(
      appointmentId,
      proId,
      req.user.id,
      Number(rating)
    );

    return res.status(200).json({
      success: true,
      data: evaluationResult,
      message: "Évaluation enregistrée avec succès"
    });
  } catch (error) {
    next(error);
  }
};

