import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Droplets, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, MapPin, Bell, TrendingUp, TrendingDown, Activity, BarChart3, PieChart } from 'lucide-react';
import { LineChart, Line, BarChart as ReBarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const UtilitiesDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedUtility, setSelectedUtility] = useState('both');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [viewMode, setViewMode] = useState('dashboard');
  const [liveUpdates, setLiveUpdates] = useState(true);

  /* Expanded Coverage: Major Indian States */
  const areas = [
    { id: 'dl', name: 'Delhi', zone: 'North' },
    { id: 'mh', name: 'Maharashtra', zone: 'West' },
    { id: 'ka', name: 'Karnataka', zone: 'South' },
    { id: 'tn', name: 'Tamil Nadu', zone: 'South' },
    { id: 'up', name: 'Uttar Pradesh', zone: 'North' },
    { id: 'wb', name: 'West Bengal', zone: 'East' },
    { id: 'gj', name: 'Gujarat', zone: 'West' },
    { id: 'rj', name: 'Rajasthan', zone: 'North' },
    { id: 'kl', name: 'Kerala', zone: 'South' },
    { id: 'tg', name: 'Telangana', zone: 'South' },
    { id: 'ap', name: 'Andhra Pradesh', zone: 'South' },
    { id: 'mp', name: 'Madhya Pradesh', zone: 'Central' }
  ];

  const currentStatus = {
    electricity: { status: 'active', uptime: '99.2%', lastOutage: '2 days ago', affectedAreas: 0, trend: +2.1 },
    water: { status: 'maintenance', uptime: '96.8%', lastOutage: '6 hours ago', affectedAreas: 2, trend: -0.5 }
  };

  const consumptionData = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        electricity: Math.random() * 100 + 200,
        water: Math.random() * 30 + 70,
      });
    }
    return data;
  }, [currentTime]);

  const outageAnalytics = useMemo(() => {
    return areas.map(area => ({
      area: area.name,
      electricityOutages: Math.floor(Math.random() * 5),
      waterOutages: Math.floor(Math.random() * 3),
      totalOutages: Math.floor(Math.random() * 8),
      uptime: 95 + Math.random() * 5
    }));
  }, [areas]);

  const outageReasons = [
    { reason: 'Equipment Failure', count: 12, percentage: 35 },
    { reason: 'Scheduled Maintenance', count: 8, percentage: 24 },
    { reason: 'Weather Related', count: 6, percentage: 18 },
    { reason: 'Grid Issues', count: 4, percentage: 12 },
    { reason: 'Human Error', count: 3, percentage: 9 },
    { reason: 'Other', count: 1, percentage: 2 }
  ];

  /* Simulate Live Outages - Toggle status randomly */
  const [liveOutages, setLiveOutages] = useState([
    {
      id: 1, type: 'electricity', area: 'Sector 1',
      startTime: new Date(2025, 7, 23, 2, 0), endTime: new Date(2025, 7, 23, 6, 0),
      reason: 'Routine maintenance of transformer', status: 'scheduled', priority: 'medium'
    },
    {
      id: 2, type: 'water', area: 'DLF Phase 2',
      startTime: new Date(2025, 7, 22, 23, 0), endTime: new Date(2025, 7, 23, 3, 0),
      reason: 'Pipeline repair work', status: 'ongoing', priority: 'high'
    },
    // Add dynamic "Live" outage
    {
      id: 3, type: 'electricity', area: 'Sector 4',
      startTime: new Date(), endTime: new Date(new Date().getTime() + 3600000),
      reason: 'Unexpected Grid Failure', status: 'active', priority: 'critical'
    }
  ]);

  useEffect(() => {
    // Randomly update status every few seconds to simulate live feed
    const interval = setInterval(() => {
      setLiveOutages(prev => prev.map(o => ({
        ...o,
        // Randomly toggle 'active' status for demo purposes
        status: Math.random() > 0.8 ? 'active' : o.status
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scheduledOutages = liveOutages; // Use state instead of static const

  /* Weather State for Live Impact */
  const [weather, setWeather] = useState(null);

  /* Lat/Lon Mapping for Indian States (simplified centers) */
  const areaCoords = {
    'dl': { lat: 28.7041, lon: 77.1025 }, // Delhi
    'mh': { lat: 19.7515, lon: 75.7139 }, // Maharashtra
    'ka': { lat: 15.3173, lon: 75.7139 }, // Karnataka
    'tn': { lat: 11.1271, lon: 78.6569 }, // Tamil Nadu
    'up': { lat: 26.8467, lon: 80.9462 }, // UP
    'wb': { lat: 22.9868, lon: 87.8550 }, // West Bengal
    'gj': { lat: 22.2587, lon: 71.1924 }, // Gujarat
    'rj': { lat: 27.0238, lon: 74.2179 }, // Rajasthan
    'kl': { lat: 10.8505, lon: 76.2711 }, // Kerala
    'tg': { lat: 18.1124, lon: 79.0193 }, // Telangana
    'ap': { lat: 15.9129, lon: 79.7400 }, // Andhra Pradesh
    'mp': { lat: 22.9734, lon: 78.6569 }  // Madhya Pradesh
  };

  useEffect(() => {
    // Fetch Live Weather for selected area
    const coords = areaCoords[selectedArea] || areaCoords['dl']; // Default to Delhi if 'all' or unknown
    const fetchWeather = async () => {
      // Mock Weather Data (Revert)
      setWeather({
        temperature: 32,
        windspeed: 12,
        weathercode: 3
      });
    };
    fetchWeather();
  }, [selectedArea]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    if (liveUpdates) {
      const dataTimer = setInterval(() => setCurrentTime(new Date()), 5000);
      return () => { clearInterval(timer); clearInterval(dataTimer); };
    }
    return () => clearInterval(timer);
  }, [liveUpdates]);

  const getStatusColor = (status) => ({
    active: 'text-emerald-700 bg-emerald-100',
    maintenance: 'text-yellow-700 bg-yellow-100',
    outage: 'text-red-700 bg-red-100'
  }[status] || 'text-gray-600 bg-gray-100');

  const getStatusIcon = (status) => ({
    active: <CheckCircle className="w-4 h-4" />,
    maintenance: <AlertTriangle className="w-4 h-4" />,
    outage: <XCircle className="w-4 h-4" />
  }[status] || <Clock className="w-4 h-4" />);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isOngoing = (outage) => currentTime >= outage.startTime && currentTime <= outage.endTime;

  const filteredOutages = scheduledOutages.filter(outage => {
    if (selectedUtility !== 'both' && outage.type !== selectedUtility) return false;
    if (selectedArea !== 'all' && !outage.area.toLowerCase().includes(selectedArea)) return false;
    return true;
  });

  const KPICard = ({ title, value, trend, icon, unit = '' }) => (
    <div className="bg-white/80 dark:bg-emerald-950/90 rounded-2xl p-7 border border-emerald-100/60 dark:border-emerald-800/40 shadow hover:shadow-xl transition">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 via-green-400 to-teal-400 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-emerald-800/80 dark:text-emerald-200 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
        {typeof value === 'number' ? value.toLocaleString() : value}{unit}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-green-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Header */}
      <header className="bg-white/90 dark:bg-emerald-950/95 shadow border-b border-emerald-100/50 dark:border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-7">
            <div className="flex items-center space-x-4">
              <span className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white rounded-lg shadow-md flex items-center justify-center text-xl font-extrabold">
                C
              </span>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent tracking-tight">Civix Utilities</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-700/80 dark:text-emerald-200/90">
              <Clock className="w-5 h-5" />
              <span>{formatTime(currentTime)} • {formatDate(currentTime)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Controls */}
        <section className="bg-white/90 dark:bg-emerald-950/95 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Dashboard View</h2>
              <div className="flex bg-emerald-100/60 dark:bg-emerald-900/40 rounded-lg p-1 shadow-inner">
                {['dashboard', 'analytics', 'insights'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-150 ${viewMode === mode
                      ? 'bg-white/90 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shadow'
                      : 'text-emerald-600 dark:text-emerald-200 hover:text-emerald-800 dark:hover:text-emerald-100'
                      }`}
                  >
                    {mode === 'dashboard' && <Activity className="w-4 h-4 inline mr-2" />}
                    {mode === 'analytics' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                    {mode === 'insights' && <PieChart className="w-4 h-4 inline mr-2" />}
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={liveUpdates} onChange={(e) => setLiveUpdates(e.target.checked)} className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">Live Updates</span>
              </label>
              <select value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)} className="px-3 py-2 border border-emerald-200 dark:border-emerald-900/40 rounded-md bg-white dark:bg-emerald-950 text-emerald-900 dark:text-white text-sm font-semibold shadow">
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Electricity Uptime" value={parseFloat(currentStatus.electricity.uptime)} trend={currentStatus.electricity.trend} icon={<Zap className="w-6 h-6 text-white" />} unit="%" />
          <KPICard title="Water Uptime" value={parseFloat(currentStatus.water.uptime)} trend={currentStatus.water.trend} icon={<Droplets className="w-6 h-6 text-white" />} unit="%" />
          <KPICard title="Active Outages" value={filteredOutages.filter(o => isOngoing(o)).length} trend={-15.2} icon={<AlertTriangle className="w-6 h-6 text-white" />} />

          {/* Live Weather Impact Card */}
          <div className="bg-white/80 dark:bg-emerald-950/90 rounded-2xl p-7 border border-emerald-100/60 dark:border-emerald-800/40 shadow hover:shadow-xl transition relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              {weather ? (weather.temperature > 35 ? <Zap className="w-24 h-24" /> : <Droplets className="w-24 h-24" />) : null}
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Live Weather
              </div>
            </div>
            <h3 className="text-sm font-medium text-emerald-800/80 dark:text-emerald-200 mb-1">Grid Weather Risk</h3>
            {weather ? (
              <div>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                  {weather.temperature}°C
                  <span className="text-sm font-normal text-gray-500">({selectedArea === 'all' ? 'DEL' : selectedArea.toUpperCase()})</span>
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {weather.windspeed > 15 ? 'High Wind Warning ⚠️' : (weather.temperature > 40 ? 'Heatwave Alert 🔥' : 'Normal Conditions ✅')}
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold text-gray-400 animate-pulse">Fetching...</p>
            )}
          </div>
        </section>

        {/* Charts */}
        {viewMode === 'dashboard' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-4">Live Consumption (24h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="time" stroke="#059669" />
                  <YAxis stroke="#059669" />
                  <Tooltip contentStyle={{ backgroundColor: '#f0fdfa', borderRadius: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="electricity" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} name="Electricity (kW)" />
                  <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} name="Water (L/min)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-4">Outage Frequency by Area</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ReBarChart data={outageAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="area" stroke="#059669" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#059669" />
                  <Tooltip contentStyle={{ backgroundColor: '#f0fdfa', borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="electricityOutages" fill="#10b981" name="Electricity" />
                  <Bar dataKey="waterOutages" fill="#3b82f6" name="Water" />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {viewMode === 'analytics' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-4">Outage Reasons Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie data={outageReasons} cx="50%" cy="50%" outerRadius={90} fill="#10b981" dataKey="percentage" label={({ reason, percentage }) => `${reason}: ${percentage}%`}>
                    {outageReasons.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#f0fdfa', borderRadius: 12 }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-4">Uptime Trends by Area</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={outageAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="area" stroke="#059669" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#059669" />
                  <Tooltip contentStyle={{ backgroundColor: '#f0fdfa', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="uptime" stroke="#10b981" fill="#10b981" fillOpacity={0.25} name="Uptime %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {viewMode === 'insights' && (
          <section className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
            <h3 className="text-xl font-extrabold bg-gradient-to-r from-emerald-700 to-green-500 bg-clip-text text-transparent mb-7 tracking-tight">Predictive Insights & Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              <div>
                <h4 className="text-lg font-bold text-blue-600 mb-4">Maintenance Recommendations</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">Maharashtra: <b>Schedule grid optimization for Monsoon season</b></div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800">Tamil Nadu: <b>Check coastal water supply pumps</b></div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-green-600 mb-4">Performance Forecast</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-green-800">National Average: <b>Expected uptime improvement of 1.2%</b></div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-purple-800">Delhi Peak: <b>Consumption expected to increase by 12%</b></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Status Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-7 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-100 rounded-lg"><Zap className="w-6 h-6 text-emerald-700" /></span>
                <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Electricity</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(currentStatus.electricity.status)}`}>
                {getStatusIcon(currentStatus.electricity.status)}
                <span className="capitalize">{currentStatus.electricity.status}</span>
              </div>
            </div>
            <dl className="mt-2">
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Uptime (30d)</dt><dd className="font-bold">{currentStatus.electricity.uptime}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Last Outage</dt><dd className="font-semibold">{currentStatus.electricity.lastOutage}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Affected Areas</dt><dd className="font-semibold">{currentStatus.electricity.affectedAreas}</dd></div>
            </dl>
          </div>
          <div className="bg-white/90 dark:bg-emerald-950/90 rounded-2xl p-7 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-100 rounded-lg"><Droplets className="w-6 h-6 text-emerald-700" /></span>
                <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Water Supply</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(currentStatus.water.status)}`}>
                {getStatusIcon(currentStatus.water.status)}
                <span className="capitalize">{currentStatus.water.status}</span>
              </div>
            </div>
            <dl className="mt-2">
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Uptime (30d)</dt><dd className="font-bold">{currentStatus.water.uptime}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Last Outage</dt><dd className="font-semibold">{currentStatus.water.lastOutage}</dd></div>
              <div className="flex justify-between py-1"><dt className="text-emerald-800/80 dark:text-emerald-200">Affected Areas</dt><dd className="font-bold text-orange-600">{currentStatus.water.affectedAreas}</dd></div>
            </dl>
          </div>
        </section>

        {/* Outage Filters */}
        <section className="bg-white/90 dark:bg-emerald-950/95 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-100 mb-4">Filter Outages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">Utility Type</label>
              <select value={selectedUtility} onChange={e => setSelectedUtility(e.target.value)} className="w-full p-3 border border-emerald-100/60 dark:border-emerald-800/30 rounded-lg bg-white dark:bg-emerald-950 text-emerald-900 dark:text-white font-semibold focus:ring-emerald-400">
                <option value="both">Both Utilities</option>
                <option value="electricity">Electricity Only</option>
                <option value="water">Water Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">Area</label>
              <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="w-full p-3 border border-emerald-100/60 dark:border-emerald-800/30 rounded-lg bg-white dark:bg-emerald-950 text-emerald-900 dark:text-white font-semibold focus:ring-emerald-400">
                <option value="all">All Areas</option>
                {areas.map(area => <option key={area.id} value={area.name.toLowerCase()}>{area.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Scheduled Outages */}
        <section className="bg-white/90 dark:bg-emerald-950/95 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/40 shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-100">Scheduled Outages</h3>
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-4">
            {filteredOutages.map((outage) => (
              <div key={outage.id} className={`border rounded-lg p-4 ${isOngoing(outage) ? 'border-orange-200 bg-orange-50' : 'border-emerald-100 dark:border-emerald-800/30'}`}>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg shadow">
                    {outage.type === 'electricity' ? <Zap className="w-5 h-5 text-emerald-600" /> : <Droplets className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-100 capitalize">{outage.type}</span>
                      {isOngoing(outage) && <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full animate-pulse">ONGOING</span>}
                    </div>
                    <div className="flex items-center gap-5 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{outage.area}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(outage.startTime)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatTime(outage.startTime)} - {formatTime(outage.endTime)}</span>
                    </div>
                    <p className="text-sm text-emerald-900 dark:text-emerald-200">{outage.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default UtilitiesDashboard;
