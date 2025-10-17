import nodemailer from 'nodemailer';

// This function will create a temporary test account with Ethereal
async function createTestAccount() {
  const testAccount = await nodemailer.createTestAccount();
  console.log('✅ Ethereal test account created.');
  console.log('   Use the following credentials in your .env or keep this function active:');
  console.log(`   SMTP_USER: ${testAccount.user}`);
  console.log(`   SMTP_PASS: ${testAccount.pass}`);
  return testAccount;
}

export async function makeTransport() {
  // If you have real SMTP credentials in your .env, use them.
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Otherwise, create and use a temporary Ethereal account for testing.
    console.log('⚠️ SMTP_HOST not set. Using Ethereal for email testing.');
    const testAccount = await createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
}

export async function sendSecurityAlert({ to, subject, text, html }) {
  const transport = await makeTransport();
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"HealthGuard Security" <security@healthguard.local>',
    to,
    subject,
    text,
    html,
  });

  // If using Ethereal, log the URL to view the sent email
  if (transport.options.host === 'smtp.ethereal.email') {
    console.log('📧 Email sent! Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
}