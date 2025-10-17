# HealthGuard — Secure Healthcare Authentication

A full-stack healthcare application built with the MERN stack, demonstrating advanced security features like adaptive 2FA, continuous authentication via behavioral biometrics, role-based access control, and a real-time admin security dashboard.

![HealthGuard Application Screenshot](path/to/your/screenshot.png)

## Key Security Features

* **🔒 Adaptive Multi-Factor Authentication:** Prompts for 2FA only for new/untrusted devices or in response to suspicious behavior.
* ** Biometric Session Monitoring:** Continuously authenticates a doctor's session by analyzing keyboard and mouse dynamics, locking the session if behavior deviates.
* **🔑 Secure Registration & Login:** Enforces strong passwords and prevents the use of passwords exposed in known data breaches.
* **👮 Real-Time Admin Dashboard:** Provides administrators with a live feed of security events, audit logs, and interactive controls to disable users or terminate sessions.
* **🚨 Emergency "Break Glass" Access:** Allows doctors to access records of patients not under their direct care in emergencies, with every action logged for audit.

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB with Mongoose
* **Real-time Communication:** Socket.IO
* **Security Libraries:** bcrypt, JWT, Speakeasy (for 2FA)

## Getting Started

### Prerequisites

* Node.js
* MongoDB

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Adityaaun/Secure-Health-Auth-App.git](https://github.com/Adityaaun/Secure-Health-Auth-App.git)
    cd Secure-Health-Auth-App
    ```

2.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd ../client
    npm install
    ```

4.  **Configure Environment Variables:**
    * In the `server` directory, copy `server/.env.example` to `server/.env`.
    * Fill in the required values (MongoDB URI, JWT Secret, etc.).

5.  **Run the application:**
    * To start the server, run `npm run dev` from the `server` directory.
    * To start the client, run `npm run dev` from the `client` directory.
