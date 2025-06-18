// src/services/cronService.ts
import cron from 'node-cron';
import { processEvaluations, processPendingPayouts } from './evaluationProcessingService';

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

}