import mongoose from 'mongoose';

const TwoFASchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  secret: { type: String, default: null },
  tempSecret: { type: String, default: null },
}, { _id: false });

const BehaviorProfileSchema = new mongoose.Schema({
  keypressLatencyAvg: { type: Number, default: 200 },
  mouseSpeedAvg: { type: Number, default: 120 },
  jitter: { type: Number, default: 0.3 },
  samples: { type: Number, default: 0 }
}, { _id: false });

const DeviceSchema = new mongoose.Schema({
  deviceId: String,
  userAgent: String,
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  trusted: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['doctor','patient','admin'], required: true, default: 'doctor' },
  
  primaryDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  twoFA: { type: TwoFASchema, default: () => ({}) },
  lastLoginAt: { type: Date },
  riskScore: { type: Number, default: 0 },
  behaviorProfile: { type: BehaviorProfileSchema, default: () => ({}) },
  devices: { type: [DeviceSchema], default: [] },
  isHoneypot: { type: Boolean, default: false },
  isDisabled: { type: Boolean, default: false },

  // --- ADDED: Fields for password reset ---
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },

}, { timestamps: true });

export default mongoose.model('User', UserSchema);