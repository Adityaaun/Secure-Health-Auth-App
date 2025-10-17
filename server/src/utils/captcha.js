import axios from 'axios';

/**
 * Verifies a CAPTCHA token using the configured mode (demo or recaptcha).
 * @param {string | null} token The token from the client.
 * @returns {Promise<boolean>} True if the token is valid, false otherwise.
 */
export async function verifyCaptcha(token) {
  // In demo mode, any non-empty token is considered valid.
  if (process.env.CAPTCHA_MODE === 'demo') {
    return !!token;
  }

  // In production mode, verify with Google's reCAPTCHA service.
  if (!process.env.RECAPTCHA_SECRET) {
    console.error('RECAPTCHA_SECRET is not set. CAPTCHA validation will fail.');
    return false;
  }
  
  if (!token) {
    return false;
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
}