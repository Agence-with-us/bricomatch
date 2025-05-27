import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { UserRole } from '../types';
import { getUserById } from '../services/userService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log(token)
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Invalid token format' 
      });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    console.log(decodedToken)

    const user = await getUserById(decodedToken.uid);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: User not found' 
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid token' 
    });
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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