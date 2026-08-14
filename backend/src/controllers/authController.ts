import { Request, Response } from 'express';
import { AuthSession, User } from '../models';
import { generateToken } from '../utils/jwt';
import { sendWelcomeEmail } from '../utils/email';
import { AuthRequest } from '../middleware/auth';
import cloudinary from '../config/cloudinary';
import crypto from 'crypto';

const profileFields = ['name', 'username', 'email', 'phone', 'bio'] as const;
const publicIdFromUrl = (url?: string) => {
  if (!url) return undefined;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  return match?.[1];
};
const destroyAvatar = async (publicId?: string) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
};
const safeUser = (user: { toObject(): Record<string, unknown> }) => {
  const value = user.toObject();
  delete value.password;
  delete value.avatarPublicId;
  return value;
};
const clientInfo = (req: Request) => {
  const agent = req.get('user-agent') || 'Unknown';
  const browser = /Edg\//.test(agent) ? 'Microsoft Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : 'Other browser';
  const device = /Mobile|Android|iPhone|iPad/i.test(agent) ? 'Mobile device' : 'Desktop device';
  return { browser, device, ip: req.ip || req.socket.remoteAddress || 'Unknown' };
};
const createSession = async (userId: string, req: Request) => {
  const tokenId = crypto.randomUUID();
  await AuthSession.create({ user:userId, tokenId, ...clientInfo(req), expiresAt:new Date(Date.now()+7*24*60*60*1000) });
  return tokenId;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    user.lastLogin = new Date();
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: user.lastLogin } });

    const sessionId = await createSession(String(user._id), req);
    const token = generateToken(user, sessionId);

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(email, name).catch(console.error);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: safeUser(user),
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.lastLogin = new Date();
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: user.lastLogin } });

    const sessionId = await createSession(String(user._id), req);
    const token = generateToken(user, sessionId);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser(user),
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response) => {
  if (req.sessionId) await AuthSession.updateOne({ tokenId:req.sessionId, user:req.user._id }, { $set:{ revokedAt:new Date() } });
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};
    const removals: Record<string, 1> = {};
    profileFields.forEach(field => {
      if (field === 'name' && req.user.role === 'admin') return;
      if (req.body[field] === undefined) return;
      const value = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      if (['username', 'phone', 'bio'].includes(field) && value === '') removals[field] = 1;
      else updates[field] = value;
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...(Object.keys(updates).length && { $set: updates }), ...(Object.keys(removals).length && { $unset: removals }) },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error: any) {
    res.status(error?.code === 11000 ? 409 : 400).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  const sessions = await AuthSession.find({ user:req.user._id, revokedAt:{ $exists:false }, expiresAt:{ $gt:new Date() } }).sort({ lastActiveAt:-1 }).lean();
  return res.json({success:true,data:sessions.map(session=>({...session,isCurrent:session.tokenId===req.sessionId,tokenId:undefined}))});
};
export const revokeSession = async (req: AuthRequest, res: Response) => {
  const session=await AuthSession.findOneAndUpdate({_id:req.params.id,user:req.user._id,revokedAt:{$exists:false}},{$set:{revokedAt:new Date()}},{new:true});
  if(!session)return res.status(404).json({success:false,message:'Active session not found'});
  return res.json({success:true,message:'Session logged out',data:{loggedOutCurrent:session.tokenId===req.sessionId}});
};
export const revokeOtherSessions = async (req: AuthRequest, res: Response) => {
  await AuthSession.updateMany({user:req.user._id,tokenId:{$ne:req.sessionId},revokedAt:{$exists:false}},{$set:{revokedAt:new Date()}});
  return res.json({success:true,message:'All other sessions logged out'});
};
export const revokeAllSessions = async (req: AuthRequest, res: Response) => {
  await AuthSession.updateMany({user:req.user._id,revokedAt:{$exists:false}},{$set:{revokedAt:new Date()}});
  res.clearCookie('token');return res.json({success:true,message:'All sessions logged out'});
};

export const uploadProfileAvatar = async (req: AuthRequest, res: Response) => {
  const file = req.file as (Express.Multer.File & { filename?: string }) | undefined;
  if (!file) return res.status(400).json({ success: false, message: 'Please select a JPEG, PNG, or WebP image' });
  const newPublicId = file.filename || publicIdFromUrl(file.path);
  try {
    const previous = await User.findById(req.user._id).select('+avatarPublicId');
    if (!previous) {
      await destroyAvatar(newPublicId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const oldPublicId = previous.avatarPublicId || publicIdFromUrl(previous.avatar);
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { avatar: file.path, avatarPublicId: newPublicId } }, { new: true, runValidators: true });
    if (oldPublicId && oldPublicId !== newPublicId) destroyAvatar(oldPublicId).catch(error => console.error('Previous profile image cleanup failed:', error));
    return res.status(200).json({ success: true, message: 'Profile picture updated successfully', data: user });
  } catch (error) {
    await destroyAvatar(newPublicId).catch(() => undefined);
    console.error('Profile picture update failed:', error);
    return res.status(500).json({ success: false, message: 'Profile picture could not be saved' });
  }
};

export const removeProfileAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const previous = await User.findById(req.user._id).select('+avatarPublicId');
    if (!previous) return res.status(404).json({ success: false, message: 'User not found' });
    const publicId = previous.avatarPublicId || publicIdFromUrl(previous.avatar);
    const user = await User.findByIdAndUpdate(req.user._id, { $unset: { avatar: 1, avatarPublicId: 1 } }, { new: true });
    await destroyAvatar(publicId).catch(error => console.error('Profile image cleanup failed:', error));
    return res.status(200).json({ success: true, message: 'Profile picture removed', data: user });
  } catch (error) {
    console.error('Profile picture removal failed:', error);
    return res.status(500).json({ success: false, message: 'Profile picture could not be removed' });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { token }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
