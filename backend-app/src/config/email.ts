// config/email.ts
import nodemailer from "nodemailer";

// Configuration du transporteur Nodemailer pour IONOS
const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.fr',
    port: 465,
    secure: true,
    auth: {
        user: "ne-pas-repondre@preprod-withus.fr",
        pass: "5Fb23bUN3Bf*+3?"
    }
});


// Interface pour les options d'email
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
    from?: string;
}

// Fonction principale d'envoi d'email
export const sendEmail = async (options: EmailOptions) => {
    const mailOptions = {
        from: options.from || "ne-pas-repondre@preprod-withus.fr",
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email envoyé à ${options.to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ Erreur envoi email à ${options.to}:`, error);
        throw error;
    }
};


