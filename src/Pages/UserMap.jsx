import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Globe, MapPin, ArrowLeft, Filter, Layers, Sparkles } from "lucide-react";
import csrfManager from "../utils/csrfManager";
import { useAuth, useUser } from "@clerk/clerk-react";

// Custom marker icon (green pin)
const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149060.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// Fly to selected location
function FlyToLocation({ position }) {
  const map = useMap();
  if (position) map.flyTo(position, 14, { duration: 1.5 });
  return null;
}

export default function UserMap() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [mapView, setMapView] = useState("street");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleBackClick = () => {
    // In a real app, this would be: navigate("/user/dashboard");
    window.location.href = "/user/dashboard";
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      // Fetch all issues (using admin endpoint for global map is simplest, or specifically a public map endpoint)
      // Assuming /api/issues returns all public issues or issues permissible to view
      const data = await csrfManager.secureFetch('/api/issues');
      // Filter valid locations and format for map
      // RULE: Show issue ONLY if it is 'Resolved' OR if it belongs to the current user
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      const mapped = data.filter(issue => {
        const isResolved = issue.status === 'Resolved';
        const isMine = userEmail && issue.email && (issue.email.toLowerCase() === userEmail.toLowerCase());
        return isResolved || isMine;
      }).map(issue => {
        // Try parse coordinates from location string "lat, lng" OR explicit coords field
        let lat = null, lng = null;

        if (issue.coordinates?.lat && issue.coordinates?.lng) {
          lat = issue.coordinates.lat;
          lng = issue.coordinates.lng;
        } else if (issue.location && issue.location.includes(',')) {
          const parts = issue.location.split(',').map(p => parseFloat(p.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0];
            lng = parts[1];
          }
        }

        // Fallback for demo: Randomize near city center if no coords? No, user wants real data.
        // Only return if we have coords
        if (lat && lng) {
          return { ...issue, lat, lng, date: new Date(issue.createdAt).toLocaleDateString() };
        }
        return null;
      }).filter(Boolean);

      setIssues(mapped);
    } catch (error) {
      console.error("Failed to fetch map data", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(
    (issue) =>
      (statusFilter === "All" || issue.status === statusFilter) &&
      (categoryFilter === "All" || issue.category === categoryFilter)
  );

  // Default Center (could be user loction if available)
  const defaultCenter = [20.5937, 78.9629]; // India Center

  const statusClasses = {
    Pending: "text-amber-800 border-amber-300 bg-amber-50 dark:text-amber-200 dark:bg-amber-900/30 dark:border-amber-700",
    "In Progress": "text-blue-800 border-blue-300 bg-blue-50 dark:text-blue-200 dark:bg-blue-900/30 dark:border-blue-700",
    Resolved: "text-green-800 border-green-300 bg-green-50 dark:text-green-200 dark:bg-green-900/30 dark:border-green-700",
    "Under Review": "text-purple-800 border-purple-300 bg-purple-50 dark:text-purple-200 dark:bg-purple-900/30 dark:border-purple-700",
  };

  const categoryClasses = {
    Roads: "text-orange-800 border-orange-300 bg-orange-50 dark:text-orange-200 dark:bg-orange-900/30 dark:border-orange-700",
    Waste: "text-red-800 border-red-300 bg-red-50 dark:text-red-200 dark:bg-red-900/30 dark:border-red-700",
    Lighting: "text-indigo-800 border-indigo-300 bg-indigo-50 dark:text-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700",
    Water: "text-teal-800 border-teal-300 bg-teal-50 dark:text-teal-200 dark:bg-teal-900/30 dark:border-teal-700",
    Safety: "text-rose-800 border-rose-300 bg-rose-50 dark:text-rose-200 dark:bg-rose-900/30 dark:border-rose-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/20 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-green-950/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="relative">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="absolute left-0 top-0 group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg shadow-green-500/5 hover:shadow-xl hover:shadow-green-500/10 border border-green-200/50 dark:border-green-700/50 text-green-700 dark:text-green-300 font-medium transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </button>

          {/* Title Section */}
          <div className="text-center space-y-4 pt-16 sm:pt-0">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/60 to-emerald-500/60 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full shadow-lg shadow-green-500/20">
                <MapPin className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-green-800 bg-clip-text text-transparent">
              Civic Issues Map
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Real-time visualization of civic issues. Explore reported problems and their resolution status.
            </p>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Filters */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-xl shadow-green-500/5 border border-green-100/50 dark:border-slate-700/50"></div>
            <div className="relative flex items-center gap-4 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Filter size={20} />
                <span className="font-semibold">Filters</span>
              </div>

              <select
                className="bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm border-2 border-green-200/50 dark:border-slate-600/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all duration-300 cursor-pointer hover:bg-white dark:hover:bg-slate-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">🟡 Pending</option>
                <option value="In Progress">🔵 In Progress</option>
                <option value="Resolved">🟢 Resolved</option>
                <option value="Under Review">🟣 Under Review</option>
              </select>

              <select
                className="bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm border-2 border-green-200/50 dark:border-slate-600/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all duration-300 cursor-pointer hover:bg-white dark:hover:bg-slate-700"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Roads">🛣️ Roads</option>
                <option value="Waste">🗑️ Waste</option>
                <option value="Lighting">💡 Lighting</option>
                <option value="Water">💧 Water</option>
                <option value="Safety">⚠️ Safety</option>
              </select>
            </div>
          </div>

          {/* Map View Toggle */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-xl shadow-green-500/5 border border-green-100/50 dark:border-slate-700/50"></div>
            <div className="relative flex items-center gap-2 p-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 px-2">
                <Layers size={18} />
                <span className="font-medium text-sm">View</span>
              </div>

              <button
                onClick={() => setMapView("street")}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${mapView === "street"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20"
                  : "bg-white/60 dark:bg-slate-700/60 text-green-600 dark:text-green-400 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-green-200/50 dark:border-green-700/50"
                  }`}
              >
                <MapPin size={16} className={mapView === "street" ? "animate-pulse" : ""} />
                Street
              </button>

              <button
                onClick={() => setMapView("satellite")}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${mapView === "satellite"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20"
                  : "bg-white/60 dark:bg-slate-700/60 text-green-600 dark:text-green-400 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-green-200/50 dark:border-green-700/50"
                  }`}
              >
                <Globe size={16} className={mapView === "satellite" ? "animate-pulse" : ""} />
                Satellite
              </button>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-2xl shadow-green-500/10 border border-green-200/30 dark:border-green-700/30 p-2 overflow-hidden">
            <div className="w-full h-[600px] rounded-2xl overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              )}

              <MapContainer center={defaultCenter} zoom={5} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url={
                    mapView === "satellite"
                      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                  attribution={
                    mapView === "satellite"
                      ? '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                      : '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  }
                />

                {filteredIssues.map((issue, idx) => (
                  <Marker
                    key={idx}
                    position={[issue.lat, issue.lng]}
                    icon={customIcon}
                    eventHandlers={{ click: () => setSelectedIssue(issue) }}
                  >
                    <Popup className="custom-popup">
                      <div className="w-80 p-0 m-0">
                        {/* Popup Header */}
                        <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-t-2xl">
                          <div className="absolute inset-0 bg-white/10 rounded-t-2xl"></div>
                          <div className="relative flex items-start gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg leading-tight">{issue.title}</h3>
                              <p className="text-green-100 text-sm mt-1">Reported on {issue.date}</p>
                            </div>
                          </div>
                        </div>

                        {/* Popup Content */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-b-2xl">
                          <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{issue.description}</p>

                          {/* Status and Category Badges */}
                          <div className="flex gap-2 flex-wrap">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 ${statusClasses[issue.status] || 'border-gray-200'}`}>
                              <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                              {issue.status}
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 ${categoryClasses[issue.category] || 'border-gray-200'}`}>
                              <Sparkles size={12} />
                              {issue.category}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {selectedIssue && <FlyToLocation position={[selectedIssue.lat, selectedIssue.lng]} />}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-green-200/30 dark:border-green-700/30 text-sm text-slate-600 dark:text-slate-400">
            <MapPin size={16} className="text-green-500" />
            Showing {filteredIssues.length} issues (Real-time)
          </div>
        </div>
      </div>
    </div>
  );
}