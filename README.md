<div align="center">

# ⚡ PulseChat: Enterprise Real-Time Messaging Platform

An enterprise-ready, low-latency, event-driven real-time messaging system built with **Node.js, Express, Socket.IO, React 19, and MongoDB**. Designed with a dual-channel architecture decoupling stateless HTTP transactional logic from persistent full-duplex WebSocket streams.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?style=flat&logo=socketdotio&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

---

## 🏛️ System Architecture Overview

PulseChat enforces a **Dual-Channel Architecture** designed for high throughput and fault-tolerant concurrency:

1. **Stateless Control Plane (HTTP / Express REST API):** Handles authentication handshakes, user directory queries, group RBAC permissions, and historical message audits via standard JWT Bearer tokens.
2. **Stateful Data Plane (WebSockets / Socket.IO):** Maintains persistent bi-directional TCP connections for sub-50ms message propagation, ephemeral typing indicators, room multiplexing, and live heartbeat presence tracking.

```mermaid
graph TD
    subgraph Client Tier ["Client Tier (React 19 + Vite)"]
        UI["Modern UI / Theme Engine"]
        Store["State Isolation & Optimistic Caching"]
        WSClient["Socket.IO Client (Reconnection Backoff)"]
        HTTPClient["Axios REST Client (JWT Interceptor)"]
    end

    subgraph Server Tier ["Application Tier (Node.js + Express + Socket.IO)"]
        REST["Stateless REST Handlers (/api/*)"]
        WSEngine["Socket.IO Event Multiplexer"]
        AuthMid["JWT Verification Middleware"]
        PresenceMgr["In-Memory Active Session Registry"]
    end

    subgraph Persistence Tier ["Data Tier (MongoDB Cluster)"]
        UserCol[("Users (Indexed on Email & Name)")]
        GroupCol[("Groups (Member Array ObjectIds)")]
        MsgCol[("Messages ({ roomId: 1, createdAt: 1 })")]
    end

    HTTPClient -->|HTTPS REST| REST
    WSClient <-->|WSS Bi-directional| WSEngine
    REST --> AuthMid
    AuthMid --> UserCol
    REST --> GroupCol
    WSEngine --> PresenceMgr
    WSEngine <-->|Async Persist / Stream| MsgCol
```

---

## 🚀 Key Engineering Highlights

### 1. Low-Latency Bi-Directional Event Pipeline
- **Sub-50ms Message Delivery:** Eliminates polling latency through persistent WebSocket framing (only 2–6 bytes of protocol overhead per packet vs. ~1KB HTTP headers).
- **Deterministic Room Partitioning:** Direct message channels are generated via collision-free lexicographical sorting (`[userIdA, userIdB].sort().join('_')`), guaranteeing $O(1)$ room resolution.
- **Dynamic Fan-Out:** Room broadcasting distributes packets to active sockets without redundant round-trips.

### 2. High-Performance Database Indexing & Retention
- **Compound B-Tree Indexing:** Messages leverage `{ roomId: 1, createdAt: 1 }`, ensuring index-only scans (`IXSCAN`) for pagination queries and completely eliminating in-memory sorting bottlenecks.
- **Automated TTL Retention Policy:** Configured with MongoDB Time-To-Live indexing (`expireAfterSeconds: 2592000`) for automated 30-day compliance data purging without background cron overhead.
- **Index Migration Safeguards:** Automated startup checks cleanly identify and prune legacy sparse index conflicts, guaranteeing zero downtime.

### 3. Fault Tolerance & Network Resilience
- **Smart Transport Fallback:** Supports automatic progressive degradation from WebSockets down to HTTP Long-Polling for clients behind restrictive corporate firewalls.
- **Exponential Reconnection Backoff:** Prevents Thundering Herd problems during server restarts by distributing reconnection retries with randomized jitter.
- **Hybrid Failover Persistence:** In-memory fallback persistence keeps messaging and session lookups active even during transient database disconnects.

### 4. Enterprise Security & Authorization
- **Cryptographic Password Hashing:** Salt generation with 10-round Bcrypt work factors.
- **Stateless Session Tokens:** Signed JSON Web Tokens (JWT) verified via HTTP headers and socket handshake parameters.
- **Scoped Room Authorization:** Strict membership verification on private rooms prevents cross-tenant data leaks.

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+) | Asynchronous, non-blocking event-driven runtime |
| **Web Framework** | Express 5 | High-performance HTTP REST routing |
| **Real-Time Engine** | Socket.IO 4.8 | Stateful WebSocket bidirectional event stream |
| **Database** | MongoDB Atlas / Mongoose | Document datastore with compound and TTL indexing |
| **Security** | JWT, BcryptJS | Token authentication and cryptographic password hashing |
| **Frontend Framework** | React 19, Vite | Fast reconciliation and optimized component rendering |
| **Styling** | Tailwind CSS v4 | Responsive layout system with Dark/Light mode |
| **Icons & Assets** | Lucide React | Modern SVG UI iconography |

---

## 📡 API & WebSocket Specification

### REST Endpoints (Stateless)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users` | Public | Register new user account |
| `POST` | `/api/users/login` | Public | Authenticate user & issue JWT token |
| `GET` | `/api/users` | Private | Search user directory (excludes requester) |
| `GET` | `/api/users/me` | Private | Retrieve authenticated user profile |
| `POST` | `/api/groups` | Private | Create collaborative group channel |
| `GET` | `/api/groups` | Private | Fetch joined groups with populated metadata |
| `PUT` | `/api/groups/:id/add` | Private (Host) | Invite user to private group |
| `GET` | `/api/messages/:roomId` | Private | Fetch paginated room message history |

### WebSocket Event Protocol (Stateful)

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `setup` | Client ➔ Server | `{ _id, name }` | Registers user session & broadcasts online presence |
| `online_users` | Server ➔ Client | `[userId1, userId2]` | Emits array of active connected user IDs |
| `join_room` | Client ➔ Server | `roomId` | Subscribes socket to target room channel |
| `leave_room` | Client ➔ Server | `roomId` | Unsubscribes socket from target room channel |
| `send_message` | Client ➔ Server | `{ roomId, sender, senderName, content }` | Dispatches message for persistence and broadcast |
| `receive_message`| Server ➔ Client | `{ _id, roomId, sender, senderName, content, timestamp }` | Pushes incoming message to room subscribers |
| `typing` | Client ➔ Server | `{ roomId, userName }` | Dispatches typing signal (debounced) |
| `user_typing` | Server ➔ Client | `{ roomId, userName }` | Informs room members that a peer is typing |
| `stop_typing` | Client ➔ Server | `{ roomId, userName }` | Clears active typing signal |

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18.x or later)
- MongoDB instance (local or MongoDB Atlas cluster connection URI)

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/Yash-Amane03/Real-Time-Collaborative-Platform.git
cd Real-Time-Collaborative-Platform
```

Create `.env` inside `backend/`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/pulsechat?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_enterprise_jwt_key
```

### 2. Install & Start Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 3. Install & Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` (or next open port).*

### 4. Rapid Testing Demo Accounts
The login page includes one-click autofill for instant multi-window verification:
- **User 1:** `alice@test.com` / `password123`
- **User 2:** `bob@test.com` / `password123`

---

## 📈 Scalability Blueprint (Roadmap to 500k+ Connections)

For horizontal scaling in enterprise deployments:
1. **Redis Pub/Sub Adapter:** Incorporate `@socket.io/redis-adapter` to distribute room broadcast packets across a clustered pool of Node.js instances.
2. **Reverse Proxy Load Balancing:** Utilize NGINX or AWS Application Load Balancer with IP hash stickiness during initial HTTP upgrade handshakes.
3. **Database Sharding:** Shard the MongoDB `messages` collection on `roomId` to partition high-volume channels across dedicated database shards.
