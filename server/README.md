# 📂 Rithanya Enterprises CMS - Server (Backend)

The backend for the Canteen Management System is a robust Node.js and Express API designed for secure inventory tracking, real-time auditing, and role-based data isolation.

## 🚀 Technical Stack
- **Framework**: Node.js & Express
- **Database**: MongoDB & Mongoose
- **Real-time**: Socket.io for live updates and notifications.
- **Auth**: JSON Web Tokens (JWT) with hashed password storage.
- **Mail**: Nodemailer for system-level notifications.

## 🏗️ Architecture & Flow
- **Audit Logging**: Every modification to the `Stock` collection is accompanied by a corresponding `Transaction` entry.
- **Batch Tracking**: Real-time stock levels are managed using the `dailyStockId` to maintain trace-link to production batches.
- **Locking Logic**: `DailyStock` entries are programmatically locked if any related stock has been transferred.
- **Role Isolation**: Controller-level filtering ensures that managers only see their assigned Production Units or Canteens.

## 📁 Directory Structure
```text
server/
├── controllers/    # Business logic (Transfers, Sales, Returns, DailyStock)
├── middleware/     # Role-based Authorization and Error Handling
├── models/         # Mongoose Schemas (Transaction, Stock, Sale, etc.)
├── routes/         # Express endpoint definitions
├── seed.js         # Initial data setup utility
└── utils/          # Bill number generation and helper functions
```

## ⚙️ Environment Configuration
- **Default Port**: **5000**
- **MONGODB_URI**: MongoDB connection string.
- **JWT_SECRET**: Secret key for JWT generation.
- **CLIENT_URL**: Point to the Vite client (default: `http://localhost:5173`).

## 👨‍💻 Development
1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment:
    ```bash
    cp .env.example .env
    ```
4.  Start development server:
    ```bash
    npm run dev
    ```
