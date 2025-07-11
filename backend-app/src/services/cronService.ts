// src/services/cronService.ts
import cron from 'node-cron';
import { processEvaluations, processPendingPayouts } from './evaluationProcessingService';
import { processExpiredPaymentInitiatedAppointments, processAppointmentReminders } from './appointmentService';
import fs from 'fs/promises';
import path from 'path';
import { desactiverChatPourAppointment, createOrActivateChat } from './chatService';

/**
 * Service de gestion des tâches cron
 */
export class CronService {
    private static instance: CronService;
    private evaluationJobStarted = false;
    private payoutJobStarted = false;

    private constructor() { }

    public static getInstance(): CronService {
        if (!CronService.instance) {
            CronService.instance = new CronService();
        }
        return CronService.instance;
    }

    /**
     * Démarre tous les jobs cron
     */
    public startAllJobs(): void {
        this.startEvaluationProcessingJob();
        //this.startPayoutProcessingJob();
        this.startExpiredPaymentInitiatedCleanupJob();
        this.startAppointmentRemindersJob();
        this.startDailyRemindersFileJob();
        this.startChatActivationJob();
        console.log('🚀 Tous les jobs cron ont été démarrés');
    }

    /**
     * Job cron qui s'exécute à 03h00 du matin pour traiter les évaluations
     */
    public startEvaluationProcessingJob(): void {
        if (this.evaluationJobStarted) {
            console.log('⚠️ Job d\'évaluation déjà démarré');
            return;
        }

        // Cron job qui s'exécute tous les jours à 03h00
        cron.schedule('0 3 * * *', async () => {
            console.log('🔄 Début du traitement des évaluations à 03h00');
            try {
                await processEvaluations();
                console.log('✅ Traitement des évaluations terminé avec succès');
            } catch (error) {
                console.error('❌ Erreur lors du traitement des évaluations:', error);
            }
        });

        this.evaluationJobStarted = true;
        console.log('📅 Job d\'évaluation programmé pour 03h00 chaque jour');
    }

    /**
     * Job cron pour traiter les paiements en attente (PENDING_PAYOUT vers PAID_OUT)
     * S'exécute toutes les heures pour vérifier les RDV en attente depuis 48h
     */
    public startPayoutProcessingJob(): void {
        if (this.payoutJobStarted) {
            console.log('⚠️ Job de paiement déjà démarré');
            return;
        }

        // Cron job qui s'exécute toutes les heures
        cron.schedule('*/2 * * * *', async () => {
            console.log('💰 Vérification des paiements en attente (48h)');
            try {
                await processPendingPayouts();
                console.log('✅ Traitement des paiements terminé avec succès');
            } catch (error) {
                console.error('❌ Erreur lors du traitement des paiements:', error);
            }
        });

        this.payoutJobStarted = true;
        console.log('💰 Job de paiement programmé toutes les heures');
    }

    /**
     * Job cron pour supprimer les RDV PAYMENT_INITIATED expirés (créés il y a plus de 10 min)
     * S'exécute toutes les 10 minutes
     */
    public startExpiredPaymentInitiatedCleanupJob(): void {
        cron.schedule('*/10 * * * *', async () => {
            console.log('🕒 Nettoyage des RDV PAYMENT_INITIATED expirés (>10min)');
            try {
                await processExpiredPaymentInitiatedAppointments();
                console.log('✅ Nettoyage des RDV PAYMENT_INITIATED expirés terminé');
            } catch (error) {
                console.error('❌ Erreur lors du nettoyage des RDV PAYMENT_INITIATED expirés:', error);
            }
        });
        console.log('🕒 Job de nettoyage PAYMENT_INITIATED programmé toutes les 10 minutes');
    }

    /**
     * Job cron pour envoyer les notifications de rappel RDV (15min, 5min, 2min avant)
     * S'exécute toutes les minutes
     */
    public startAppointmentRemindersJob(): void {
        cron.schedule('* * * * *', async () => {
            console.log('🔔 Vérification des RDV à rappeler (15min, 5min, 2min)');
            try {
                await processAppointmentReminders();
                console.log('✅ Notifications de rappel envoyées');
            } catch (error) {
                console.error('❌ Erreur lors de l\'envoi des notifications de rappel:', error);
            }
        });
        console.log('🔔 Job de rappel RDV programmé chaque minute');
    }

    /**
     * Job cron pour générer le fichier reminders.json à 05h00 chaque jour
     */
    public startDailyRemindersFileJob(): void {
        // Tous les jours à 05h00
        cron.schedule('0 5 * * *', async () => {
            console.log('📝 Génération du fichier reminders.json à 05h00');
            try {
                const { generateDailyRemindersFile } = await import('./appointmentService');
                await generateDailyRemindersFile();
                console.log('✅ reminders.json généré avec succès');
            } catch (error) {
                console.error('❌ Erreur lors de la génération de reminders.json:', error);
            }
        });
        console.log('📝 Job de génération reminders.json programmé pour 05h00 chaque jour');
    }

    /**
     * Job cron pour activer/désactiver les chats selon les RDV en cours (toutes les 30s)
     */
    public startChatActivationJob(): void {
        cron.schedule('*/30 * * * * *', async () => {
            try {
                const remindersPath = path.resolve(__dirname, '../../reminders.json');
                const data = await fs.readFile(remindersPath, 'utf-8');
                const reminders = JSON.parse(data);
                const now = Date.now();
                for (const rdv of reminders) {
                    if (!rdv.dateTime || !rdv.duration) continue;
                    const start = rdv.dateTime._seconds * 1000;
                    const end = start + rdv.duration * 60000;
                    if (now >= start && now < end) {
                        // RDV en cours : activer le chat
                        await createOrActivateChat(rdv.proId, rdv.clientId, rdv.id);
                    } else {
                        // RDV pas en cours : désactiver le chat
                        await desactiverChatPourAppointment(rdv.id);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de l\'activation/désactivation des chats:', error);
            }
        });
        console.log('💬 Job d\'activation/désactivation des chats programmé toutes les 30 secondes');
    }
}