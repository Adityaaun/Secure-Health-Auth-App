// File: server/src/routes/api.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireDoctor } from '../middlewares/auth.js';
import User from '../models/User.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Appointment from '../models/Appointment.js';
import AuditEvent from '../models/AuditEvent.js';
import LoginEvent from '../models/LoginEvent.js';
import Session from '../models/Session.js';
import { scoreBehavior, updateBehaviorProfile } from '../utils/behavior.js';
import { signJWT } from '../utils/jwt.js';

const router = express.Router();

/* -------------------- Session verify (behavior) -------------------- */
router.post('/session/verify', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.behaviorProfile) {
      return res.status(400).json({ message: 'User profile not found.' });
    }
    const currentBehavior = req.body.behavior;
    if (!currentBehavior) {
      return res.status(400).json({ message: 'Behavior data missing.' });
    }
    const score = scoreBehavior(user.behaviorProfile, currentBehavior);
    const RISK_THRESHOLD = 0.8;

    if (score.value > RISK_THRESHOLD) {
      const reason = `Continuous auth failed. Score: ${score.value.toFixed(2)}. Reasons: ${score.reasons.join(' ')}`;
      console.log(`Continuous auth failed for ${user.email}. Score: ${score.value.toFixed(2)}`);
      const loginEvent = new LoginEvent({
        userId: user._id,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        stage: 'behavior',
        reason,
        behavior: { ...currentBehavior, score: score.value }
      });
      await loginEvent.save();
      if (req.io) req.io.to('admins').emit('new-security-event', loginEvent);
      return res.status(401).json({
        message: 'Session challenge required due to unusual activity.',
        reason: score.reasons.join(' ')
      });
    } else {
      updateBehaviorProfile(user, currentBehavior);
      await user.save();
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    return next(err);
  }
});


/* -------------------- Doctor routes -------------------- */
router.get('/doctor/summary', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const [todaysAppointments, totalPatients] = await Promise.all([
      Appointment.countDocuments({ doctorId: req.user.id, date: { $gte: todayStart, $lte: todayEnd } }),
      User.countDocuments({ role: 'patient', primaryDoctorId: req.user.id })
    ]);
    return res.json({ todaysAppointments, totalPatients });
  } catch (err) {
    return next(err);
  }
});

router.get('/doctor/appointments', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user.id, status: 'Scheduled' })
      .sort({ date: 1 }).limit(10).populate('patientId', 'name').lean();
    return res.json(appointments);
  } catch (err) {
    return next(err);
  }
});

router.post('/doctor/appointments', requireAuth, requireDoctor,
  body('patientId', 'A valid patient ID is required').isMongoId(),
  body('date', 'A valid date is required').isISO8601().toDate(),
  body('reason', 'Reason is required').trim().notEmpty().escape(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const { patientId, date, reason } = req.body;
      const newAppointment = new Appointment({ doctorId: req.user.id, patientId, date, reason, status: 'Scheduled' });
      await newAppointment.save();
      await newAppointment.populate('patientId', 'name');
      return res.status(201).json(newAppointment);
    } catch (err) {
      return next(err);
    }
  });

router.get('/doctor/patients', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const patients = await User.find({ role: 'patient', primaryDoctorId: req.user.id }).sort({ name: 1 }).lean();
    return res.json(patients);
  } catch (err) {
    return next(err);
  }
});

router.get('/doctor/search-patients', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (query.length < 2) return res.json([]);
    const patients = await User.find({ role: 'patient', name: { $regex: query, $options: 'i' } }, 'name email').limit(10).lean();
    return res.json(patients);
  } catch (err) {
    return next(err);
  }
});

router.get('/doctor/records/:patientId', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user && (req.user.id || req.user._id);

    console.log('DEBUG /doctor/records handler: req.user=', req.user, ' patientId=', patientId);

    if (!patientId) return res.status(400).json({ message: 'Bad Request: missing patientId' });

    const patient = await User.findById(patientId).lean();
    console.log('DEBUG patient doc (partial):', patient ? { _id: patient._id, name: patient.name, primaryDoctorId: patient.primaryDoctorId, assignedDoctorId: patient.assignedDoctorId, doctors: patient.doctors ? patient.doctors.slice(0,5) : undefined } : null);

    if (!patient) return res.status(404).json({ message: "Not found: patient does not exist." });

    const docIdStr = doctorId ? doctorId.toString() : null;
    const isPrimary = patient.primaryDoctorId && patient.primaryDoctorId.toString() === docIdStr;
    const isAssigned = patient.assignedDoctorId && patient.assignedDoctorId.toString() === docIdStr;
    const isInDoctorsArray = Array.isArray(patient.doctors) && patient.doctors.some(d => d && d.toString() === docIdStr);
    const hasAppointment = await Appointment.exists({ doctorId: doctorId, patientId: patientId });

    const hasAccess = !!(isPrimary || isAssigned || isInDoctorsArray || hasAppointment);

    if (!hasAccess) {
      new AuditEvent({
        actorId: req.user.id,
        actorName: req.user.name,
        patientId,
        patientName: patient.name,
        action: 'doctor_records_access_denied',
        details: `Doctor ${docIdStr} attempted to access records but no relationship/appointment found.`,
        ip: req.ip
      }).save().catch(() => {});

      console.warn(`Access denied: doctor ${docIdStr} tried to access records for patient ${patientId}`);
      return res.status(403).json({ message: "Forbidden: You do not have access to this patient's records." });
    }

    new AuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      patientId,
      patientName: patient.name,
      action: 'doctor_records_access_granted',
      details: `Doctor ${docIdStr} accessed records.`,
      ip: req.ip
    }).save().catch(() => {});

    const records = await MedicalRecord.find({ patientId }).sort({ date: -1 }).lean();
    return res.json(records);
  } catch (err) {
    return next(err);
  }
});

router.post('/doctor/records', requireAuth, requireDoctor,
  body('patientId', 'A valid patient ID is required').isMongoId(),
  body('title', 'Title is required').trim().notEmpty().escape(),
  body('category', 'Category is required').isIn(['Visit Note', 'Lab Result', 'Prescription']),
  body('notes', 'Notes are required').trim().notEmpty().escape(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    try {
      const { patientId, title, category, notes } = req.body;
      const newRecord = new MedicalRecord({ doctorId: req.user.id, patientId, title, category, notes });
      await newRecord.save();
      return res.status(201).json(newRecord);
    } catch (err) {
      return next(err);
    }
  });

router.post('/doctor/emergency-access/:patientId', requireAuth, requireDoctor, async (req, res, next) => {
  try {
    const { justification } = req.body;
    const { patientId } = req.params;
    const patient = await User.findById(patientId);
    if (!justification || justification.trim().length < 10) return res.status(400).json({ message: 'A detailed justification is required for emergency access.' });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const auditEvent = new AuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      patientId,
      patientName: patient.name,
      justification,
      ip: req.ip,
    });
    await auditEvent.save();
    if (req.io) req.io.to('admins').emit('new-audit-event', auditEvent);

    const records = await MedicalRecord.find({ patientId }).sort({ date: -1 }).lean();
    return res.json(records);
  } catch (err) {
    return next(err);
  }
});

/* -------------------- Patient routes -------------------- */
router.get('/patient/summary', requireAuth, async (req, res, next) => {
  try {
    const nextAppointment = await Appointment.findOne({ patientId: req.user.id, status: 'Scheduled', date: { $gte: new Date() } })
      .sort({ date: 1 }).populate('doctorId', 'name').lean();
    const recentRecord = await MedicalRecord.findOne({ patientId: req.user.id }).sort({ date: -1 }).lean();
    return res.json({ nextAppointment, recentRecord });
  } catch (err) {
    return next(err);
  }
});

router.get('/patient/records', requireAuth, async (req, res, next) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user.id }).sort({ date: -1 }).populate('doctorId', 'name').lean();
    return res.json(records);
  } catch (err) {
    return next(err);
  }
});

router.post('/patient/choose-doctor', requireAuth, async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can choose a doctor.' });

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Selected doctor not found.' });

    // --- FIX: Removed the stray period before 'req.user.id' ---
    const patient = await User.findById(req.user.id);
    patient.primaryDoctorId = doctorId;
    await patient.save();

    const payload = {
      id: patient.id,
      sessionId: req.user.sessionId,
      name: patient.name,
      email: patient.email,
      role: patient.role,
      primaryDoctorId: patient.primaryDoctorId
    };
    const token = signJWT(payload, process.env.JWT_SECRET, '8h');

    return res.json({
      success: true,
      message: `Dr. ${doctor.name} has been set as your primary physician.`,
      token
    });
  } catch (err) {
    return next(err);
  }
});

/* -------------------- Shared routes -------------------- */
router.get('/doctors', requireAuth, async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' }, 'name email').lean();
    return res.json(doctors);
  } catch (err) {
    return next(err);
  }
});

/* -------------------- Session management -------------------- */
router.get('/user/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user.id, isActive: true }).sort({ lastSeenAt: -1 });
    return res.json(sessions);
  } catch (err) {
    return next(err);
  }
});

router.delete('/user/sessions/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found or permission denied.' });
    session.isActive = false;
    await session.save();
    return res.json({ success: true, message: 'Session successfully logged out.' });
  } catch (err) {
    return next(err);
  }
});

export default router;