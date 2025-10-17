import mongoose from 'mongoose';

const MedicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  title: { type: String, required: true },
  notes: { type: String, required: true },
  category: { type: String, enum: ['Visit Note', 'Lab Result', 'Prescription'], default: 'Visit Note' },
}, { timestamps: true });

export default mongoose.model('MedicalRecord', MedicalRecordSchema);