import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { Search, MapPin, Navigation, Bus, Clock, Wifi } from "lucide-react";

export default function PublicTransportInfo() {
  const [selectedState, setSelectedState] = useState("Delhi");
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState("");
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [markers, setMarkers] = useState([]);

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  // 1. Initialize Map
  useEffect(() => {
    if (!mapInstance && window.google) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 28.6139, lng: 77.2090 }, // Delhi
        zoom: 12,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
        disableDefaultUI: false,
      });
      setMapInstance(map);
    }
  }, [mapInstance]);

  // 2. Generate/Update simulated buses
  useEffect(() => {
    // Initial Generation
    const newBuses = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      route: `${Math.floor(Math.random() * 900) + 100}`,
      dest: ["Central Terminal", "Anand Vihar", "Nehru Place", "Dwarka Sec-21"][Math.floor(Math.random() * 4)],
      lat: 28.6139 + (Math.random() - 0.5) * 0.1,
      lng: 77.2090 + (Math.random() - 0.5) * 0.1,
      occupancy: Math.floor(Math.random() * 100),
      eta: Math.floor(Math.random() * 20) + 1
    }));
    setBuses(newBuses);

    // Live Movement Simulation
    const interval = setInterval(() => {
      setBuses(prev => prev.map(bus => ({
        ...bus,
        lat: bus.lat + (Math.random() - 0.5) * 0.001,
        lng: bus.lng + (Math.random() - 0.5) * 0.001,
        eta: Math.max(0, bus.eta - (Math.random() > 0.8 ? 1 : 0))
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedState]);

  // 3. Sync Markers with Buses
  useEffect(() => {
    if (mapInstance) {
      // Clear old
      markers.forEach(m => m.setMap(null));

      const newMarkers = buses.map(bus => {
        const marker = new window.google.maps.Marker({
          position: { lat: bus.lat, lng: bus.lng },
          map: mapInstance,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: bus.occupancy > 80 ? "#EF4444" : "#10B981",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "white",
            rotation: Math.random() * 360 // Random heading for simulation
          },
          title: `Bus ${bus.route}`
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
              <div style="padding:5px">
                <strong>Bus ${bus.route}</strong><br/>
                To: ${bus.dest}<br/>
                Occupancy: ${bus.occupancy}%
              </div>
            `
        });

        marker.addListener("click", () => infoWindow.open(mapInstance, marker));

        return marker;
      });
      setMarkers(newMarkers);
    }
  }, [buses, mapInstance]); // Dependency array optimized to prevent infinite loop

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Live Transport Grid</h1>
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Real-time Tracking Active
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Find Route..."
              className="pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Map View */}
        <div className="flex-1 relative bg-gray-200">
          {!window.google && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Loading Maps API...</p>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          {/* Legend Overlay */}
          <div className="absolute bottom-6 left-6 bg-white/90 p-4 rounded-xl shadow-lg border border-gray-100 backdrop-blur-sm">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Occupancy Status</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Low Traffic</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>High Traffic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">Nearby Buses ({buses.length})</h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {buses.map(bus => (
              <div key={bus.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
                    {bus.route}
                  </span>
                  <span className={`px-2 py-0.5 rounded textxs font-bold ${bus.occupancy > 80 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {bus.occupancy}% Full
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">To {bus.dest}</p>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1 text-green-600">
                    <Wifi className="w-3 h-3" /> Live
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {bus.eta} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}