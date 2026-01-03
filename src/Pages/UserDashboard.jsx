
import React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useAuth, UserButton } from "@clerk/clerk-react";
import csrfManager from '../utils/csrfManager';
import {
  FileText,
  List,
  User,
  Headphones,
  BarChart3,
  BookOpen,
  Bell,
  X,
  MessageCircle,
  MapPin,
  Search,
  Calendar,
  Bus,
  ChartColumn,
  Vote,
  Building2,
  Car,
  Zap,
  HandCoins,
  ReceiptIndianRupee,
  TrainFront,
  School,
  Plane,
  Wind,
  Lock,
  PlusCircle
} from "lucide-react";

import TrendingFeed from "./TrendingFeed";
import Leaderboard from "../components/gamification/Leaderboard";
import PageTransition from "../components/PageTransition";

const UserDashboard = () => {

  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dashboardItems = [
    { title: "Report Issue", description: "Report civic problems instantly.", icon: FileText, onClick: () => navigate("/report-issue"), gradient: "from-orange-400 to-pink-500", shadowColor: "shadow-orange-500/20" },
    { title: "My Activity", description: "Track your reports.", icon: List, onClick: () => navigate("/my-complaints"), gradient: "from-blue-400 to-indigo-500", shadowColor: "shadow-blue-500/20" },
    { title: "Community Voice", description: "Vote on city matters.", icon: Vote, onClick: () => navigate("/community-voting"), gradient: "from-emerald-400 to-cyan-500", shadowColor: "shadow-emerald-500/20" },
    { title: "Nearby Services", description: "Find local utilities.", icon: MapPin, onClick: () => navigate("/nearby-services"), gradient: "from-purple-400 to-fuchsia-500", shadowColor: "shadow-purple-500/20" },

    // Emergency & Safety
    { title: "SOS Emergency", description: "Quick access to help.", icon: Zap, onClick: () => navigate("/sos"), gradient: "from-red-500 to-rose-600", shadowColor: "shadow-red-500/20" },
    { title: "SDRF / Rescue", description: "Disaster relief info.", icon: Headphones, onClick: () => navigate("/sdrf"), gradient: "from-orange-500 to-amber-500", shadowColor: "shadow-orange-500/20" },
    { title: "Lost & Found", description: "Report lost items.", icon: Search, onClick: () => navigate("/lost-found"), gradient: "from-sky-400 to-blue-500", shadowColor: "shadow-sky-500/20" },
    { title: "Safe Word", description: "Personal safety tool.", icon: Lock, onClick: () => navigate("/safe-word"), gradient: "from-slate-700 to-slate-900", shadowColor: "shadow-gray-500/20" },

    // Transport & Travel
    { title: "Transport", description: "Bus & Metro timings.", icon: Bus, onClick: () => navigate("/transport"), gradient: "from-indigo-400 to-violet-500", shadowColor: "shadow-indigo-500/20" },
    { title: "Train Info", description: "Live train status.", icon: TrainFront, onClick: () => navigate("/train"), gradient: "from-blue-600 to-blue-800", shadowColor: "shadow-blue-500/20" },
    { title: "Traffic / Vehicle", description: "Challans & RC info.", icon: Car, onClick: () => navigate("/vehical"), gradient: "from-zinc-500 to-zinc-700", shadowColor: "shadow-zinc-500/20" },

    // Utilities & Info
    { title: "Electricity", description: "Bill & outrage info.", icon: Zap, onClick: () => navigate("/electricity"), gradient: "from-yellow-400 to-amber-500", shadowColor: "shadow-yellow-500/20" },
    { title: "Air Quality (AirSeva)", description: "Check pollution levels.", icon: Wind, onClick: () => navigate("/airseva"), gradient: "from-teal-400 to-green-500", shadowColor: "shadow-teal-500/20" },
    { title: "Schools", description: "Admission & info.", icon: School, onClick: () => navigate("/school"), gradient: "from-pink-400 to-rose-500", shadowColor: "shadow-pink-500/20" },
    { title: "Medical Info", description: "Hospitals & Pharmacy.", icon: PlusCircle, onClick: () => navigate("/medical-info"), gradient: "from-red-400 to-red-500", shadowColor: "shadow-red-500/20" },

    // Civic & Governance
    { title: "Elections", description: "Voter info & dates.", icon: Vote, onClick: () => navigate("/elections-info"), gradient: "from-slate-600 to-slate-800", shadowColor: "shadow-slate-500/20" },
    { title: "Govt Schemes", description: "Benefits for you.", icon: BookOpen, onClick: () => navigate("/govt-schemes"), gradient: "from-green-500 to-emerald-600", shadowColor: "shadow-green-500/20" },
    { title: "Civic Stats", description: "City performance.", icon: ChartColumn, onClick: () => navigate("/civic-stats"), gradient: "from-cyan-500 to-blue-600", shadowColor: "shadow-cyan-500/20" },
    { title: "City Budget", description: "Financial reports.", icon: ReceiptIndianRupee, onClick: () => navigate("/budget"), gradient: "from-lime-500 to-green-600", shadowColor: "shadow-lime-500/20" },
    { title: "Tax Impact", description: "Know your tax usage.", icon: HandCoins, onClick: () => navigate("/tax-impact"), gradient: "from-emerald-500 to-teal-600", shadowColor: "shadow-emerald-500/20" },
    { title: "Find Rep", description: "Your local MLA/MP.", icon: User, onClick: () => navigate("/repersentative-finder"), gradient: "from-violet-500 to-purple-600", shadowColor: "shadow-violet-500/20" },
    { title: "Holidays", description: "Local calendar.", icon: Calendar, onClick: () => navigate("/community-holidays"), gradient: "from-rose-400 to-red-500", shadowColor: "shadow-rose-500/20" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header Section */}


        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                Welcome back, {user?.firstName || "Citizen"}! 👋
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Ready to make a difference today?
              </p>
            </div>
          </div>

          {/* Dashboard Grid - Modern Bento/Grid Style */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {dashboardItems
                  .filter(item =>
                    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((item, index) => (
                    <DashboardCard key={index} {...item} />
                  ))}
              </div>
            </div>

            {/* Right Sidebar - Compact */}
            <div className="lg:w-80 shrink-0 space-y-6">
              {/* Leaderboard Section */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
                <Leaderboard />
              </div>

              {/* Trending Feed */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 h-[600px] overflow-hidden">
                <TrendingFeed />
              </div>
            </div>
          </div>
        </main >
      </div >

    </PageTransition >
  );
};


const DashboardCard = ({ title, description, onClick, icon: Icon, gradient, shadowColor }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl ${shadowColor} cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full flex flex-col justify-between`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      {/* Top Part */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Arrow Icon could go here */}
        </div>
      </div>

      {/* Text Part */}
      <div className="relative z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-700 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};


export default UserDashboard;