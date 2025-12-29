import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, TrendingUp, FileText, IndianRupee, Search,
  BarChart3, PieChart, Activity, Download, BarChart,
  Target, Award
} from 'lucide-react';
import {
  LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart as RechartsAreaChart,
  Area, ComposedChart, ScatterChart as RechartsScatterChart, Scatter
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function GovernmentSchemesDashboard() {
  const [schemes, setSchemes] = useState([]);
  const [planExpenditure, setPlanExpenditure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [amountRange, setAmountRange] = useState({ min: 0, max: 200000 }); // Increased max range for 2025 budgets

  // Simulated Data Generators for 2025
  const generateSchemesData = () => {
    const categories = [
      'Scheduled Castes', 'Other Backward Classes', 'Senior Citizens',
      'Healthcare', 'Education', 'Agriculture', 'Infrastructure', 'Women & Child Dev'
    ];

    const majorSchemes = [
      { name: "Pradhan Mantri Awas Yojana (PMAY)", cat: "Infrastructure", base: 28000 },
      { name: "Jal Jeevan Mission", cat: "Infrastructure", base: 45000 },
      { name: "MGNREGA", cat: "General Welfare", base: 73000 },
      { name: "PM Kisan Samman Nidhi", cat: "Agriculture", base: 65000 },
      { name: "Ayushman Bharat PM-JAY", cat: "Healthcare", base: 7200 },
      { name: "Samagra Shiksha Abhiyan", cat: "Education", base: 37000 },
      { name: "National Health Mission", cat: "Healthcare", base: 35000 },
      { name: "Swachh Bharat Mission 2.0", cat: "Sanitation", base: 12000 },
      { name: "PM Poshan Shakti Nirman", cat: "Women & Child Dev", base: 11000 },
      { name: "Digital India Mission", cat: "Infrastructure", base: 8000 },
      { name: "FAME India Analysis", cat: "Infrastructure", base: 5000 },
      { name: "Ujjwala Yojana", cat: "General Welfare", base: 9000 },
      { name: "Skill India Mission", cat: "Education", base: 6000 }
    ];

    return majorSchemes.map(scheme => {
      // Simulate growth over years
      const y21 = scheme.base * (0.8 + Math.random() * 0.2); // 2021-22
      const y22 = y21 * (1.05 + Math.random() * 0.1);        // 2022-23
      const y23 = y22 * (1.05 + Math.random() * 0.1);        // 2023-24
      const y24 = y23 * (1.08 + Math.random() * 0.15);       // 2024-25 (Current)
      const y25 = y24 * (1.1 + Math.random() * 0.1);         // 2025-26 (Projected)

      return {
        'Programme/Schemes': scheme.name,
        'Category': scheme.cat, // Pre-defined for better mapping
        'Funds Allocated - 2021-22': y21.toFixed(2),
        'Funds Allocated - 2022-23': y22.toFixed(2),
        'Funds Allocated - 2023-24': y23.toFixed(2),
        'Funds Allocated - 2024-25': y24.toFixed(2),
        'Funds Allocated - 2025-26': y25.toFixed(2),
      };
    });
  };

  const generateExpenditureData = () => {
    const sectors = [
      "Agriculture and Allied Activities", "Rural Development", "Energy",
      "Social Services", "Transport", "Communication", "Science Benefit",
      "General Economic Services"
    ];

    return sectors.map(sector => ({
      Details: sector,
      '2021-22': (Math.random() * 50000 + 10000).toFixed(2),
      '2022-23': (Math.random() * 60000 + 12000).toFixed(2),
      '2023-24': (Math.random() * 70000 + 15000).toFixed(2),
      '2024-25 (R. E.)': (Math.random() * 80000 + 20000).toFixed(2),
      '2025-26 (B. E.)': (Math.random() * 90000 + 25000).toFixed(2)
    }));
  };

  useEffect(() => {
    // Simulate loading delay
    setTimeout(() => {
      setSchemes(generateSchemesData());
      setPlanExpenditure(generateExpenditureData());
      setLoading(false);
    }, 800);
  }, []);

  // Utility functions
  const getSchemeCategory = (schemeName, dataCategory) => {
    if (dataCategory) return dataCategory; // Use generated category if available
    const name = schemeName.toLowerCase();
    if (name.includes('sc') || name.includes('scheduled caste')) return 'Scheduled Castes';
    if (name.includes('obc') || name.includes('backward')) return 'Other Backward Classes';
    if (name.includes('senior') || name.includes('elderly')) return 'Senior Citizens';
    if (name.includes('education') || name.includes('scholarship')) return 'Education';
    if (name.includes('health') || name.includes('medical')) return 'Healthcare';
    if (name.includes('agr') || name.includes('kisan')) return 'Agriculture';
    return 'General Welfare';
  };

  const formatAmount = (amount) => {
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`; // Representing Crores usually
    return `₹${amount.toFixed(0)}`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Scheduled Castes': '#10b981',
      'Other Backward Classes': '#3b82f6',
      'Senior Citizens': '#f59e0b',
      'Healthcare': '#06b6d4',
      'Education': '#8b5cf6',
      'Agriculture': '#84cc16',
      'Infrastructure': '#6366f1',
      'Women & Child Dev': '#ec4899',
      'Sanitation': '#14b8a6',
      'General Welfare': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  // Data processing
  const processedSchemes = useMemo(() => {
    if (!schemes.length) return [];

    return schemes.map(scheme => {
      const cat = scheme['Category'] || getSchemeCategory(scheme['Programme/Schemes']);
      const v21 = parseFloat(scheme['Funds Allocated - 2021-22']) || 0;
      const v22 = parseFloat(scheme['Funds Allocated - 2022-23']) || 0;
      const v23 = parseFloat(scheme['Funds Allocated - 2023-24']) || 0;
      const v24 = parseFloat(scheme['Funds Allocated - 2024-25']) || 0;
      const v25 = parseFloat(scheme['Funds Allocated - 2025-26']) || 0;

      return {
        name: scheme['Programme/Schemes'],
        category: cat,
        '2021-22': v21,
        '2022-23': v22,
        '2023-24': v23,
        '2024-25': v24,
        '2025-26': v25,
        total: v21 + v22 + v23 + v24 + v25
      };
    });
  }, [schemes]);

  const processedExpenditure = useMemo(() => {
    if (!planExpenditure.length) return [];

    return planExpenditure.map(sector => ({
      sector: sector.Details,
      '2021-22': parseFloat(sector['2021-22']) || 0,
      '2022-23': parseFloat(sector['2022-23']) || 0,
      '2023-24': parseFloat(sector['2023-24']) || 0,
      '2024-25': parseFloat(sector['2024-25 (R. E.)']) || 0,
      '2025-26': parseFloat(sector['2025-26 (B. E.)']) || 0,
      total: (parseFloat(sector['2021-22']) || 0) +
        (parseFloat(sector['2022-23']) || 0) +
        (parseFloat(sector['2023-24']) || 0) +
        (parseFloat(sector['2024-25 (R. E.)']) || 0) +
        (parseFloat(sector['2025-26 (B. E.)']) || 0)
    }));
  }, [planExpenditure]);

  // Filtered data based on user selections
  const filteredSchemes = useMemo(() => {
    let filtered = processedSchemes;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(scheme => scheme.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(scheme =>
        scheme.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (amountRange.min > 0 || amountRange.max < 200000) {
      filtered = filtered.filter(scheme =>
        scheme.total >= amountRange.min && scheme.total <= amountRange.max
      );
    }

    return filtered;
  }, [processedSchemes, selectedCategory, searchQuery, amountRange]);

  // KPI calculations
  const kpiMetrics = useMemo(() => {
    if (!processedSchemes.length || !processedExpenditure.length) {
      return { totalSchemes: 0, totalFunds: 0, avgGrowth: 0, topSector: '', efficiency: 0 };
    }

    const totalSchemes = processedSchemes.length;
    const totalFunds = processedSchemes.reduce((sum, scheme) => sum + scheme.total, 0);

    // Calculate year-over-year growth (Approximate last year)
    const currentYearTotal = processedSchemes.reduce((sum, s) => sum + s['2024-25'], 0);
    const prevYearTotal = processedSchemes.reduce((sum, s) => sum + s['2023-24'], 0);
    const avgGrowth = prevYearTotal > 0 ? ((currentYearTotal - prevYearTotal) / prevYearTotal) * 100 : 0;

    // Top performing sector
    const topSector = processedExpenditure.length > 0 ? processedExpenditure.reduce((top, current) =>
      current.total > top.total ? current : top
    ).sector : "General";

    // Budget utilization efficiency
    const efficiency = Math.min(99.8, 85 + Math.random() * 10); // Simulated high efficiency

    return { totalSchemes, totalFunds, avgGrowth, topSector, efficiency };
  }, [processedSchemes, processedExpenditure]);

  // Chart data preparation
  const fundTrendsData = useMemo(() => {
    if (!filteredSchemes.length) return [];

    const years = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];
    return years.map(year => ({
      year,
      total: filteredSchemes.reduce((sum, scheme) => sum + scheme[year], 0),
      count: filteredSchemes.filter(scheme => scheme[year] > 0).length
    }));
  }, [filteredSchemes]);

  const sectorComparisonData = useMemo(() => {
    if (!processedExpenditure.length) return [];

    return processedExpenditure
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(sector => ({
        sector: sector.sector.length > 20 ? sector.sector.substring(0, 20) + '...' : sector.sector,
        total: sector.total,
        '2021-22': sector['2021-22'],
        '2022-23': sector['2022-23'],
        '2023-24': sector['2023-24'],
        '2024-25': sector['2024-25'],
        '2025-26': sector['2025-26']
      }));
  }, [processedExpenditure]);

  const budgetDistributionData = useMemo(() => {
    if (!filteredSchemes.length) return [];

    const categories = {};
    filteredSchemes.forEach(scheme => {
      const category = scheme.category;
      categories[category] = (categories[category] || 0) + scheme.total;
    });

    return Object.entries(categories).map(([category, total]) => ({
      category,
      total,
      percentage: (total / kpiMetrics.totalFunds) * 100
    }));
  }, [filteredSchemes, kpiMetrics.totalFunds]);

  // Enhanced KPI Card Component
  const KPICard = ({ title, value, trend, icon, color = 'green', subtitle, unit = '' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r from-${color}-400 to-${color}-600 rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}{unit}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-600 dark:text-green-400 text-lg">Loading 2025 Government Schemes Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-green-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center space-x-3">
            <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Government Schemes Dashboard (2025)
            </h1>
          </div>
          <p className="text-center text-green-600/70 dark:text-green-400/70 mt-2 font-medium">
            Pan-India Budget Analytics & Projections
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* View Mode Selector */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard View</h2>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { key: 'dashboard', label: 'Dashboard', icon: Activity },
                  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { key: 'insights', label: 'Insights', icon: PieChart },
                  { key: 'comparison', label: 'Comparison', icon: BarChart }
                ].map((mode) => {
                  const IconComponent = mode.icon;
                  return (
                    <button
                      key={mode.key}
                      onClick={() => setViewMode(mode.key)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === mode.key
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      <IconComponent className="w-4 h-4 inline mr-2" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <KPICard
            title="Total Schemes"
            value={kpiMetrics.totalSchemes}
            icon={<FileText className="w-6 h-6 text-white" />}
            color="green"
            subtitle="Active Pan-India schemes"
          />
          <KPICard
            title="Total Allocation"
            value={formatAmount(kpiMetrics.totalFunds)}
            trend={kpiMetrics.avgGrowth}
            icon={<IndianRupee className="w-6 h-6 text-white" />}
            color="emerald"
            subtitle="Est. Funds (2021-26)"
          />
          <KPICard
            title="Avg Growth"
            value={kpiMetrics.avgGrowth.toFixed(1)}
            unit="%"
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            color="blue"
            subtitle="Year-over-year growth"
          />
          <KPICard
            title="Top Sector"
            value={kpiMetrics.topSector.substring(0, 15) + '...'}
            icon={<Award className="w-6 h-6 text-white" />}
            color="purple"
            subtitle="Highest allocation sector"
          />
          <KPICard
            title="Efficiency"
            value={kpiMetrics.efficiency.toFixed(1)}
            unit="%"
            icon={<Target className="w-6 h-6 text-white" />}
            color="orange"
            subtitle="Budget utilization rate"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2">Search Schemes</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schemes (e.g., PMAY)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-2">Scheme Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Women & Child Dev">Women & Child Dev</option>
                <option value="General Welfare">General Welfare</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conditional Chart Rendering Based on View Mode */}
        <AnimatePresence mode="wait">
          {viewMode === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Fund Allocation Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fund Allocation Trends (2021-2026)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={fundTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="year" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`₹${value.toFixed(2)} Cr`, 'Amount']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        name="Total Allocation (₹Cr)"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Sector Performance Comparison */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Expected Expenditure by Sector (2025)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={sectorComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="sector" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`₹${value.toFixed(2)} Cr`, 'Amount']}
                      />
                      <Legend />
                      <Bar dataKey="total" fill="#10b981" name="5-Year Total Exp." />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* Additional Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Budget Distribution by Category */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2025 Budget Distribution by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={budgetDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${percentage > 5 ? `${category}: ${percentage.toFixed(0)}%` : ''}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {budgetDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`₹${value.toFixed(2)} Cr`, 'Amount']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Cumulative Fund Allocation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cumulative Fund Projection</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsAreaChart data={fundTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="year" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`₹${value.toFixed(2)} Cr`, 'Amount']}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        name="Cumulative Funds (₹Cr)"
                      />
                    </RechartsAreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </motion.div>
          )}
          {viewMode === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Advanced Analytics Dashboard</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Scatter Plot: Fund Allocation vs Scheme Count */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Fund Allocation vs Scheme Count</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsScatterChart data={fundTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="total" stroke="#6b7280" />
                        <YAxis dataKey="count" stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Scatter dataKey="count" fill="#10b981" />
                      </RechartsScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Composed Chart: Multiple Metrics */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Sector Performance Overview</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={sectorComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="sector" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="total" fill="#3b82f6" name="Total Expenditure" />
                        <Line type="monotone" dataKey="2025-26" stroke="#10b981" strokeWidth={3} name="Projected 2026" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Data Insights & Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">Key Findings</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Top Sector:</strong> {kpiMetrics.topSector} leads with highest expenditure
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>Growth Trend:</strong> Average {kpiMetrics.avgGrowth.toFixed(1)}% year-over-year growth
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>Efficiency:</strong> {kpiMetrics.efficiency.toFixed(1)}% budget utilization rate
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">Recommendations</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>Focus Areas:</strong> Prioritize schemes with highest impact-to-cost ratios
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Monitoring:</strong> Track underperforming schemes for optimization
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Transparency:</strong> Enhance public reporting for better accountability
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Year-over-Year Comparison</h3>
                <div className="grid grid-cols-1 gap-6">
                  {/* Multi-Year Comparison Chart */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Scheme Performance Comparison (2021-2026)</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={fundTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="year" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`₹${value.toFixed(2)} Cr`, 'Amount']}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="#3b82f6" name="Total Funds (₹Crores)" />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} name="Active Schemes Count" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Data Tables */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-xl rounded-3xl border border-green-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">2025 Pan-India Schemes Data</h2>
              </div>
              <div className="text-white text-sm">
                Showing {filteredSchemes.length} schemes
              </div>
            </div>
          </div>
          <div className="p-6">
            {filteredSchemes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-green-100 dark:border-gray-600">
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">Scheme Name</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">Category</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">2021-22</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">2022-23</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">2023-24</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">2024-25</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">2025-26</th>
                      <th className="text-left py-4 px-4 font-semibold text-green-800 dark:text-green-300">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchemes.map((scheme, i) => (
                      <tr
                        key={i}
                        className="border-b border-green-50 dark:border-gray-700 hover:bg-green-50/50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                      >
                        <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{scheme.name}</td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold">
                            {scheme.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{formatAmount(scheme['2021-22'])}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{formatAmount(scheme['2022-23'])}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{formatAmount(scheme['2023-24'])}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{formatAmount(scheme['2024-25'])}</td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-300 font-bold">{formatAmount(scheme['2025-26'])}</td>
                        <td className="py-4 px-4 font-bold text-green-600 dark:text-green-400">{formatAmount(scheme.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Schemes Found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}