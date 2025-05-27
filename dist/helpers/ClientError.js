"use strict";
// ClientError.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = void 0;
class ClientError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        // Rétablit correctement le prototype pour une bonne instance de la classe
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ClientError = ClientError;
