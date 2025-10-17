import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true },
  userAgent: { type: String },
  ip: { type: String },
  isActive: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Session', SessionSchema);