import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  BarChart3,
  Vote
} from "lucide-react";
import PollFeed from "../components/polls/PollFeed";
import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";

const CommunityVotingPage = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <PageTransition>
      <div className={isDark ? "dark" : ""}>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-green-950 dark:via-gray-900 dark:to-emerald-900 transition-colors duration-300">
          <Navbar />

          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-24">
            {/* Header */}
            <div className="text-center relative mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
              >
                <Vote className="w-8 h-8 text-white" />
              </motion.div>

              <motion.h1
                className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Voice of the City
              </motion.h1>
              <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Participate in official city polls and help shape the future of your community.
                Earn points for every vote!
              </p>

              <button
                onClick={() => setIsDark(!isDark)}
                className="absolute right-4 top-0 p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-black/5 dark:border-white/10 hover:scale-105 transition"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
            </div>

            {/* Polls Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <PollFeed />
            </motion.div>

            {/* Context Info */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Real Impact</h3>
                <p className="text-sm text-gray-500">Poll results are sent directly to city officials.</p>
              </div>
              <div className="p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Earn Badges</h3>
                <p className="text-sm text-gray-500">Active voters unlock unique profile badges.</p>
              </div>
              <div className="p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Transparent</h3>
                <p className="text-sm text-gray-500">Live results shown immediately after voting.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CommunityVotingPage;
