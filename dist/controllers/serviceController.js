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
exports.getServiceById = exports.getAllServices = void 0;
const serviceService_1 = require("../services/serviceService");
// Get all services
const getAllServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Try to get from cache first
        // const cachedServices = await getCachedData<Service[]>('services');
        // if (cachedServices) {
        //   return res.status(200).json({
        //     success: true,
        //     data: cachedServices,
        //     message: 'Services retrieved from cache'
        //   });
        // }
        // If not in cache, fetch from Firestore
        const services = yield (0, serviceService_1.getServices)();
        // Store in cache
        // await setCachedData('services', services);
        return res.status(200).json({
            success: true,
            data: services,
            message: 'Services retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching services:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve services'
        });
    }
});
exports.getAllServices = getAllServices;
// Get service by ID
const getServiceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Try to get from cache first
        // const cacheKey = `service:${id}`;
        // const cachedService = await getCachedData<Service>(cacheKey);
        // if (cachedService) {
        //   return res.status(200).json({
        //     success: true,
        //     data: cachedService,
        //     message: 'Service retrieved from cache'
        //   });
        // }
        // If not in cache, fetch from Firestore
        const service = yield (0, serviceService_1.getServiceById)(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        // Store in cache
        // await setCachedData(cacheKey, service);
        return res.status(200).json({
            success: true,
            data: service,
            message: 'Service retrieved successfully'
        });
    }
    catch (error) {
        console.error(`Error fetching service with ID ${req.params.id}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve service'
        });
    }
});
exports.getServiceById = getServiceById;
