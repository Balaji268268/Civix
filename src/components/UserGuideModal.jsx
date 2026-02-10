import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Smartphone, Map, TrendingUp, Vote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';

const UserGuideModal = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [isOpen, setIsOpen] = useState(true);
    const navigate = useNavigate();
    const { isSignedIn } = useAuth();
    const { user } = useUser();

    const steps = [
        {
            title: "Welcome to Civix! 👋",
            desc: "Your all-in-one platform for civic engagement. Let's get you started.",
            icon: Smartphone,
            color: "emerald"
        },
        {
            title: "Report Issues 📸",
            desc: "Spot a pothole or garbage? Snap a pic, upload it, and we'll notify the authorities. You earn XP for every report!",
            icon: Map,
            color: "blue"
        },
        {
            title: "Earn & Compete 🏆",
            desc: "Gain XP for reporting, liking, and commenting. Level up to become a 'Civix Legend' and top the leaderboard.",
            icon: TrendingUp,
            color: "yellow"
        },
        {
            title: "Community Power ✊",
            desc: "Vote on community polls and upvote issues to increase their priority. Your voice matters!",
            icon: Vote,
            color: "purple"
        }
    ];

    const markGuideAsSeen = async () => {
        try {
            if (isSignedIn && user) {
                await csrfManager.secureFetch(`/api/profile/${user.id}/guide-seen`, {
                    method: 'PUT'
                });
            }
        } catch (e) {
            console.error("Failed to mark guide as seen:", e);
        }
        localStorage.setItem("hasSeenGuide", "true"); // Fallback
    };

    const handleNext = async () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            // Final Step Logic: "Get Started"
            await markGuideAsSeen();
            setIsOpen(false);
            if (onComplete) onComplete();

            // Smart Navigation if Signed In
            if (isSignedIn && user) {
                let role = null;
                try {
                    // Try fetch from backend for latest role
                    const res = await csrfManager.secureFetch(`/api/profile/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        role = data.role;
                    }
                } catch (e) {
                    console.warn("Role fetch fallback failed in Guide:", e);
                }


                // Fallback
                if (!role) role = user?.publicMetadata?.role;

                switch (role) {
                    case 'admin': navigate('/admin/dashboard'); break;
                    case 'moderator': navigate('/moderator'); break;
                    case 'officer': navigate('/officer/dashboard'); break;
                    case 'user':
                    default: navigate('/user/dashboard');
                }
            } else {
                // Even if not signed in, maybe go to signup? 
                // Or stay on home? Usually modal is on home so staying is fine.
                // But user might want to start acting.
                navigate('/signup');
            }
        }
    };

    const handleClose = () => {
        markGuideAsSeen();
        setIsOpen(false);
        if (onComplete) onComplete();
    };

    if (!isOpen) return null;

    const CurrentIcon = steps[step].icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden relative"
                >
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    <div className="p-8 text-center flex flex-col items-center">
                        <motion.div
                            key={step}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className={`w-20 h-20 rounded-2xl bg-${steps[step].color}-100 dark:bg-${steps[step].color}-900/30 flex items-center justify-center mb-6 mx-auto`}>
                                <CurrentIcon className={`w-10 h-10 text-${steps[step].color}-600 dark:text-${steps[step].color}-400`} />
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                                {steps[step].title}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
                                {steps[step].desc}
                            </p>
                        </motion.div>

                        <div className="flex gap-1 mb-8">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? `w-8 bg-${steps[step].color}-500` : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 bg-gradient-to-r from-${steps[step].color}-500 to-${steps[step].color}-600`}
                        >
                            {step === steps.length - 1 ? "Get Started" : "Next"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default UserGuideModal;
