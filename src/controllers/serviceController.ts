import { Request, Response } from 'express';
import { getServices, getServiceById as fetchServiceById } from '../services/serviceService';
import { getCachedData, setCachedData } from '../config/redis';
import { Service, UserLocal } from '../types';
import { notificationsCollection, usersCollection } from '../config/firebase';
import { createOnboardingLink, createStripeConnectAccount } from '../helpers/stripeHelpers';
import admin from 'firebase-admin';


// Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    // Try to get from cache first
    const cachedServices = await getCachedData<Service[]>('services');

    if (cachedServices) {
      return res.status(200).json({
        success: true,
        data: cachedServices,
        message: 'Services retrieved from cache'
      });
    }

    // If not in cache, fetch from Firestore
    const services = await getServices();

    // Store in cache
    await setCachedData('services', services);

    return res.status(200).json({
      success: true,
      data: services,
      message: 'Services retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve services'
    });
  }
};

// Get service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cacheKey = `service:${id}`;
    const cachedService = await getCachedData<Service>(cacheKey);

    if (cachedService) {
      return res.status(200).json({
        success: true,
        data: cachedService,
        message: 'Service retrieved from cache'
      });
    }

    // If not in cache, fetch from Firestore
    const service = await fetchServiceById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Store in cache
    await setCachedData(cacheKey, service);

    return res.status(200).json({
      success: true,
      data: service,
      message: 'Service retrieved successfully'
    });
  } catch (error) {
    console.error(`Error fetching service with ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve service'
    });
  }
};

