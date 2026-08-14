import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthSession, User } from '../models';
import { ApiError } from '../utils/apiResponse';

export interface AuthRequest extends Request {
  user?: any;
  sessionId?: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Check for token in header or cookies
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Adds the current user when a valid token is present, while keeping public AI/help routes accessible.
export const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : req.cookies?.token;
    if (!token) return next();
    const decoded = verifyToken(token);
    if (decoded.sessionId) {
      const session = await AuthSession.findOne({ tokenId: decoded.sessionId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
      if (!session) return res.status(401).json({ success: false, message: 'This login session is no longer active' });
      req.sessionId = decoded.sessionId;
      AuthSession.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } }).catch(() => undefined);
    }
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};
