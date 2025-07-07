import { NextFunction, Request, Response } from 'express';
import { UserLocal } from '../types';
import { notificationsCollection, usersCollection } from '../config/firebase';
import { createOnboardingLink, createStripeConnectAccount as createStripeConnectAccountService } from '../helpers/stripeHelpers';
import admin from 'firebase-admin';
import { AuthRequest } from '../middleware/auth';
import { ClientError } from '../helpers/ClientError';
import { sendEmail } from '../config/email';
import { getCompleteProfileTemplate } from '../templates/emailTemplates';
import { deleteUserAccount, ensureDeletedAccountExists } from '../services/userService';



export const createStripeConnectAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {

    // Vérifie si l'utilisateur est authentifié
    if (!req.user) {
      throw new ClientError("Authentification requise", 401);
    }
    // Récupérer l'utilisateur depuis Firestore
    const userDoc = await usersCollection.doc(req.user.id).get();
    if (!userDoc.exists) {
      throw new ClientError("Utilisateur introuvable", 404);
    }
    const user = { id: userDoc.id, ...userDoc.data() } as UserLocal;

    console.log(`🔄 Traitement nouveau PRO: ${user.id} - ${user.email}`);

    // Créer le compte Stripe
    const stripeAccountId = await createStripeConnectAccountService(user as UserLocal);

    // Créer le lien d'onboarding
    const onboardingUrl = await createOnboardingLink(stripeAccountId);
    await sendEmail({
      to: user.email,
      subject: "🎯 Finalisez votre inscription BricoMatch - Dernière étape !",
      html: getCompleteProfileTemplate(user.nom, onboardingUrl)
    });

    // Mettre à jour l'utilisateur dans Firestore
    await usersCollection.doc(user.id).update({
      stripeAccountId, // id du compte stripe
      stripeAccountStatus: 'pending', // status du compte stripe
      stripeOnboardingComplete: false, // si le compte stripe est complet
      stripeProcessed: true, // si le compte stripe est traité
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Créer une notification pour informer l'utilisateur
    await notificationsCollection.add({
      type: 'STRIPE_SETUP_REQUIRED',
      userId: user.id,
      title: 'Configuration des paiements',
      message: 'Votre compte professionnel a été créé. Complétez la configuration de vos paiements.',
      data: {
        onboardingUrl,
        stripeAccountId
      },
      createdAt: admin.firestore.Timestamp.now(),
      read: false,
      processed: false
    });

    console.log(`✅ Compte Stripe créé pour ${user.id}: ${stripeAccountId}`);
    console.log(`🔗 Lien onboarding: ${onboardingUrl}`);

    return res.status(201).json({
      success: true
    });

  } catch (error: any) {

    // Marquer comme traité même en cas d'erreur pour éviter les tentatives répétées
    await usersCollection.doc(req.user?.id!).update({
      stripeProcessed: true,
      stripeError: error.message,
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Créer une notification d'erreur
    await notificationsCollection.add({
      type: 'STRIPE_SETUP_ERROR',
      userId: req.user?.id!,
      title: 'Erreur configuration paiements',
      message: 'Une erreur est survenue lors de la configuration de vos paiements. Contactez le support.',
      data: {
        error: error.message
      },
      createdAt: admin.firestore.Timestamp.now(),
      read: false,
      processed: false
    });

    next(error)
  }
};

// Contrôleur pour supprimer son propre compte (utilisateur connecté)
export const deleteMyAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Vérifier l'authentification
    if (!req.user) {
      throw new ClientError("Authentification requise", 401);
    }

    const userId = req.user.id;
    console.log(`🗑️ Demande suppression compte par utilisateur: ${userId}`);

    // Vérifier que l'utilisateur existe
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      throw new ClientError("Utilisateur introuvable", 404);
    }

    // S'assurer que le compte deleted-account existe
    await ensureDeletedAccountExists();

    // Supprimer le compte
    await deleteUserAccount(userId);

    console.log(`✅ Compte supprimé avec succès: ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Votre compte a été supprimé avec succès"
    });

  } catch (error: any) {
    console.error(`❌ Erreur suppression compte ${req.user?.id}:`, error);
    next(error);
  }
};
