# Placement & Technical Interview Documentation: Real-Time Chat Platform

## 1. Core Architecture Diagram

```mermaid
graph TD
    Client["Client (React 19 + Vite)"] <-->|HTTP REST (JWT Auth, Groups)| API["Backend API (Express 5)"]
    Client <-->|WebSocket (Sub-50ms Messages, Typing, Presence)| Socket["Socket.IO Event Multiplexer"]
    API <--> DB[("MongoDB Cluster (Atlas)")]
    Socket <--> DB
    
    subgraph Frontend Architecture
        UI[Tailwind CSS Modern UI]
        ChatState[State Management / Optimistic UI]
        SocketClient[Socket.IO Client with Reconnection Backoff]
    end
    
    subgraph Backend Architecture
        AuthController[Auth & User Directory Controller]
        GroupController[Group Management Controller]
        MessageController[Message History / Access Control]
        SocketHandler[Event Handlers (setup, send_message, typing)]
    end
```

## 2. Database Schema & Indexing

### Users Collection
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `name` | String | Full name / Display Name |
| `username` | String | Unique username |
| `email` | String | Unique index, normalized lowercase |
| `password` | String | Bcrypt hash (10 salt rounds) |
| `createdAt` | Date | Audit timestamp |

### Groups Collection
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `name` | String | Channel or Group name |
| `description` | String | Channel purpose / topic |
| `host` | ObjectId | Foreign Key reference to User (Admin) |
| `members` | Array<ObjectId> | Indexed array of User references |
| `createdAt` | Date | Creation timestamp |

### Messages Collection
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier |
| `roomId` | String | Channel ID, Group ID, or sorted DM composite key |
| `sender` | ObjectId | Foreign Key reference to User |
| `senderName` | String | Cached sender display name |
| `content` | String | Sanitized message body |
| `createdAt` | Date | Timestamp (Indexed for chronological queries & TTL) |

#### Indexes:
- Compound Index: `{ roomId: 1, createdAt: 1 }` — Enables $O(\log N)$ indexed cursor fetches.
- TTL Index: `{ createdAt: 1 }` with `expireAfterSeconds: 2592000` — 30-day data retention policy.

---

## 3. High-Value Interview Talking Points

1. **Dual-Channel Architecture:** Decoupled stateless control plane (Express REST) from stateful data plane (Socket.IO WebSockets) for security and low-overhead frame efficiency (2–6 bytes framing vs 1KB HTTP headers).
2. **Compound Index Optimization:** Walk the interviewer through why `{ roomId: 1, createdAt: 1 }` eliminates in-memory sorting bottlenecks during high-volume message pagination.
3. **Resilience & Fault Tolerance:** Automatic transport fallback (WebSockets to Long-Polling), exponential reconnection backoff, and in-memory persistence fallback for database reconnections.
4. **Production Troubleshooting:** Resolved real-world MongoDB E11000 index collision on legacy sparse keys by automating index drop scripts during connection lifecycle.
