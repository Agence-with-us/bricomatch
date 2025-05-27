"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientErrorMiddleware = clientErrorMiddleware;
const ClientError_1 = require("../helpers/ClientError");
function clientErrorMiddleware(err, req, res, next) {
    // Si l'erreur est une instance de ClientError, utiliser le code et le message fournis
    if (err instanceof ClientError_1.ClientError) {
        return res.status(err.status).json({
            success: false,
            clientError: err.message,
        });
    }
    // Pour toutes les autres erreurs, tenter d'extraire un code et un message
    const status = (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number')
        ? err.status
        : 500;
    const message = (err && typeof err === 'object' && 'message' in err)
        ? err.message
        : 'Internal Server Error';
    return res.status(status).json({
        success: false,
        clientError: message,
    });
}
