# ⚙️ VertexFlow Server Application

This directory houses the backend server for **VertexFlow**. The server handles REST API routing, user authentication and email validation, database interactions, Socket.io connections for document editing, and clusters state management via Redis.

---

## 🛠️ Backend Tech Stack

* **Server Runtime:** [Node.js 20.x](https://nodejs.org/)
* **HTTP Framework:** [Express 5.2 (Latest)](https://expressjs.com/)
* **Database & ODM:** [MongoDB Atlas](https://www.mongodb.com/atlas/database) + [Mongoose 9.5](https://mongoosejs.com/)
* **Shared State Cache:** [Redis Stack](https://redis.io/) + [ioredis 5.10](https://github.com/redis/ioredis)
* **Real-time Server:** [Socket.io 4.8](https://socket.io/) (with `@socket.io/redis-adapter` for load balancing)
* **AI Copilot SDK:** [Groq SDK 1.1](https://github.com/groq/groq-sdk-node) (Llama 3.3 70B Versatile model)
* **Image Processor:** [Sharp 0.34](https://sharp.pixelplumbing.com/) (WebP conversion) + [Cloudinary 2.10 SDK](https://cloudinary.com/) (CDN storage)
* **Email Broker:** [Nodemailer 8.0](https://nodemailer.com/)

---

## 📂 Source Structure

The backend server is structured around feature-based business modules and operational pipelines:

```
server/
├── config/              # Central initialization configurations
│   ├── db.js            # MongoDB Mongoose connection and error listeners
│   ├── redis.js         # ioredis client setup and connection recovery strategies
│   └── nodemailer.js    # Brevo SMTP carrier credentials
│
├── middleware/          # Security headers, limits, and request interceptors
│   ├── auth.middleware.js        # JWT token extraction and verification
│   ├── admin.middleware.js       # Admin role validation rules
│   ├── rateLimiter.js            # Heavy route and socket flooding guards
│   └── protection.middleware.js  # JSON body sanitizer (nesting/array bombs) and 10s timeouts
│
├── models/              # MongoDB Mongoose model schemas
│   ├── user.model.js             # User accounts, verification states, roles
│   ├── document.model.js         # Document content (Lexical JSON tree) & collaborative IDs
│   ├── post.model.js             # Social feed records, likes, comments
│   ├── message.model.js          # Direct text logs for instant messaging
│   └── connection.model.js       # User connection states (friends)
│
├── modules/             # Express routes, controllers, and services (Domain-driven)
│   ├── auth/            # Authentication, registration OTPs, password recoveries
│   ├── document/        # Document CRUD, permissions, export streams
│   ├── ai/              # Groq completion templates & Llama text generation
│   ├── social/          # Feed management, upload handling, comment/likes CRUD
│   ├── network/         # Friendship request triggers and messaging services
│   └── admin/           # Administrative analytical pipelines & system status controllers
│
├── sockets/             # Real-time WebSocket layer
│   ├── index.js         # Connection gateway, Redis cluster adapter, orphan cleanup worker
│   ├── socketAuth.js    # In-transit socket JWT verification handshake
│   ├── socketState.js   # Multi-tab sync trackers, active limits (max 3), presence registries
│   ├── doc.socket.js    # Document sync events (deltas, saves, titles, cursors)
│   └── network.socket.js# Friend requests and private message dispatchers
│
└── utils/               # Loggers, hashes, and Cloudinary stream piping helpers
```

---

## 🔐 Security & Payload Validation Pipeline

To protect the server from memory exhaustion and security exploits, every request passes through these security layers:

1. **Granular Body Sanitizer:** `protection.middleware.js` scans incoming JSON structures. It blocks nested array bombs and restricts object tree size to prevent stack overflows.
2. **Payload Size Guard:** Default JSON body parsing is restricted to **2MB** to support avatar uploads while preventing buffer starvation attacks.
3. **Websocket Rate Limiting:** Socket events like `send-changes` and `update-title` are tracked. Title changes are restricted to 1 per second per connection.
4. **JWT Cookie Shield:** Post-login JWTs are read from HTTP-only and Secure cookies. They cannot be accessed by client-side Javascript.

---

## 🛠️ CLI Developer Scripts

The root of `/server` contains three core utilities to accelerate development and testing:

* **`node seed_test_data.js`**: Connects to the database, wipes existing test users, and seeds:
  - An owner account: `owner@test.com` (password: `password123`)
  - A collaborator account: `collab@test.com` (password: `password123`)
  - A shared sample collaborative document (ID: `test-doc-id-12345`)
* **`node makeAdmin.js`**: Elevates the first registered database user to the `admin` role, instantly unlocking access to the `/admin` dashboard.
* **`node test_socket.js`**: Simulates two parallel socket connections (Owner and Collaborator) running on different client tabs to verify delta syncing, active member lists, cursor updates, and proper session tracking.

---

## 🚀 Execution & Command Reference

From inside the `/server` directory:

### Install Dependencies
```bash
npm install
```

### Start Development Server
Starts the application using `nodemon` for active code observation and automatic restart.
```bash
npm run dev
```

### Start Production Server
Boots the server using standard node runtime execution.
```bash
npm run start
```
