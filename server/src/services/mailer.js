import nodemailer from 'nodemailer';

// Creates a transport object based on SMTP environment variables.
function makeTransport() {
  if (!process.env.SMTP_HOST) {
    // Return a dummy object if SMTP is not configured to avoid crashes.
    console.warn('SMTP not configured. Email sending is disabled.');
    return {
      sendMail: () => Promise.resolve(console.log('Dummy email sent.')),
    };
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465, // `secure:true` is required for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Sends a security alert email.
export async function sendSecurityAlert({ to, ip, userAgent, deviceId }) {
  const transport = makeTransport();
  
  const subject = 'Security Alert: New Device Sign-in to Your HealthGuard Account';
  const text = `
    We noticed a new sign-in to your HealthGuard account.
    
    When: ${new Date().toUTCString()}
    IP Address: ${ip}
    Device: ${userAgent}
    Device ID: ${deviceId}
    
    If this was not you, please secure your account immediately by changing your password.
  `;
  const html = `
    <p>We noticed a new sign-in to your HealthGuard account.</p>
    <ul>
      <li><strong>When:</strong> ${new Date().toUTCString()}</li>
      <li><strong>IP Address:</strong> ${ip}</li>
      <li><strong>Device:</strong> ${userAgent}</li>
      <li><strong>Device ID:</strong> ${deviceId}</li>
    </ul>
    <p>If this was not you, please secure your account immediately by changing your password.</p>
  `;

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || '"HealthGuard Security" <no-reply@healthguard.local>',
      to,
      subject,
      text,
      html,
    });
    console.log(`Security alert sent to ${to}`);
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}