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
exports.seedServices = exports.getServiceById = exports.getServices = void 0;
const firebase_1 = require("../config/firebase");
const db = (0, firebase_1.getFirestore)();
const servicesCollection = db.collection('services');
// Get all services
const getServices = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield servicesCollection.get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Error fetching services:', error);
        throw error;
    }
});
exports.getServices = getServices;
// Get service by id
const getServiceById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield servicesCollection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    }
    catch (error) {
        console.error(`Error fetching service with ID ${id}:`, error);
        throw error;
    }
});
exports.getServiceById = getServiceById;
// Seed services (for development/testing)
const seedServices = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const services = [
            {
                name: 'Plumbing',
                imageUrl: 'https://example.com/images/plumbing.jpg',
                description: 'All plumbing services for your home'
            },
            {
                name: 'Electrical',
                imageUrl: 'https://example.com/images/electrical.jpg',
                description: 'Electrical installation and repairs'
            },
            {
                name: 'Carpentry',
                imageUrl: 'https://example.com/images/carpentry.jpg',
                description: 'Custom woodworking and furniture repairs'
            },
            {
                name: 'Painting',
                imageUrl: 'https://example.com/images/painting.jpg',
                description: 'Interior and exterior painting services'
            }
        ];
        const batch = db.batch();
        services.forEach(service => {
            const docRef = servicesCollection.doc();
            batch.set(docRef, service);
        });
        yield batch.commit();
        console.log('Services seeded successfully');
    }
    catch (error) {
        console.error('Error seeding services:', error);
        throw error;
    }
});
exports.seedServices = seedServices;
