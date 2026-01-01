# Civix - AI-Powered Civic Engagement Platform

**Civix** is a next-generation civic engagement platform designed to bridge the gap between citizens and municipal authorities using advanced AI, direct communication, and gamification.

## 🚀 Key Features

### 🏛️ 4-Portal Architecture
1.  **User Portal**: Report issues, vote in polls, track gamification stats (Points, Badges).
2.  **Officer Portal**: Field operations, task management, "Create Poll" tools.
3.  **Moderator Portal**: AI-assisted verification, assigning officers, conflict detection.
4.  **Admin Portal**: Global analytics, system configuration.

### 🧠 Active AI & Intelligence
-   **Hybrid Classification Engine**: Combines Text (NLP) and Image (Vision) analysis to detect fake reports (Spam) and categorize issues automatically.
-   **Cross-Modal Validation**: Ensures the uploaded image matches the description.
-   **Smart Routing**: AI suggests the "Best Fit" officer based on workload (Conflict Detection) and Trust Score.
-   **Duplicate Detection**: Visual and semantic checks to prevent redundant reports.

### ⭐ Gamification & Engagement
-   **Leaderboard**: "Civic Heroes" ranking to encourage participation.
-   **Points System**: Earn points for reporting issues and voting.
-   **Badges**: Unlockable achievements (e.g., "Citizen Journalist").
-   **Voice of City**: Polling system for community feedback.

### ⚡ Technology Stack
-   **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons.
-   **Backend**: Node.js, Express, MongoDB (Mongoose).
-   **AI/ML Service**: Python (FastAPI/Django), Google Gemini Vision, Sentence Transformers.
-   **Auth**: Clerk (Secure User Management).

## 🛠️ Setup & Installation

### Prerequisites
-   Node.js (v18+)
-   Python (v3.9+)
-   MongoDB Atlas URI
-   Clerk API Keys
-   Cloudinary Credentials

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env file with PORT, MONGO_URI, CLERK_KEYS, etc.
npm start
```

### 2. Frontend Setup
```bash
cd root # (or src folder depending on structure)
npm install
npm start
```

### 3. ML Service Setup
```bash
cd ml_service
python -m venv venv
# Activate venv
pip install -r requirements.txt
python manage.py runserver 8000
```

## 🔒 Security
-   **RBAC**: Strict Role-Based Access Control (`PortalGuard`).
-   **CSRF Protection**: Custom `csrfManager` for secure API calls.
-   **Validation**: Input sanitization and token verification.

---
*Built with ❤️ for Smarter Cities.*
