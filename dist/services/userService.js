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
exports.getUsersByIds = exports.getUserById = void 0;
const firebase_1 = require("../config/firebase");
// import { getCachedData, setCachedData } from '../config/redis';
const db = (0, firebase_1.getFirestore)();
const usersCollection = db.collection('users');
// Get user by ID
//@ts-ignore
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // // Check cache first
        // const cacheKey = `user:${id}`;
        // const cachedUser = await getCachedData<UserLocal>(cacheKey);
        // if (cachedUser) {
        //   return cachedUser;
        // }
        // // If not in cache, fetch from Firestore
        // const doc = await usersCollection.doc(id).get();
        // if (!doc.exists) {
        //   return null;
        // }
        // const user = { id: doc.id, ...doc.data() } as UserLocal;
        // // Store in cache
        // await setCachedData(cacheKey, user);
        // return user;
    }
    catch (error) {
        console.error(`Error fetching user with ID ${id}:`, error);
        throw error;
    }
});
exports.getUserById = getUserById;
// Get multiple users by their IDs
//@ts-ignore
const getUsersByIds = (ids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // if (!ids.length) {
        //   return [];
        // }
        // // Try to get users from cache first
        // const cachedUsers: (UserLocal | null)[] = await Promise.all(
        //   ids.map(id => getCachedData<UserLocal>(`user:${id}`))
        // );
        // // Filter out the ones we couldn't find in cache
        // const missingIds = ids.filter((id, index) => !cachedUsers[index]);
        // let firestoreUsers: UserLocal[] = [];
        // if (missingIds.length) {
        //   // Fetch missing users from Firestore
        //   const snapshot = await usersCollection
        //     .where('__name__', 'in', missingIds)
        //     .get();
        //   firestoreUsers = snapshot.docs.map(doc => ({
        //     id: doc.id,
        //     ...doc.data()
        //   } as UserLocal));
        //   // Cache the newly fetched users
        //   await Promise.all(
        //     firestoreUsers.map(user => 
        //       setCachedData(`user:${user.id}`, user)
        //     )
        //   );
        // }
        // // Combine cached and freshly fetched users
        // const allUsers = [...cachedUsers.filter(Boolean) as UserLocal[], ...firestoreUsers];
        // // Return users in the same order as the input IDs
        // return ids.map(id => allUsers.find(user => user.id === id))
        //   .filter(Boolean) as UserLocal[];
    }
    catch (error) {
        console.error('Error fetching users by IDs:', error);
        throw error;
    }
});
exports.getUsersByIds = getUsersByIds;
