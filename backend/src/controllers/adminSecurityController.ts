import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { AuthSession, SystemAuditLog } from '../models';

const positiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

export const getActiveSessions = async (_req: AuthRequest, res: Response) => {
  try {
    const sessions = await AuthSession.find({ revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .select('-tokenId')
      .populate('user', 'name email role avatar')
      .sort({ lastActiveAt: -1 })
      .lean();
    const counts = new Map<string, number>();
    sessions.forEach(session => {
      const user = session.user as unknown as { _id?: mongoose.Types.ObjectId };
      if (user?._id) counts.set(String(user._id), (counts.get(String(user._id)) || 0) + 1);
    });
    return res.json({
      success: true,
      data: sessions,
      summary: {
        totalActiveSessions: sessions.length,
        uniqueUsers: counts.size,
        multipleDeviceUsers: [...counts.values()].filter(count => count > 1).length
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Could not load active sessions' });
  }
};

export const revokeActiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const session = await AuthSession.findOneAndUpdate(
      { _id: req.params.id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ success: false, message: 'Active session not found' });
    return res.json({ success: true, message: 'Device session logged out' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Could not revoke session' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = positiveInt(req.query.page, 1, 100000);
    const limit = positiveInt(req.query.limit, 25, 100);
    const filter: Record<string, unknown> = {};
    if (req.query.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.query.method))) filter.method = req.query.method;
    if (req.query.result === 'success') filter.success = true;
    if (req.query.result === 'failed') filter.success = false;
    if (req.query.role) filter.actorRole = req.query.role;
    if (req.query.search) {
      const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['actorName', 'actorEmail', 'action', 'path', 'ip'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const [logs, total, last24Hours, failedLast24Hours] = await Promise.all([
      SystemAuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SystemAuditLog.countDocuments(filter),
      SystemAuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      SystemAuditLog.countDocuments({ success: false, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);
    return res.json({
      success: true,
      data: logs,
      summary: { last24Hours, failedLast24Hours },
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Could not load audit logs' });
  }
};
