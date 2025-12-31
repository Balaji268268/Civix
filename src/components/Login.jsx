
import React, { useEffect } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import csrfManager from '../utils/csrfManager';
import { ToastContainer } from 'react-toastify';

import { motion } from "framer-motion";
import 'react-toastify/dist/ReactToastify.css';
import loginImage from "../assets/signup.png";

const Login = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const performRedirect = async () => {
      if (isSignedIn && user) {
        // 0. Smart Redirect: Check if we were sent here from a specific page
        // location.state might be lost if Clerk does a hard redirect, so standard Clerk pattern
        // is often to use the `redirectUrl` param, but we'll try state first.
        // If the user came from a protected route (PortalGuard), state.from will be set.
        const intendedDestination = location.state?.from?.pathname;
        if (intendedDestination && intendedDestination !== '/' && intendedDestination !== '/login') {
          // Smart Redirect Logic
          navigate(intendedDestination, { replace: true });
          return;
        }

        let role = 'user'; // Default

        // 1. Fetch Latest Role from Backend (Priority Source of Truth)
        try {
          const token = await window.Clerk?.session?.getToken();
          const res = await csrfManager.secureFetch(`/ api / profile / ${user.id} `, {
            headers: { 'Authorization': `Bearer ${token} ` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.role) role = data.role;
          } else {
            // Fallback: Use Clerk Metadata if backend fetch fails
            role = user.publicMetadata?.role || 'user';
          }
        } catch (e) {
          console.warn("Login fetch failed, falling back to metadata:", e);
          role = user.publicMetadata?.role || 'user';
        }

        // 2. Redirect based on resolved role
        console.log("Redirecting for role:", role);
        switch (role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'moderator':
            navigate('/moderator');
            break;
          case 'officer':
            navigate('/officer/dashboard');
            break;
          default:
            navigate('/user/dashboard');
        }
      }
    };

    performRedirect();
  }, [isSignedIn, user, navigate, location]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen items-center justify-center font-inter relative bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-emerald-950/30">

      {/* Left Side - Image (Hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden md:flex md:w-1/2 justify-center items-center p-8"
      >
        <img
          src={loginImage}
          alt="Login Illustration"
          className="max-w-full h-auto object-contain drop-shadow-2xl rounded-2xl"
        />
      </motion.div>

      {/* Right Side - Clerk Login Component */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="md:w-1/2 w-full flex justify-center p-4"
      >
        <div className="w-full max-w-md">
          <SignIn
            path="/login"
            signUpUrl="/signup"
            // forceRedirectUrl="/user/dashboard" // Custom logic in useEffect handles this
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "w-full shadow-2xl border border-white/20 rounded-2xl backdrop-blur-md bg-white/80 dark:bg-gray-900/80",
                headerTitle: "text-2xl font-bold text-green-700",
                headerSubtitle: "text-gray-600",
                formButtonPrimary: "bg-green-600 hover:bg-green-700 text-white",
                formFieldInput: "rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500",
                footerActionLink: "text-green-600 hover:text-green-700 font-bold"
              }
            }}
          />

          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-green-700 hover:underline font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Login;
