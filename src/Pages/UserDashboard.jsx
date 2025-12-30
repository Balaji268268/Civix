import React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
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
  Plane
} from "lucide-react";

import TrendingFeed from "./TrendingFeed";
import Leaderboard from "../components/gamification/Leaderboard";
import PageTransition from "../components/PageTransition";

// ... existing code ...

<div className="flex flex-col lg:flex-row gap-8">
  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {dashboardItems
      .filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((item, index) => (
        <DashboardCard key={index} {...item} />
      ))}
  </div>

  {/* Right Sidebar */}
  <div className="lg:w-96 shrink-0 space-y-8">
    {/* Leaderboard Section */}
    <div className="h-[500px]">
      <Leaderboard />
    </div>

    {/* Trending Feed */}
    <div className="h-full">
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
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className={`group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-gray-700 shadow-lg ${shadowColor} hover:shadow-2xl hover:shadow-green-500/30 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:scale-105 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />

      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500" />



      <div className="relative z-10">

        <div className={`w-20 h-20 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
          <Icon className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors duration-300">
          {title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
          {description}
        </p>

      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-3xl`} />


      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
    </div>
  );
};


export default UserDashboard;