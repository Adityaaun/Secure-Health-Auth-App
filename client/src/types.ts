export type User = {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  token: string;
  primaryDoctorId?: string; // Patient's assigned doctor
};