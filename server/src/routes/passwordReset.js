import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { sendSecurityAlert } from '../utils/mailer.js';
import { isPasswordPwned } from '../utils/checkPwnedPassword.js';

const router = express.Router();

// Route 1: User requests a password reset
router.post(
  '/request',
  body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

        try {
          await sendSecurityAlert({
            to: user.email,
            subject: 'Your HealthGuard Password Reset Request',
            text: `You are receiving this email because a password reset was requested for your account.\n\nPlease click the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
            html: `<p>You are receiving this email because a password reset was requested for your account.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
          });
        } catch (err) {
            console.error("Failed to send password reset email", err);
        }
      }

      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (err) {
      next(err);
    }
  }
);

// Route 2: User confirms the reset with the token and new password
router.post(
  '/confirm',
  body('token', 'A reset token is required').notEmpty(),
  body('password', 'Password must be 8 or more characters').isLength({ min: 8 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
        const { token, password } = req.body;

        if (await isPasswordPwned(password)) {
            return res.status(400).json({
              message: 'This password has appeared in a data breach. For your security, please choose a different password.'
            });
        }

        // --- FIX: Corrected the hashing algorithm from 'sha26' to 'sha256' ---
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.findOneAndUpdate(
            {
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            },
            {
                $set: {
                    passwordHash: passwordHash,
                },
                $unset: {
                    passwordResetToken: 1,
                    passwordResetExpires: 1,
                }
            },
            { new: true }
        );

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }
        
        await Session.updateMany({ userId: user._id }, { $set: { isActive: false } });

        res.json({ message: 'Password has been reset successfully. Please log in.' });

    } catch(err) {
        next(err);
    }
  }
);

export default router;