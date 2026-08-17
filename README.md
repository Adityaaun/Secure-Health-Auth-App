# HealthGuard — Secure Healthcare Authentication

HealthGuard is a full-stack healthcare security and authentication project built with the MERN stack. It demonstrates secure authentication, adaptive two-factor authentication, behavioral session monitoring, role-based access, security event detection, and a real-time admin security dashboard.

> **Portfolio/demo project:** This repository is intended to demonstrate application security and full-stack engineering concepts. It is not presented as a production HIPAA-compliant healthcare system and should not be used with real patient data.

## Features

- JWT-based authentication
- bcrypt password hashing
- Strong-password validation with `zxcvbn`
- Compromised-password checking using the Have I Been Pwned API
- Adaptive 2FA with TOTP
- Device recognition and trusted-device support
- CAPTCHA protection
- Express rate limiting
- Helmet security headers
- Role-based access for admin, doctor, and patient users
- Behavioral authentication/session monitoring
- Security event logging and correlation
- Credential-stuffing detection
- Honeypot account support
- Session management and remote logout
- Emergency “Break Glass” access with audit logging
- Real-time security events using Socket.IO
- Admin dashboard with security metrics and CSV export
- Password reset and security-alert email support

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client
- Axios / Fetch
- Google reCAPTCHA

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcryptjs
- Speakeasy
- Nodemailer
- Helmet
- express-rate-limit
- express-validator

## Architecture

```text
React + Vite (Vercel)
        |
        | HTTPS / REST / Socket.IO
        v
Node.js + Express (Render)
        |
        v
MongoDB Atlas
```

## Project Structure

```text
Secure-Health-Auth-App/
├── client/              # React + Vite frontend
├── server/              # Node.js + Express backend
├── .gitignore
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google reCAPTCHA keys if CAPTCHA is enabled
- SMTP credentials if email features are required

### Backend

```bash
cd server
npm install
npm run dev
```

The backend uses port `4000` by default and can be configured with environment variables.

### Frontend

```bash
cd client
npm install
npm run dev
```

The Vite development server runs on port `5173` and proxies `/api` requests to the local backend.

## Environment Variables

Do not commit secrets to GitHub. The repository `.gitignore` excludes `.env` files.

### Server

```text
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:4000
CAPTCHA_MODE=recaptcha
RECAPTCHA_SECRET=your_recaptcha_secret
ADMIN_EMAIL=your_admin_email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=your_sender_address
```

### Client

```text
VITE_API_URL=
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

For local development, leaving `VITE_API_URL` empty keeps the existing Vite `/api` proxy behavior. For production, set it to the deployed Render API URL.

## Deployment

Recommended deployment architecture:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas

### Vercel

Set the project root directory to `client` and use:

```text
Build Command: npm run build
Output Directory: dist
```

Set:

```text
VITE_API_URL=https://your-render-service.onrender.com
VITE_RECAPTCHA_SITE_KEY=your-production-site-key
```

### Render

Set the project root directory to `server` and use:

```text
Build Command: npm install
Start Command: node src/index.js
```

Set the server environment variables with production values, including the MongoDB Atlas connection string and the deployed Vercel frontend URL.

### MongoDB Atlas

Create a MongoDB Atlas database and use its connection string as `MONGO_URI`. The application stores its data in the `secure_health` database.

## Security Notes

- Never commit `.env` files or credentials.
- Use strong, unique production secrets.
- Use real reCAPTCHA credentials in production instead of demo mode.
- Configure production SMTP credentials for email features.
- Restrict MongoDB network access appropriately.
- Do not use real patient or medical data in this portfolio demo.

## Portfolio

This project demonstrates full-stack development combined with application-security engineering, including authentication, authorization, 2FA, security monitoring, real-time events, and deployment architecture.
