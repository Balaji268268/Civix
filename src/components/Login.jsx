import React, { useEffect, useState } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Gavel, FileText, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

// Role Configuration
const ROLES = [
  {
    id: 'user',
    title: 'Citizen',
    description: 'Report issues, vote, and track city progress.',
    icon: User,
    color: 'from-emerald-400 to-green-600',
    shadow: 'shadow-emerald-500/30'
  },
  {
    id: 'officer',
    title: 'Field Officer',
    description: 'Resolve assigned tasks and update status.',
    icon: FileText,
    color: 'from-blue-400 to-indigo-600',
    shadow: 'shadow-blue-500/30'
  },
  {
    id: 'moderator',
    title: 'Moderator',
    description: 'Validate reports and manage community safety.',
    icon: Gavel,
    color: 'from-orange-400 to-red-500',
    shadow: 'shadow-orange-500/30'
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'System oversight and user management.',
    icon: Shield,
    color: 'from-slate-700 to-black',
    shadow: 'shadow-gray-500/30'
  }
];

const Login = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  // Redirect Logic
  useEffect(() => {
    const performRedirect = async () => {
      if (isSignedIn && user) {
        let role = selectedRole || 'user'; // Default to user if direct login

        // Fetch verification from backend
        try {
          const token = await window.Clerk?.session?.getToken();
          const res = await fetch(`http://localhost:5000/api/profile/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
            const data = await res.json();
            role = data.role || role;

            // CHECK APPROVAL STATUS
            if (role === 'officer' && data.isApproved === false) {
              toast.error("Account Pending Approval");
              // You might want a dedicated "Pending" page, but for now toast + stay or redirect home
              // navigate('/approval-pending'); 
              return;
            }
          }
        } catch (e) {
          console.warn("Login fetch failed", e);
        }

        switch (role) {
          case 'admin': navigate('/admin/dashboard'); break;
          case 'moderator': navigate('/moderator'); break;
          case 'officer': navigate('/officer/dashboard'); break;
          default: navigate('/user/dashboard');
        }
      }
    };

    if (isSignedIn) performRedirect();
  }, [isSignedIn, user, navigate, selectedRole]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-400/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse" />
      </div>

      <div className="w-full max-w-6xl z-10">
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            // ROLE SELECTION SCREEN
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight text-center">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">Civix</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-12 text-center max-w-2xl">
                Select your role to access the dedicated portal.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                {ROLES.map((role) => (
                  <motion.div
                    key={role.id}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={`bg-white dark:bg-gray-800 rounded-3xl p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-transparent hover:ring-2 hover:ring-offset-2 hover:ring-green-500 dark:hover:ring-offset-gray-900 transition-all shadow-xl ${role.shadow} group`}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all`}>
                      <role.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{role.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {role.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <p className="text-gray-400 text-sm">Need help? <Link to="/contact" className="text-green-600 hover:underline">Contact Support</Link></p>
              </div>
            </motion.div>
          ) : (
            // AUTH SCREEN
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                  <button onClick={() => setSelectedRole(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">Login as {ROLES.find(r => r.id === selectedRole)?.title}</h2>
                    <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Secure Portal
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <SignIn
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-none w-full bg-transparent",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                        formButtonPrimary: "bg-green-600 hover:bg-green-700 !shadow-none !border-none",
                      }
                    }}
                    signUpUrl='/signup'
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToastContainer position="top-right" theme="colored" />
    </div>
  );
};

export default Login;
