import mongoose from 'mongoose';

const LoginEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, index: true },
  ip: String,
  userAgent: String,
  location: { country: String, region: String, city: String }, // optional, can be null
  deviceId: String,                // simple fingerprint id from client if you add it
  timestamp: { type: Date, default: Date.now },
  stage: { type: String, enum: ['captcha','2fa','behavior','success','fail'], default: 'success' },
  success: { type: Boolean, default: true },
  reason: String,
  behavior: {
    keypressLatencyAvg: Number,
    mouseSpeedAvg: Number,
    jitter: Number,
    score: Number,                 // computed
  },
  risk: {
    value: Number,                 // 0..1
    reasons: [String]
  }
}, { timestamps: true });

export default mongoose.model('LoginEvent', LoginEventSchema);
