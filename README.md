# 🌐 VertexFlow

**VertexFlow** is a premium, production-grade MERN stack application designed for high-performance networking and real-time collaborative document management. Built with a focus on speed, aesthetics, and seamless user interaction, it combines the professional networking power of LinkedIn with the collaborative editing capabilities of Google Docs.

---

## ✨ Key Features

### 📝 Professional Document Editor
- **Advanced Tiptap Integration**: A rich-text editor equipped with 15+ professional extensions including Tables, Task Lists, Image support, Highlighting, and more.
- **Real-time Collaboration**: Powered by Socket.io for near-zero latency synchronization between multiple users editing the same document.
- **Export Options**: Save your work as PDF or HTML directly from the browser.

### 📡 Networking & Real-time Hub
- **Dynamic Friend System**: Send, accept, and manage networking requests with optimistic UI updates.
- **Live Presence Tracking**: See who's online in real-time.
- **Instant Messaging**: WhatsApp-style chat system with instant delivery and presence indicators.

### 🔐 Secure Authentication
- **JWT-based Security**: Secure token-based authentication with persistent sessions.
- **OTP Verification**: Enhanced security for user registration and password management.
- **Modern Middleware**: Protected routes and secure API architecture.

### 🎨 Premium UI/UX
- **Glassmorphism Design**: A modern, sleek interface with hardware-accelerated animations.
- **Full Responsiveness**: Optimized for desktop, tablet, and mobile devices.
- **Vibrant Aesthetics**: Curated color palettes and smooth transitions for a "Premium" feel.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Socket.io-client, Lucide Icons, Axios |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB (Mongoose) |
| **Styling** | Vanilla CSS (Modern CSS3 with Variables & Flex/Grid) |
| **Security** | JWT, Bcrypt, Helmet, Cookie-Parser |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB
- NPM or Yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sadyal/VertexFlow.git
   cd VertexFlow
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   ```
   - Create a `.env` file in the `server` directory (use `.env.example` as a template).
   - Add your `MONGO_URI`, `JWT_SECRET`, and SMTP credentials.

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the App

1. **Start the Backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 🔄 Application Flow

1. **Authentication**: Users land on a modern landing page, register with OTP verification, and log in to receive a secure JWT.
2. **Dashboard**: Access a high-performance dashboard showing recent documents and networking activity.
3. **Collaboration**: Open or create a document to start editing. Any other user with access will see changes instantly via WebSockets.
4. **Networking**: Navigate to the "Network" hub to connect with other professionals, track their status, and start real-time conversations.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed with ❤️ by [Sadyal](https://github.com/Sadyal)**
