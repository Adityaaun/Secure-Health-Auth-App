import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import LoginEvent from '../models/LoginEvent.js';
import Session from '../models/Session.js';
import { signJWT } from '../utils/jwt.js';
import { verifyCaptcha } from '../utils/captcha.js';
import { findOrRegisterDevice } from '../utils/device.js';
import { updateBehaviorProfile, scoreBehavior } from '../utils/behavior.js';
import { sendSecurityAlert } from '../utils/mailer.js';
import speakeasy from 'speakeasy';
import { processEvent } from '../utils/correlationEngine.js';
import { isPasswordPwned } from '../utils/checkPwnedPassword.js';

const router = express.Router();

// Register route
router.post(
  '/register',
  body('name', 'Name is required').trim().notEmpty().escape(),
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('password', 'Password must be 8 or more characters').isLength({ min: 8 }),
  body('role').isIn(['doctor', 'patient']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    try {
      const { name, email, password, role } = req.body;
      if (await isPasswordPwned(password)) {
        return res.status(400).json({
          message: 'This password has appeared in a data breach. For your security, please choose a different password.'
        });
      }
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = new User({ name, email, passwordHash, role });
      await user.save();
      const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
      const token = signJWT(payload, process.env.JWT_SECRET, '15m');
      res.status(201).json({ token });
    } catch (err) {
      next(err);
    }
  }
);

// Login route
router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const { email, password, captchaToken, twoFAToken, behavior, deviceId, trustDevice } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const loginEvent = new LoginEvent({ email, ip: req.ip, userAgent, deviceId, behavior });
      const user = await User.findOne({ email });

      // --- ADDED: Check if the user's account is disabled ---
      if (user && user.isDisabled) {
        console.warn(`[AUTH] Denied login for disabled user: ${email}`);
        return res.status(403).json({ message: 'Your account has been disabled. Please contact an administrator.' });
      }

      if (user && user.isHoneypot) {
        console.warn(`[HONEYPOT] Trap triggered by IP: ${req.ip} for user: ${email}`);
        loginEvent.success = false;
        loginEvent.stage = 'fail';
        loginEvent.reason = 'Honeypot Account Accessed';
        await loginEvent.save();
        req.io.to('admins').emit('new-security-event', loginEvent);
        await processEvent(loginEvent, req);
        try {
          await sendSecurityAlert({
            to: process.env.ADMIN_EMAIL || 'admin@healthguard.local',
            subject: 'CRITICAL: Honeypot Security Alert',
            text: `A honeypot account (${email}) was accessed by IP address: ${req.ip}.\nThis indicates a potential targeted attack.`
          });
        } catch (e) { console.error("Failed to send honeypot security alert", e); }
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const captchaOk = await verifyCaptcha(captchaToken);
      if (!captchaOk && !twoFAToken) {
        loginEvent.success = false;
        loginEvent.stage = 'captcha';
        loginEvent.reason = 'CAPTCHA failed';
        await loginEvent.save();
        req.io.to('admins').emit('new-security-event', loginEvent);
        await processEvent(loginEvent, req);
        return res.status(401).json({ message: 'CAPTCHA verification failed.' });
      }

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        const attackCheckTime = new Date(Date.now() - 60 * 60 * 1000);
        const failedAccounts = await LoginEvent.distinct('email', {
          ip: req.ip,
          success: false,
          reason: 'Invalid credentials',
          createdAt: { $gte: attackCheckTime }
        });
        if (!failedAccounts.includes(email)) {
          failedAccounts.push(email);
        }
        const distinctAccountCount = failedAccounts.length;
        const ATTACK_THRESHOLD = 5;
        if (distinctAccountCount > ATTACK_THRESHOLD) {
          console.warn(`[CREDENTIAL STUFFING] Attack detected from IP: ${req.ip}. Failed accounts: ${distinctAccountCount}`);
          loginEvent.reason = `Credential Stuffing Attack Detected (${distinctAccountCount} accounts)`;
        } else {
          loginEvent.reason = 'Invalid credentials';
        }
        loginEvent.success = false;
        loginEvent.stage = 'fail';
        await loginEvent.save();
        req.io.to('admins').emit('new-security-event', loginEvent);
        await processEvent(loginEvent, req);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      loginEvent.userId = user._id;

      const behaviorScore = scoreBehavior(user.behaviorProfile, behavior);
      loginEvent.behavior.score = behaviorScore.value;
      const deviceStatus = findOrRegisterDevice(user, deviceId, userAgent);
      
      const isSuspicious = behaviorScore.value > 0.6;
      const requires2FA = user.twoFA.enabled && (!deviceStatus.isTrusted || isSuspicious);

      if (requires2FA) {
        if (!twoFAToken) {
          loginEvent.success = false;
          loginEvent.stage = '2fa';
          loginEvent.reason = '2FA code required but not provided';
          await loginEvent.save();
          req.io.to('admins').emit('new-security-event', loginEvent);
          return res.status(200).json({ stage: '2fa', message: 'Enter your 2FA code.' });
        }
        
        const ok = speakeasy.totp.verify({ secret: user.twoFA.secret, encoding: 'base32', token: twoFAToken, window: 1 });
        if (!ok) {
          loginEvent.success = false;
          loginEvent.stage = '2fa';
          loginEvent.reason = 'Invalid 2FA code';
          await loginEvent.save();
          req.io.to('admins').emit('new-security-event', loginEvent);
          await processEvent(loginEvent, req);
          return res.status(401).json({ message: 'Invalid 2FA code.' });
        }

        if (trustDevice && deviceId) {
            const device = user.devices.find(d => d.deviceId === deviceId);
            if (device) {
                device.trusted = true;
            }
        }
      }

      user.lastLoginAt = new Date();
      updateBehaviorProfile(user, behavior);
      await user.save();

      loginEvent.success = true;
      loginEvent.stage = 'success';
      await loginEvent.save();
      req.io.to('admins').emit('new-security-event', loginEvent);

      if (deviceStatus.isNew) {
        try {
          await sendSecurityAlert({
            to: user.email,
            subject: 'New Device Sign-In on HealthGuard',
            text: `We noticed a new sign-in to your HealthGuard account from a new device.\n\nDevice: ${userAgent}\nIP: ${req.ip}\n\nIf this was not you, please secure your account immediately.`
          });
        } catch (e) { console.error("Failed to send security alert", e); }
      }

      const session = new Session({
        userId: user._id,
        deviceId: deviceId,
        userAgent: userAgent,
        ip: req.ip,
      });
      await session.save();

      const payload = {
        id: user.id,
        sessionId: session._id,
        name: user.name,
        email: user.email,
        role: user.role,
        primaryDoctorId: user.primaryDoctorId
      };
      const token = signJWT(payload, process.env.JWT_SECRET, '8h');

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          primaryDoctorId: user.primaryDoctorId
        }
      });

    } catch (err) {
      next(err);
    }
  }
);

export default router;