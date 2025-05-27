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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCache = exports.setCachedData = exports.getCachedData = exports.getRedisClient = exports.initializeRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let redisClient = null;
const initializeRedis = () => {
    if (!redisClient) {
        try {
            redisClient = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });
            redisClient.on('connect', () => {
                console.log('Redis connected successfully');
            });
            redisClient.on('error', (err) => {
                console.error('Redis connection error:', err);
            });
        }
        catch (error) {
            console.error('Redis initialization error:', error);
            throw error;
        }
    }
    return redisClient;
};
exports.initializeRedis = initializeRedis;
const getRedisClient = () => {
    if (!redisClient) {
        return (0, exports.initializeRedis)();
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const getCachedData = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const client = (0, exports.getRedisClient)();
    try {
        const data = yield client.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error(`Error getting cached data for ${key}:`, error);
        return null;
    }
});
exports.getCachedData = getCachedData;
const setCachedData = (key_1, data_1, ...args_1) => __awaiter(void 0, [key_1, data_1, ...args_1], void 0, function* (key, data, ttl = parseInt(process.env.REDIS_CACHE_TTL || '3600')) {
    const client = (0, exports.getRedisClient)();
    try {
        yield client.set(key, JSON.stringify(data), 'EX', ttl);
        return true;
    }
    catch (error) {
        console.error(`Error setting cached data for ${key}:`, error);
        return false;
    }
});
exports.setCachedData = setCachedData;
const invalidateCache = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const client = (0, exports.getRedisClient)();
    try {
        yield client.del(key);
        return true;
    }
    catch (error) {
        console.error(`Error invalidating cache for ${key}:`, error);
        return false;
    }
});
exports.invalidateCache = invalidateCache;
