"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderTemplate = exports.getAccountActivatedTemplate = exports.getBankingSetupTemplate = exports.getCompleteProfileTemplate = void 0;
// Template de base HTML
const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'BricoMatch'}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔨 BricoMatch</div>
            <p>Votre plateforme de mise en relation professionnelle</p>
        </div>
        ${content}
        <div class="footer">
            <p>© 2025 BricoMatch - Tous droits réservés</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html>
`;
// ==========================================
// TEMPLATES SPÉCIFIQUES
// ==========================================
// Template: Compléter le profil professionnel
const getCompleteProfileTemplate = (userName, onboardingUrl) => {
    const content = `
    <h2>🎯 Finalisez votre inscription professionnelle</h2>
    
    <p>Bonjour <strong>${userName}</strong>,</p>
    
    <p>Félicitations ! Votre compte professionnel BricoMatch a été créé avec succès. 🎉</p>
    
    <div class="warning">
        <strong>⚠️ Action requise :</strong> Pour commencer à recevoir des demandes de devis et être rémunéré, vous devez compléter votre profil professionnel.
    </div>
    
    <h3>📋 Étapes à finaliser :</h3>
    <ul>
        <li>✅ Vérifier vos informations personnelles</li>
        <li>🏦 Configurer vos informations bancaires</li>
        <li>📄 Compléter votre profil professionnel</li>
        <li>🔐 Valider votre identité</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${onboardingUrl}" class="button">
            🚀 Finaliser mon inscription
        </a>
    </div>
    
    <h3>💡 Pourquoi compléter votre profil ?</h3>
    <ul>
        <li><strong>Recevez des demandes :</strong> Seuls les profils complets apparaissent dans les recherches</li>
        <li><strong>Soyez payé :</strong> Configuration bancaire requise pour les paiements</li>
        <li><strong>Inspirez confiance :</strong> Profil vérifié = plus de clients</li>
    </ul>
    
    <div class="success">
        <strong>🎁 Bonus :</strong> Les 10 premiers professionnels à compléter leur profil bénéficient d'une mise en avant gratuite pendant 1 mois !
    </div>
    
    <p>Si vous avez des questions, notre équipe support est là pour vous aider.</p>
    
    <p>À très bientôt sur BricoMatch ! 👷‍♂️</p>
  `;
    return baseTemplate(content, "Finalisez votre inscription - BricoMatch");
};
exports.getCompleteProfileTemplate = getCompleteProfileTemplate;
// Template: Configuration bancaire requise
const getBankingSetupTemplate = (userName, dashboardUrl, accountStatus) => {
    const content = `
    <h2>🏦 Configuration de vos informations bancaires</h2>
    
    <p>Bonjour <strong>${userName}</strong>,</p>
    
    <p>Votre compte professionnel BricoMatch est presque prêt ! Il ne manque plus que la configuration de vos informations bancaires pour pouvoir recevoir vos paiements.</p>
    
    ${accountStatus ? `
    <div class="warning">
        <strong>Statut actuel :</strong> <span class="highlight">${accountStatus}</span>
    </div>
    ` : ''}
    
    <h3>🔧 Informations bancaires à configurer :</h3>
    <ul>
        <li>💳 <strong>IBAN :</strong> Pour recevoir vos paiements</li>
        <li>🆔 <strong>Pièce d'identité :</strong> Vérification obligatoire</li>
        <li>🏢 <strong>Informations professionnelles :</strong> Statut, SIRET si applicable</li>
        <li>📊 <strong>Déclaration fiscale :</strong> Pour la conformité TVA</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">
            🏦 Configurer mes informations bancaires
        </a>
    </div>
    
    <div class="warning">
        <strong>⏰ Important :</strong> Sans ces informations, vous ne pourrez pas :
        <ul>
            <li>Recevoir de paiements pour vos prestations</li>
            <li>Apparaître dans les résultats de recherche</li>
            <li>Accéder à toutes les fonctionnalités professionnelles</li>
        </ul>
    </div>
    
    <h3>🔒 Sécurité et confidentialité</h3>
    <p>Vos informations bancaires sont :</p>
    <ul>
        <li>🛡️ <strong>Sécurisées</strong> par notre partenaire bancaire certifié</li>
        <li>🔐 <strong>Chiffrées</strong> selon les standards européens</li>
        <li>👁️ <strong>Confidentielles</strong> et non partagées avec des tiers</li>
    </ul>
    
    <p>Le processus ne prend que <strong>5 minutes</strong> et est entièrement sécurisé.</p>
    
    <p>Merci de votre confiance ! 🤝</p>
  `;
    return baseTemplate(content, "Configuration bancaire requise - BricoMatch");
};
exports.getBankingSetupTemplate = getBankingSetupTemplate;
// Template: Compte activé avec succès
const getAccountActivatedTemplate = (userName, dashboardUrl) => {
    const content = `
    <h2>🎉 Votre compte professionnel est activé !</h2>
    
    <p>Excellente nouvelle <strong>${userName}</strong> !</p>
    
    <div class="success">
        <strong>✅ Votre compte professionnel BricoMatch est maintenant entièrement activé !</strong>
    </div>
    
    <p>Vous pouvez désormais :</p>
    <ul>
        <li>📬 <strong>Recevoir des demandes de devis</strong> de clients dans votre secteur</li>
        <li>💰 <strong>Être rémunéré</strong> pour vos prestations</li>
        <li>📊 <strong>Accéder à votre tableau de bord</strong> professionnel complet</li>
        <li>🔔 <strong>Gérer vos notifications</strong> et préférences</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">
            🚀 Accéder à mon tableau de bord
        </a>
    </div>
    
    <h3>🎯 Prochaines étapes pour maximiser vos opportunités :</h3>
    <ol>
        <li><strong>Personnalisez votre profil :</strong> Ajoutez photos, descriptions, certifications</li>
        <li><strong>Définissez vos zones :</strong> Précisez vos secteurs d'intervention</li>
        <li><strong>Activez les notifications :</strong> Ne ratez aucune opportunité</li>
        <li><strong>Complétez votre portfolio :</strong> Montrez vos plus belles réalisations</li>
    </ol>
    
    <div class="success">
        <strong>🎁 Bonus de bienvenue :</strong> Profitez de 30 jours de mise en avant gratuite pour démarrer en force !
    </div>
    
    <p>Bienvenue dans la communauté BricoMatch ! 👷‍♂️👷‍♀️</p>
    
    <p>L'équipe BricoMatch</p>
  `;
    return baseTemplate(content, "Compte activé avec succès - BricoMatch");
};
exports.getAccountActivatedTemplate = getAccountActivatedTemplate;
// Template: Rappel action requise
const getReminderTemplate = (userName, actionUrl, actionType, daysLeft) => {
    const content = `
    <h2>⏰ Rappel : Action requise sur votre compte</h2>
    
    <p>Bonjour <strong>${userName}</strong>,</p>
    
    <p>Nous avons remarqué que vous n'avez pas encore finalisé la configuration de votre compte professionnel.</p>
    
    <div class="warning">
        <strong>Action requise :</strong> ${actionType}
        ${daysLeft ? `<br><strong>Temps restant :</strong> ${daysLeft} jours` : ''}
    </div>
    
    <p><strong>Pourquoi c'est important ?</strong></p>
    <ul>
        <li>🚫 Votre profil n'apparaît pas dans les recherches</li>
        <li>💸 Vous ratez des opportunités de revenus</li>
        <li>📉 Votre visibilité est limitée</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${actionUrl}" class="button">
            ✅ Finaliser maintenant
        </a>
    </div>
    
    <p>Cela ne prend que quelques minutes et vous permettra de commencer à recevoir des demandes dès aujourd'hui !</p>
    
    <p>Besoin d'aide ? Contactez-nous, nous sommes là pour vous accompagner. 🤝</p>
  `;
    return baseTemplate(content, "Rappel - Action requise - BricoMatch");
};
exports.getReminderTemplate = getReminderTemplate;
// ==========================================
// FONCTIONS D'ENVOI SIMPLIFIÉES
// ==========================================
// Envoyer email de finalisation de profil
// export const sendCompleteProfileEmail = async (userEmail: string, userName: string, onboardingUrl: string) => {
//   await sendEmail({
//     to: userEmail,
//     subject: "🎯 Finalisez votre inscription BricoMatch - Dernière étape !",
//     html: getCompleteProfileTemplate(userName, onboardingUrl)
//   });
// };
// // Envoyer email de configuration bancaire
// export const sendBankingSetupEmail = async (userEmail: string, userName: string, dashboardUrl: string, accountStatus?: string) => {
//   await sendEmail({
//     to: userEmail,
//     subject: "🏦 Configuration bancaire requise - BricoMatch",
//     html: getBankingSetupTemplate(userName, dashboardUrl, accountStatus)
//   });
// };
// // Envoyer email de compte activé
// export const sendAccountActivatedEmail = async (userEmail: string, userName: string, dashboardUrl: string) => {
//   await sendEmail({
//     to: userEmail,
//     subject: "🎉 Votre compte BricoMatch est activé !",
//     html: getAccountActivatedTemplate(userName, dashboardUrl)
//   });
// };
// // Envoyer rappel
// export const sendReminderEmail = async (userEmail: string, userName: string, actionUrl: string, actionType: string, daysLeft?: number) => {
//   await sendEmail({
//     to: userEmail,
//     subject: "⏰ Rappel BricoMatch - Action requise",
//     html: getReminderTemplate(userName, actionUrl, actionType, daysLeft)
//   });
// };
