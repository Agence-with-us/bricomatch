import { getFirestore } from '../config/firebase';
import { UserLocal } from '../types';
import { getCachedData, setCachedData } from '../config/redis';

const db = getFirestore();
const usersCollection = db.collection('users');

// Get user by ID
export const getUserById = async (id: string): Promise<UserLocal | null> => {
  try {
    // Check cache first
    const cacheKey = `user:${id}`;
    const cachedUser = await getCachedData<UserLocal>(cacheKey);
    
    if (cachedUser) {
      return cachedUser;
    }
    
    // If not in cache, fetch from Firestore
    const doc = await usersCollection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const user = { id: doc.id, ...doc.data() } as UserLocal;
    
    // Store in cache
    await setCachedData(cacheKey, user);
    
    return user;
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    throw error;
  }
};

// Get multiple users by their IDs
export const getUsersByIds = async (ids: string[]): Promise<UserLocal[]> => {
  try {
    if (!ids.length) {
      return [];
    }
    
    // Try to get users from cache first
    const cachedUsers: (UserLocal | null)[] = await Promise.all(
      ids.map(id => getCachedData<UserLocal>(`user:${id}`))
    );
    
    // Filter out the ones we couldn't find in cache
    const missingIds = ids.filter((id, index) => !cachedUsers[index]);
    
    let firestoreUsers: UserLocal[] = [];
    
    if (missingIds.length) {
      // Fetch missing users from Firestore
      const snapshot = await usersCollection
        .where('__name__', 'in', missingIds)
        .get();
      
      firestoreUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserLocal));
      
      // Cache the newly fetched users
      await Promise.all(
        firestoreUsers.map(user => 
          setCachedData(`user:${user.id}`, user)
        )
      );
    }
    
    // Combine cached and freshly fetched users
    const allUsers = [...cachedUsers.filter(Boolean) as UserLocal[], ...firestoreUsers];
    
    // Return users in the same order as the input IDs
    return ids.map(id => allUsers.find(user => user.id === id))
      .filter(Boolean) as UserLocal[];
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    throw error;
  }
};