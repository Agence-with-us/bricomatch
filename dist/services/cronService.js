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
exports.CronService = void 0;
// src/services/cronService.ts
const node_cron_1 = __importDefault(require("node-cron"));
const evaluationProcessingService_1 = require("./evaluationProcessingService");
/**
 * Service de gestion des tâches cron
 */
class CronService {
    constructor() {
        this.evaluationJobStarted = false;
        this.payoutJobStarted = false;
    }
    static getInstance() {
        if (!CronService.instance) {
            CronService.instance = new CronService();
        }
        return CronService.instance;
    }
    /**
     * Démarre tous les jobs cron
     */
    startAllJobs() {
        this.startEvaluationProcessingJob();
        //this.startPayoutProcessingJob();
        console.log('🚀 Tous les jobs cron ont été démarrés');
    }
    /**
     * Job cron qui s'exécute à 03h00 du matin pour traiter les évaluations
     */
    startEvaluationProcessingJob() {
        if (this.evaluationJobStarted) {
            console.log('⚠️ Job d\'évaluation déjà démarré');
            return;
        }
        // Cron job qui s'exécute tous les jours à 03h00
        node_cron_1.default.schedule('0 3 * * *', () => __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Début du traitement des évaluations à 03h00');
            try {
                yield (0, evaluationProcessingService_1.processEvaluations)();
                console.log('✅ Traitement des évaluations terminé avec succès');
            }
            catch (error) {
                console.error('❌ Erreur lors du traitement des évaluations:', error);
            }
        }));
        this.evaluationJobStarted = true;
        console.log('📅 Job d\'évaluation programmé pour 03h00 chaque jour');
    }
    /**
     * Job cron pour traiter les paiements en attente (PENDING_PAYOUT vers PAID_OUT)
     * S'exécute toutes les heures pour vérifier les RDV en attente depuis 48h
     */
    startPayoutProcessingJob() {
        if (this.payoutJobStarted) {
            console.log('⚠️ Job de paiement déjà démarré');
            return;
        }
        // Cron job qui s'exécute toutes les heures
        node_cron_1.default.schedule('*/2 * * * *', () => __awaiter(this, void 0, void 0, function* () {
            console.log('💰 Vérification des paiements en attente (48h)');
            try {
                yield (0, evaluationProcessingService_1.processPendingPayouts)();
                console.log('✅ Traitement des paiements terminé avec succès');
            }
            catch (error) {
                console.error('❌ Erreur lors du traitement des paiements:', error);
            }
        }));
        this.payoutJobStarted = true;
        console.log('💰 Job de paiement programmé toutes les heures');
    }
}
exports.CronService = CronService;
