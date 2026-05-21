import bcryptjs from 'bcryptjs';

let nativeBcrypt = null;
try {
  // Attempt to load native compiled C++ module for 10x-15x faster execution
  nativeBcrypt = (await import('bcrypt')).default;
} catch (e) {
  // Fall back silently to pure JS bcryptjs
}

/**
 * High-performance, non-blocking secure hash generator
 * @param {string|Buffer} data - The data to be encrypted
 * @param {number|string} saltRounds - The salt rounds
 * @returns {Promise<string>} The generated hash string
 */
export const hash = async (data, saltRounds) => {
  if (nativeBcrypt) {
    return nativeBcrypt.hash(data, saltRounds);
  }
  return bcryptjs.hash(data, saltRounds);
};

/**
 * High-performance, non-blocking secure password comparison utility
 * @param {string|Buffer} data - The plain text data
 * @param {string} encrypted - The database hash
 * @returns {Promise<boolean>} Match result
 */
export const compare = async (data, encrypted) => {
  if (nativeBcrypt) {
    return nativeBcrypt.compare(data, encrypted);
  }
  return bcryptjs.compare(data, encrypted);
};
