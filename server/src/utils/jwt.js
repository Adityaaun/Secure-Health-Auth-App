import jwt from 'jsonwebtoken';

export function signJWT(payload, secret, expiresIn='1h') {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJWT(token, secret) {
  return jwt.verify(token, secret);
}
