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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticate = void 0;
const firebase_1 = require("../config/firebase");
const userService_1 = require("../services/userService");
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: No token provided'
            });
        }
        const token = authHeader.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Invalid token format'
            });
        }
        const decodedToken = yield (0, firebase_1.getAuth)().verifyIdToken(token);
        const user = yield (0, userService_1.getUserById)(decodedToken.uid);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User not found'
            });
        }
        console.log(decodedToken);
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid token'
        });
    }
});
exports.authenticate = authenticate;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: User not authenticated'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You do not have permission to access this resource'
            });
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
