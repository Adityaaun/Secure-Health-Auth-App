HealthGuard — Secure Healthcare Authentication (Fresh Build)

Stack
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, helmet, rate-limits, TOTP 2FA (speakeasy), QR (qrcode)
- Frontend: React + Vite, minimal UI
- Features: Register (doctor/patient), Login → CAPTCHA → (2FA if enabled) → Behavioral check → Role-based dashboard

Run (Windows-friendly)
1) Start MongoDB locally (mongodb://localhost:27017)
2) Server
   cd server
   npm i
   copy .env.example .env
   npm run dev
   -> http://localhost:4000/api/health
3) Client
   (new terminal)
   cd client
   npm i
   npm run dev
   -> http://localhost:5173

Login flow
- Client hits POST /api/auth/login with {email,password,captchaToken,behavior}
- Server validates: password → CAPTCHA → 2FA (if enabled) → behavior
- On success returns JWT + user (role doctor/patient)

Enable 2FA (after logging in / having token)
- POST /api/2fa/setup   (Authorization: Bearer <token>) -> returns { qrDataUrl, tempSecret }
- Scan QR in Google Authenticator
- POST /api/2fa/enable  with { token } + Authorization header
- Next login for that user will require the 6-digit code

Security defaults
- helmet, rate limiting, strong password hashing (bcrypt)
- simple demo CAPTCHA (replace with Google reCAPTCHA by setting CAPTCHA_MODE=recaptcha and RECAPTCHA_SECRET)
- basic behavior scoring (customize threshold in server/src/routes/auth.js)

Notes
- This is a clean minimal baseline. You can harden further with HTTPS, CSRF for cookie sessions, and DB encryption-at-rest.
