# 🏙️ Civix - Next-Gen Civic Engagement Platform 🚀

> **Empowering Communities, Enabling Action.**  
> A smart, AI-driven platform bridging the gap between citizens and authorities.

![Civix Dashboard Showcase](https://raw.githubusercontent.com/TechBalaji/Civix/main/public/showcase-banner.png)

## 🌟 Overview
**Civix** is a full-stack civic engagement ecosystem designed to modernize how communities report issues, vote on local matters, and interact with public services. It replaces outdated bureaucratic processes with a **real-time, transparent, and AI-enhanced** digital workflow.

### 🔑 Key Pillars
*   **🤖 AI-Powered Triage**: Automatic verification, priority scoring, and fake news detection for every reported issue.
*   **📊 Role-Based Portals**: Dedicated, secure environments for Citizens, Field Officers, Moderators, and Admins.
*   **⚡ Real-Time Intelligence**: Live feeds for disaster alerts (SDRF), transport tracking, and grid analytics.
*   **🔐 Secure & Scalable**: Enterprise-grade security with Role-Based Access Control (RBAC) and JWT authentication.

---

## 🚀 Key Features

### 1. 📢 Smart Issue Reporting (User)
*   **One-Click Reporting**: seamless photo upload and location tagging.
*   **AI Quality Check**: Instant feedback on image clarity before submission.
*   **Live Tracking**: Visual timeline tracking your file from "Pending" to "Resolved".

### 2. 🛡️ Moderator Command Center
*   **AI Diagnosis**: 
    *   **Fake Detection**: Probability score to filter spam/fake reports.
    *   **Priority Scoring**: Auto-tags issues as "High", "Medium", or "Low" based on visual severity.
    *   **Auto-Categorization**: Routes issues to "Roads", "Water", "Sanitation" etc.
*   **Workflow**: Two-column layout for "Inbox" vs "Processed".
*   **Smart Actions**: One-click "Escalate", "Reject", or "Assign to Officer".

### 3. 👮 Officer Field Portal
*   **Task Management**: Dedicated "My Tasks" view for assigned complaints.
*   **Status Updates**: Officers can mark issues "In Progress" or "Resolved" with proof.
*   **Department Isolation**: Officers only see relevant tasks (e.g., Water officers don't see Potholes).

### 4. 🧠 Admin Analytics Suite
*   **Platform Health**: Global stats on issue resolution rates, user trust scores, and department efficiency.
*   **Duplicate Detection**: AI finds and groups similar complaints to prevent redundancy.
*   **Community Pulse**: Real-time ticker of trending and high-priority local issues.

### 5. 🌐 Live Service Integrations
*   **SDRF & Disasters**: Real-time disaster alerts via ReliefWeb API.
*   **Smart Grid**: Live power grid stress prediction via Open-Meteo Weather API.
*   **Transit**: Real-time bus tracking simulation.

---

## 🛠️ Technology Stack

### **Frontend**
*   **React.js (Vite)**: Lightning-fast UI rendering.
*   **Tailwind CSS**: Modern, responsive, glassmorphic design system.
*   **Framer Motion**: Smooth, app-like animations and transitions.
*   **Clerk Auth**: Robust user authentication and session management.
*   **Recharts**: Interactive data visualization for Admin analytics.

### **Backend**
*   **Node.js & Express**: High-performance REST API.
*   **MongoDB (Mongoose)**: Flexible, scalable document schema for Issues and Users.
*   **Socket.io**: Real-time bidirectional communication (Notifications, Chat).
*   **Cloudinary**: Optimized media storage and delivery.

### **AI & ML Layer**
*   **Google Generative AI (Gemini)**: Visual analysis, categorization, and priority scoring.
*   **Python (Django)**: robust ML microservices for predictive analytics.

---

## ⚙️ Installation & Setup

Follow these steps to deploy Civix locally.

### 1. Clone Repository
```bash
git clone https://github.com/TechBalaji/Civix.git
cd Civix
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file (see Configuration below)
npm start
```

### 3. Frontend Setup
```bash
cd src  # or root, depending on script
npm install
npm start
```

### 4. Python ML Service (Optional)
```bash
cd ml_service
pip install -r requirements.txt
python manage.py runserver
```

---

## 🔧 Configuration (`.env`)

Create a `.env` file in the `backend` directory with the following keys. 
**Note:** Never commit your actual API keys!

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/civix

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here

# Media Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 🤝 Application Flow

1.  **User Report**: User uploads a photo of a pothole.
2.  **AI Analysis**: Backend sends image to AI. AI returns: `{ "priority": "High", "isFake": false, "category": "Roads" }`.
3.  **Moderation**: Issue appears in Moderator Dashboard/Trending Feed. Moderator verifies and clicks "Assign".
4.  **Officer Action**: "Roads" Officer receives notification. Goes to site, fixes it, uploads "After" photo, marks "Resolved".
5.  **Resolution**: User gets a notification: "Your issue has been resolved!" 🎉

---

## 🔗 Links

*   **GitHub**: [https://github.com/TechBalaji/Civix](https://github.com/TechBalaji/Civix)
*   **Live Demo**: [Coming Soon]

---

<p align="center">
  Made with ❤️ by <b>TechBalaji Team</b> for a Better Tomorrow.
</p>
