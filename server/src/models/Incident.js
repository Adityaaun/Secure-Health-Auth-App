import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ip: { type: String, required: true, index: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
  status: { type: String, enum: ['Open', 'Investigating', 'Closed'], default: 'Open' },
  // Link to all the individual events that make up this incident
  relatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LoginEvent' }],
}, { timestamps: true });

export default mongoose.model('Incident', IncidentSchema);