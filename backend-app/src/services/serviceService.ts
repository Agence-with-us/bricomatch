import { getFirestore } from '../config/firebase';
import { Service } from '../types';

const db = getFirestore();
const servicesCollection = db.collection('services');

// Get all services
export const getServices = async (): Promise<Service[]> => {
  try {
    const snapshot = await servicesCollection.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Service));
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

// Get service by id
export const getServiceById = async (id: string): Promise<Service | null> => {
  try {
    const doc = await servicesCollection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    } as Service;
  } catch (error) {
    console.error(`Error fetching service with ID ${id}:`, error);
    throw error;
  }
};

// Seed services (for development/testing)
export const seedServices = async (): Promise<void> => {
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
    
    await batch.commit();
    console.log('Services seeded successfully');
  } catch (error) {
    console.error('Error seeding services:', error);
    throw error;
  }
};