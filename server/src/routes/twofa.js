import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { requireValidToken } from '../middlewares/auth.js'; // --- FIX: Use the new, correct middleware ---
import User from '../models/User.js';

const router = express.Router();

// --- FIX: Protect these routes with the basic token verifier ---
router.use(requireValidToken);

router.post('/setup', async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.twoFA.enabled) return res.status(400).json({ message: '2FA is already enabled.' });

  const secret = speakeasy.generateSecret({ name: `HealthGuard:${user.email}`, length: 20 });
  user.twoFA.tempSecret = secret.base32;
  await user.save();
  
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({ qrDataUrl, tempSecret: secret.base32 });
});

router.post(
  '/enable',
  body('token', 'A valid 6-digit code is required').isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user?.twoFA?.tempSecret) {
      return res.status(400).json({ message: '2FA setup was not initiated or has expired.' });
    }

    const ok = speakeasy.totp.verify({
      secret: user.twoFA.tempSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!ok) {
      return res.status(400).json({ message: 'Invalid 2FA code.' });
    }

    user.twoFA.enabled = true;
    user.twoFA.secret = user.twoFA.tempSecret;
    user.twoFA.tempSecret = null;
    await user.save();
    
    res.json({ success: true, message: 'Two-factor authentication has been enabled.' });
  }
);

export default router;