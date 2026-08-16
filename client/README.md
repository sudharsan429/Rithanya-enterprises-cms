# 💻 Rithanya Enterprises CMS - Client (Frontend)

The frontend for the Canteen Management System is a robust React application built with Vite, emphasizing a "Simple and Clean" aesthetic and real-time inventory synchronization.

## 🚀 Technical Stack
- **Framework**: React 18 (Vite-based)
- **State Management**: React Context API
  - `AuthContext`: Manages user sessions and role-based permissions.
  - `SocketContext`: Handles real-time event listeners from the server.
- **Routing**: React Router DOM (v6) with `ProtectedRoute` wrappers.
- **Styling**: Vanilla CSS with utility-class methodology.
- **Icons**: Lucide-React.
- **Form Components**: React-Select for multi-location/batch selections.

## 📁 Directory Structure
```text
src/
├── api/            # Axios instance and API service definitions
├── components/     # Reusable UI (ManagementTable, CustomSelect, Layout)
├── context/        # Global state (Auth, Socket)
├── pages/          # View modules (Billing, Transfers, Reports, etc.)
├── styles/         # Global design tokens and module CSS
└── utils/          # Formatting and permission helpers
```

## 🛠️ Key Components
- **ManagementTable**: Standardized interface for all listing and administrative pages.
- **CustomSelect**: Enhanced dropdown with search capabilities for batch-specific tracking.
- **Layout**: Unified sidebar and header navigation responsive to user roles.

## ⚙️ Configuration & Ports
- **Default Port**: `http://localhost:5173`
- **Backend URL**: Configured in `src/api/axios.js` (pointing to `http://localhost:5000/api`).

## 👨‍💻 Development
1.  Navigate to the `client` directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```
