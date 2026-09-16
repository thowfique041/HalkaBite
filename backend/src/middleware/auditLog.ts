import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { SystemAuditLog } from '../models';

const describeClient = (agent: string) => ({
  browser: /Edg\//.test(agent) ? 'Microsoft Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : 'Other browser',
  device: /Mobile|Android|iPhone|iPad/i.test(agent) ? 'Mobile device' : 'Desktop device'
});

const actionFor = (method: string, path: string) => {
  if (path === '/api/auth/login') return 'auth.login';
  if (path === '/api/auth/register') return 'auth.register';
  if (path === '/api/auth/logout') return 'auth.logout';
  return `${method.toLowerCase()} ${path}`;
};

export const auditActivity = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const cleanPath = req.originalUrl.split('?')[0];
  const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && cleanPath !== '/api/health';
  if (shouldLog) {
    res.on('finish', () => {
      const user = req.user;
      const agent = req.get('user-agent') || 'Unknown';
      const client = describeClient(agent);
      SystemAuditLog.create({
        actor: user?._id,
        actorName: user?.name,
        actorEmail: user?.email,
        actorRole: user?.role || 'guest',
        action: actionFor(req.method, cleanPath),
        method: req.method,
        path: cleanPath,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        ip: req.ip || req.socket.remoteAddress || 'Unknown',
        ...client,
        durationMs: Date.now() - startedAt
      }).catch(error => console.error('Audit log write failed:', error));
    });
  }
  next();
};
