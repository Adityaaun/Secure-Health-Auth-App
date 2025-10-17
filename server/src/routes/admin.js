import express from 'express';
import User from '../models/User.js';
import LoginEvent from '../models/LoginEvent.js';
import Incident from '../models/Incident.js';
import AuditEvent from '../models/AuditEvent.js';
import Session from '../models/Session.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}

router.use(requireAuth, adminOnly);

router.get('/incidents', async (req, res, next) => {
  try {
    const incidents = await Incident.find({}).sort({ createdAt: -1 }).limit(10).lean();
    res.json(incidents);
  } catch (err) {
    next(err);
  }
});

router.get('/audits', async (req, res, next) => {
  try {
    const audits = await AuditEvent.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.json(audits);
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find({}, 'name email role twoFA lastLoginAt isDisabled').sort({ name: 1 }).lean();
  res.json(users);
});

router.get('/logins', async (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || '100', 10), 1000));
  const events = await LoginEvent.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(events);
});

router.get('/metrics', async (req, res) => {
  const [usersTotal, twoFAEnabled, eventsTotal, failedEvents, roleBuckets, last7d] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ 'twoFA.enabled': true }),
    LoginEvent.countDocuments({}),
    LoginEvent.countDocuments({ success: false }),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    buildLast7DaysTrend(),
  ]);

  const byRole = { admin: 0, doctor: 0, patient: 0 };
  for (const b of roleBuckets) {
    if (byRole[b._id] !== undefined) byRole[b._id] = b.count;
  }

  res.json({ users: usersTotal, enabled2FA: twoFAEnabled, eventsTotal, failedEvents, byRole, last7d });
});

// --- ADDED: Endpoint to toggle a user's disabled status ---
router.post('/users/:userId/toggle-disable', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (userToUpdate._id.toString() === req.user.id) {
        return res.status(400).json({ message: 'You cannot disable your own account.'});
    }
    userToUpdate.isDisabled = !userToUpdate.isDisabled;
    await userToUpdate.save();
    if (userToUpdate.isDisabled) {
        await Session.updateMany({ userId: userToUpdate._id }, { isActive: false });
    }
    res.json({
      message: `User ${userToUpdate.name} has been ${userToUpdate.isDisabled ? 'disabled' : 'enabled'}.`,
      user: { _id: userToUpdate._id, isDisabled: userToUpdate.isDisabled }
    });
  } catch (err) {
    next(err);
  }
});

// --- ADDED: Endpoint to log out a user from all sessions ---
router.post('/users/:userId/logout', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const result = await Session.updateMany({ userId }, { $set: { isActive: false } });
        if (result.matchedCount === 0) {
            return res.json({ message: 'User has no active sessions to log out.' });
        }
        res.json({ message: `Successfully logged out user from ${result.modifiedCount} session(s).` });
    } catch (err) {
        next(err);
    }
});


async function buildLast7DaysTrend() {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 6, 0, 0, 0));
  const agg = await LoginEvent.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $project: { day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' } }, success: 1 } },
    { $group: { _id: { day: '$day', success: '$success' }, count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const r of agg) {
    const day = r._id.day;
    const entry = map.get(day) || { logins: 0, fails: 0 };
    if (r._id.success) entry.logins += r.count;
    else entry.fails += r.count;
    map.set(day, entry);
  }
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i, 0, 0, 0));
    const key = d.toISOString().slice(0, 10);
    const v = map.get(key) || { logins: 0, fails: 0 };
    out.push({ date: key, ...v });
  }
  return out;
}

export default router;