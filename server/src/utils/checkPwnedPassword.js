import axios from 'axios';
import { createHash } from 'crypto';

/**
 * Checks if a password has been exposed in a data breach using the HIBP Pwned Passwords API.
 * Uses k-Anonymity to protect the user's password.
 * @param {string} password The plain-text password to check.
 * @returns {Promise<boolean>} True if the password is pwned, false otherwise.
 */
export async function isPasswordPwned(password) {
  try {
    // 1. Hash the password using SHA-1 (as required by the HIBP API)
    const sha1Hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hash.substring(0, 5); // 2. Get the first 5 characters of the hash
    const suffix = sha1Hash.substring(5);   // 3. Get the rest of the hash

    // 4. Send only the prefix to the HIBP API
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);

    // 5. Check if the suffix of our hash exists in the API's response
    const hashes = response.data.split('\r\n');
    for (const line of hashes) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        console.warn(`[SECURITY] Pwned password detected and rejected. Found ${count} times.`);
        return true; // Password is pwned
      }
    }

    return false; // Password is not pwned
  } catch (error) {
    console.error('Error checking pwned password:', error.message);
    // Fail-safe: In case of an API error, we allow the password to avoid locking out users.
    return false;
  }
}