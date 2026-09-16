import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { IUserDocument } from '../models/User';

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32 || /^your[_-]/i.test(secret)) {
    throw new Error('JWT_SECRET must be configured with at least 32 non-placeholder characters');
  }
  return secret;
};

export const generateToken = (user: IUserDocument, sessionId?: string): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn']
  };
  
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, ...(sessionId && { sessionId }) },
    getJwtSecret(),
    options
  );
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getJwtSecret());
};
