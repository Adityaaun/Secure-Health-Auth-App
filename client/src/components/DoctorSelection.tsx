import React, { useEffect, useState } from 'react';
import { authed } from '../lib/authed';
import { User } from '../types';
import Card from './Card';
import Button from './Button';

type Doctor = {
  _id: string;
  name: string;
  email: string;
};

interface DoctorSelectionProps {
  user: User;
  onDoctorChosen: (updatedUser: User) => void;
}

export default function DoctorSelection({ user, onDoctorChosen }: DoctorSelectionProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await authed('/api/doctors', user.token);
        setDoctors(data);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [user.token]);

  const handleSelectDoctor = async () => {
    if (!selectedDoctorId) return;

    try {
      const response = await authed('/api/patient/choose-doctor', user.token, {
        method: 'POST',
        body: JSON.stringify({ doctorId: selectedDoctorId }),
      });
      
      // Save the new, updated token to localStorage
      localStorage.setItem('authToken', response.token);
      
      // Update the user state in the parent App component
      onDoctorChosen({ ...user, primaryDoctorId: selectedDoctorId, token: response.token });
    } catch (error: any) {
      alert(`Failed to select doctor: ${error.message}`);
    }
  };

  if (loading) {
    return (
        <div className="text-center p-10">
            <p className="text-gray-500">Loading available doctors...</p>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card title="Choose Your Primary Physician">
        <p className="text-gray-600 mb-6">
          Welcome to HealthGuard! To get started, please select a primary doctor from the list below. This will allow them to manage your health records.
        </p>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {doctors.map(doctor => (
            <div
              key={doctor._id}
              onClick={() => setSelectedDoctorId(doctor._id)}
              className={`p-4 border rounded-lg cursor-pointer transition ${
                selectedDoctorId === doctor._id
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <h4 className="font-semibold text-gray-800">Dr. {doctor.name}</h4>
              <p className="text-sm text-gray-500">{doctor.email}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-right">
          <Button
            onClick={handleSelectDoctor}
            disabled={!selectedDoctorId}
          >
            Confirm Selection
          </Button>
        </div>
      </Card>
    </div>
  );
}