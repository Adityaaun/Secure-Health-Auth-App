import { verifyJWT } from '../utils/jwt.js';
import User from '../models/User.js';
import Session from '../models/Session.js';

/**
 * requireValidToken - A basic JWT verifier.
 * This middleware is used for post-registration flows like 2FA setup.
 * It ONLY verifies that the token is valid and not expired. It does NOT check
 * for an active session in the database.
 */
export async function requireValidToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyJWT(token, process.env.JWT_SECRET);
    req.user = payload; // Attach the decoded payload
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }
}


/**
 * requireAuth - A strict JWT and session verifier.
 * This is the primary middleware for all standard API requests. It verifies the token
 * AND checks the database to ensure the session is active. This is what makes the
 * admin "force logout" feature work.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyJWT(token, process.env.JWT_SECRET);

    const session = await Session.findOne({ 
        _id: payload.sessionId, 
        userId: payload.id, 
        isActive: true 
    });

    if (!session) {
        return res.status(401).json({ message: 'Unauthorized: Session has been terminated.' });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token or session.' });
  }
}

/**
 * requireDoctor - Role-checking middleware.
 */
export function requireDoctor(req, res, next) {
  if (req.user && req.user.role === 'doctor') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Doctor access required.' });
}

/**
 * requireTempAuth - Verifies a special JWT with a 'temp' flag.
 * This is your original logic, preserved for any other flows that might need it.
 */
export async function requireTempAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Missing token' });

    let payload;
    try {
      payload = verifyJWT(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const isTemp =
      payload.tempAuth === true ||
      payload.temp === true ||
      (payload.stage && payload.stage === 'temp');

    if (!isTemp) {
      return res.status(403).json({ message: 'Forbidden: temporary auth required' });
    }

    req.user = { 
        id: payload.id || null, 
        isTempAuth: true, 
        ...payload 
    };
    
    return next();
  } catch (err) {
    return next(err);
  }
}