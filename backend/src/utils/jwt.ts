import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { IUserDocument } from '../models/User';

export const generateToken = (user: IUserDocument): string => {
  const secret: Secret = process.env.JWT_SECRET || 'your_jwt_secret';
  const options: SignOptions = {
    expiresIn: '7d'
  };
  
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    secret,
    options
  );
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
};
