import mongoose from 'mongoose';

const AuditEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The doctor who took the action
  actorName: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The patient whose record was accessed
  patientName: { type: String, required: true },
  action: { type: String, required: true, default: 'EMERGENCY_ACCESS' },
  justification: { type: String, required: true }, // The reason provided by the doctor
  ip: { type: String },
}, { timestamps: true });

export default mongoose.model('AuditEvent', AuditEventSchema);