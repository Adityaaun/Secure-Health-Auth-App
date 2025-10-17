import Incident from '../models/Incident.js';
import LoginEvent from '../models/LoginEvent.js';

// Rule 1: A honeypot trigger is always a critical incident.
async function checkForHoneypot(event, req) {
  if (event.reason === 'Honeypot Account Accessed') {
    const newIncident = await Incident.create({
      title: `Honeypot Triggered by IP: ${event.ip}`,
      ip: event.ip,
      severity: 'Critical',
      relatedEvents: [event._id]
    });
    req.io.to('admins').emit('new-incident', newIncident); // Real-time update
    return true; // Incident created
  }
  return false;
}

// Rule 2: Credential stuffing is always a high-severity incident.
async function checkForCredentialStuffing(event, req) {
  if (event.reason?.startsWith('Credential Stuffing Attack')) {
    const newIncident = await Incident.create({
      title: `Credential Stuffing Attack from IP: ${event.ip}`,
      ip: event.ip,
      severity: 'High',
      relatedEvents: [event._id]
    });
    req.io.to('admins').emit('new-incident', newIncident); // Real-time update
    return true;
  }
  return false;
}

// Main function to run when a new event is created
export async function processEvent(event, req) {
  if (event.success) return; // Only process failed events

  // Rules are processed in order of severity
  if (await checkForHoneypot(event, req)) return;
  if (await checkForCredentialStuffing(event, req)) return;
  // You can add more rules here, like the 'Suspicious Sequence' rule
}