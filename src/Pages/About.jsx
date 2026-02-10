// src/components/About.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useUser } from "@clerk/clerk-react";
import csrfManager from '../utils/csrfManager';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './About.css';
import mission from '../assets/mission.png';
import {
  Users,
  Globe,
  Heart,
  Target,
  Zap,
  Shield,
  Award,
  Smartphone
} from 'lucide-react';

function About() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Smart "Get Started" Logic
  const handleGetStarted = async () => {
    if (!isSignedIn) {
      navigate('/signup');
      return;
    }

    // Role-Based Navigation
    let role = null;
    try {
      const res = await csrfManager.secureFetch(`/api/profile/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        role = data.role;
      }
    } catch (e) {
      console.warn("Role fetch fallback failed:", e);
    }

    // Fallback to metadata if backend fetch fails
    if (!role) role = user?.publicMetadata?.role;

    switch (role) {
      case 'admin': navigate('/admin/dashboard'); break;
      case 'moderator': navigate('/moderator'); break;
      case 'officer': navigate('/officer/dashboard'); break;
      case 'user':
      default: navigate('/user/dashboard');
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(
    () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [activeFeature, setActiveFeature] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const learnMoreRef = useRef(null);

  useEffect(() => {
    if (showMore && learnMoreRef.current) {
      setTimeout(() => {
        learnMoreRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        AOS.refresh();
      }, 60);
    }
  }, [showMore]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: false,
      mirror: true,
    });

    const refreshAOS = () => AOS.refresh();
    window.addEventListener('load', refreshAOS);
    window.addEventListener('resize', refreshAOS);
    const timeoutId = setTimeout(refreshAOS, 600);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setIsDarkMode(mq.matches);
    mq.addEventListener && mq.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('load', refreshAOS);
      window.removeEventListener('resize', refreshAOS);
      clearTimeout(timeoutId);
      mq.removeEventListener && mq.removeEventListener('change', handleChange);
    };
  }, []);


  const features = [
    {
      icon: <Users className="w-7 h-7" />,
      title: "Community Building",
      description: "Connect with like-minded individuals in your area",
      details: "Create lasting relationships and build stronger neighborhoods through our advanced matching system."
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Real-Time Analytics",
      description: "Monitor community engagement with live data",
      details: "Track posts, comments, and votes in real-time to understand community pulse."
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: "AI Genius Insights",
      description: "Smart analysis powered by Gemini AI",
      details: "Get automated insights and recommendations based on community activity trends."
    },
    {
      icon: <Target className="w-7 h-7" />,
      title: "Goal Tracking",
      description: "Measure your impact with precision",
      details: "Advanced analytics and reporting tools help you track progress and celebrate achievements."
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: "Quick Actions",
      description: "Take immediate action when it matters",
      details: "Real-time notifications and one-click participation make helping others effortless."
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Verified Projects",
      description: "Trust in legitimate, vetted opportunities",
      details: "Every project undergoes rigorous verification to ensure your time and effort create real impact."
    },
    {
      icon: <Award className="w-7 h-7" />,
      title: "Recognition System",
      description: "Get acknowledged for your contributions",
      details: "Earn badges, certificates, and community recognition for your volunteer work and achievements."
    },
    {
      icon: <Smartphone className="w-7 h-7" />,
      title: "Mobile First",
      description: "Volunteer on the go with our mobile app",
      details: "Native iOS and Android apps with offline capabilities and push notifications."
    }
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Modern Background Blobs - Content Verified as "Perfect" by User */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* HERO */}
        <section className="relative pt-32 pb-20 px-6 text-center" data-aos="fade-up">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100/10 border border-emerald-500/20 backdrop-blur-md text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-6"
          >
            <span className="mr-2">✨</span> Empowering Citizens
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-tight">
            Report Local Issues.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
              Make Your City Better.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Civix helps citizens report and track local civic issues like potholes, broken lights,
            and garbage collection problems with unprecedented ease and transparency.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={handleGetStarted}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all"
            >
              Get Started
            </motion.button>
            <motion.button
              onClick={() => setShowMore(!showMore)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all"
            >
              {showMore ? "Show Less" : "Learn More"}
            </motion.button>
          </div>
        </section>

        {/* EXPANDABLE SECTION */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              key="learn-more"
              ref={learnMoreRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="overflow-hidden"
            >

              {/* FEATURES GRID */}
              <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">
                      Everything you need to make a
                      <span className="text-emerald-500 block mt-2">real difference</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className={`group relative p-8 rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden border
                          ${activeFeature === index
                            ? 'bg-emerald-900/10 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                            : 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-gray-100 dark:border-gray-800 hover:border-emerald-500/30'
                          }`}
                        onMouseEnter={() => setActiveFeature(index)}
                        onMouseLeave={() => setActiveFeature(null)}
                      >
                        {/* Subtle Glow Background on Hover */}
                        {activeFeature === index && (
                          <div className="absolute inset-0 bg-emerald-500/5 transition-colors duration-300 rounded-3xl" />
                        )}

                        <div className={`mb-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                          ${activeFeature === index
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                          {React.cloneElement(feature.icon, { className: "w-7 h-7" })}
                        </div>

                        <h3 className={`text-xl font-bold mb-3 transition-colors ${activeFeature === index ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                          {feature.title}
                        </h3>

                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                          {feature.description}
                        </p>

                        <AnimatePresence>
                          {activeFeature === index && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-emerald-500/20 pt-4"
                            >
                              <p className="text-sm text-emerald-800 dark:text-emerald-300/80 font-medium">
                                {feature.details}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* WHY SECTION */}
              <section className="py-20 px-6 relative">
                <div className="max-w-7xl mx-auto bg-gradient-to-r from-gray-900 to-gray-800 dark:from-emerald-950/50 dark:to-gray-900/80 border border-gray-700/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-16 overflow-hidden relative shadow-2xl">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="md:w-1/2 text-left">
                      <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Why Choose Civix?</h2>
                      <p className="text-lg text-gray-300 leading-relaxed mb-8">
                        Civix empowers citizens by simplifying the process to voice concerns and foster positive
                        change in communities. We connect the public with civic authorities for enhanced governance.
                      </p>
                      <Link to="/signup">
                        <button className="px-6 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-lg font-bold transition-all shadow-lg shadow-white/10">
                          Join the Movement
                        </button>
                      </Link>
                    </div>

                    {/* Stats / Visuals */}
                    <div className="md:w-1/2 grid grid-cols-2 gap-4">
                      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center hover:bg-white/10 transition-colors">
                        <div className="text-4xl font-bold text-emerald-400 mb-2">50k+</div>
                        <div className="text-sm text-gray-400">Issues Resolved</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center hover:bg-white/10 transition-colors">
                        <div className="text-4xl font-bold text-teal-400 mb-2">98%</div>
                        <div className="text-sm text-gray-400">Response Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default About;
