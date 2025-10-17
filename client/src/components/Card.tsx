import React from 'react';

export default function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <h3 className="px-6 py-4 text-lg font-semibold border-b border-gray-200">{title}</h3>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}