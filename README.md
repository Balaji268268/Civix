# Civix - Advanced AI-Powered Civic Engagement Platform

**Civix** is a state-of-the-art civic engagement ecosystem designed to modernize the interaction between citizens and municipal authorities. By leveraging advanced Artificial Intelligence (Computer Vision, NLP), secure role-based workflows, and gamified community participation, Civix transforms static complaint systems into dynamic, collaborative city-building platforms.

---

## 🚀 Key Features & Functionalities

### 1. 🛡️ 4-Portal Architecture (Role-Based Access)
The system is divided into four distinct, secure portals, each tailored to specific stakeholder needs:

*   **User Portal (Citizens)**:
    *   **Dashboard**: View active complaints, earned badges, and local community stats.
    *   **Report Issue**: AI-assisted reporting with image upload, voice input, and auto-location.
    *   **Civic Tools**: Access to utilities like Tax Impact Calculator, Representative Finder, and Saferoute.
    *   **Community Hub**: Participate in "Green Papers" discussions, polls, and local events.
*   **Officer Portal (Field Agents)**:
    *   **Task Management**: Receive assigned issues based on location and workload.
    *   **Resolution Proof**: Upload "After" photos and notes to mark issues as resolved.
    *   **Settings**: Toggle duty status and manage profile.
*   **Moderator Portal (Verification)**:
    *   **Review Queue**: Validate citizen reports and officer resolutions.
    *   **Dispute Handling**: Arbitrate conflicts between users and officers (3-Way Verification).
    *   **Manual Assignment**: Override AI dispatching when necessary.
*   **Admin Portal (Control Center)**:
    *   **Global Analytics**: Real-time heatmaps, sentiment analysis, and performance metrics.
    *   **User Management**: Role assignment and trust score oversight.
    *   **System Settings**: Toggle Maintenance Mode, New Registrations, and Security Alerts.
    *   **Data Export**: Generate CSV reports for audits.

### 2. 🧠 Active AI & Machine Learning Engine
Civix employs a hybrid AI architecture for intelligent automation:

*   **Multi-Modal Issue Analysis**:
    *   **Computer Vision (MobileNetV2)**: Auto-tags images (e.g., "pothole", "garbage") and detects safety/NSFW content.
    *   **Semantic Matching (Gemini/TensorFlow)**: Cross-validates the image against the text description to prevent fake reports.
    *   **Duplicate Detection**: Visual and semantic embedding comparison to flag redundant complaints.
*   **Generative Captioning (BLIP)**: Automatically generates descriptive captions for uploaded evidence.
*   **Smart Routing (Load Balancing)**: AI assigns issues to the "Best Fit" officer by analyzing their current caseload, location, and department expertise.
*   **Lazy Loading via "Nvidia Techniques"**: Optimized ML model loading to reduce server bill-time and startup latency.

### 3. ✅ 3-Way Resolution Verification Workflow
A strict checks-and-balances system to ensure transparency:
1.  **Officer Submission**: Field officer fixes the issue and uploads "Proof of Work" (Image/Video).
2.  **Moderator Approval**: A moderator reviews the proof. If valid, it's marked "Resolved". If not, it's rejected back to the officer.
3.  **User Acknowledgment**: The original reporter confirms the fix. They can "Confirm" (Case Closed) or "Dispute" (Escalated to higher admin).

### 4. 🏙️ Community & Civic Tools
Beyond complaints, Civix fosters active citizenship:

*   **Civic Map**: Interactive map visualizing issues (Pins) and safe zones.
*   **Green Papers**: A digital town hall for discussing local policy and ideas (Reddit-style).
*   **Civic Simulator**: Educational decision-making game to understand city management.
*   **Safety Suite**:
    *   **SOS**: One-tap emergency alert.
    *   **Safe Word**: Voice-activated emergency recording.
    *   **Medical Info**: Quick access to user's critical health data.
*   **Utilities**:
    *   **Tax Impact**: Calculator showing how tax money is utilized.
    *   **Representative Finder**: Locate local elected officials.
    *   **Lost & Found**: Community board for lost items/pets.
    *   **Transport & Holidays**: Public service information.

### 5. ⭐ Gamification & Trust System
*   **Trust Score**: Every user has a dynamic 0-100 score affecting their report priority. Faking reports lowers it; verified reports raise it.
*   **Leaderboards**: "Civic Heroes" ranking to recognize top contributors.
*   **Badges**: Unlockable achievements (e.g., "Road Warrior", "Guardian").

---

## 🛠️ Technology Stack

| Component | Tech Stack |
| :--- | :--- |
| **Frontend** | React 18, Vite (Partial), Tailwind CSS, Framer Motion, Leaflet Maps, Recharts |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), Socket.io |
| **ML Service** | Python, Django/FastAPI, TensorFlow, Keras, Google Gemini Vision |
| **Auth** | Clerk (w/ Custom Role-Based Middleware) |
| **Storage** | Cloudinary (Images/Videos) |
| **Security** | CSRF Protection, JWT Verification, PortalGuard (RBAC) |

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)
*   MongoDB Atlas Account
*   Clerk & Cloudinary API Keys

### 1. Backend API
```bash
cd backend
npm install
# Configure .env with PORT, MONGO_URI, CLERK_SECRET_KEY, etc.
npm start
```

### 2. Frontend Client
```bash
# Root directory
npm install
# Configure .env with REACT_APP_API_URL, REACT_APP_CLERK_PUBLISHABLE_KEY
npm start
```

### 3. ML Microservice
```bash
cd ml_service
python -m venv venv
# Activate Venv (Windows: venv\Scripts\activate, Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
python manage.py runserver 8000
```

---

## 🔄 Deployment & CI/CD
*   **Frontend**: Deployed strategies include standard React builds (CRA/Vite).
*   **Backend**: Node.js runtime.
*   **ML**: Python runtime with heavy-model lazy loading optimization.
*   **Workflow**: Continuous integration via Git (Main Branch).

---

*Built for the Future of Governance.*
