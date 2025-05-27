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
exports.sendEmail = void 0;
// config/email.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
// Configuration du transporteur Nodemailer pour IONOS
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.ionos.fr',
    port: 465,
    secure: true,
    auth: {
        user: "ne-pas-repondre@preprod-withus.fr",
        pass: "5Fb23bUN3Bf*+3?"
    }
});
// Fonction principale d'envoi d'email
const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: options.from || "ne-pas-repondre@preprod-withus.fr",
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments
    };
    try {
        const info = yield transporter.sendMail(mailOptions);
        console.log(`✅ Email envoyé à ${options.to}: ${info.messageId}`);
        return info;
    }
    catch (error) {
        console.error(`❌ Erreur envoi email à ${options.to}:`, error);
        throw error;
    }
});
exports.sendEmail = sendEmail;
