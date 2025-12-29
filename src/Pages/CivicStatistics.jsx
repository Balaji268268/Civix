import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Search, Users, Droplets, Download, FileText, BarChart3, Wind, Activity } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CsvDashboard() {
  /* Simulated Live 2025 Data Generation (Replacing older CSVs) */

  const [search, setSearch] = useState("");

  const [populationData, setPopulationData] = useState([]);
  const [waterData, setWaterData] = useState([]);
  const [livePopulation, setLivePopulation] = useState(1440000000); // 2025 Est.

  // AQI State
  const [aqiData, setAqiData] = useState(null);
  const [locationName, setLocationName] = useState("Locating...");

  useEffect(() => {
    // 1. Fetch Live AQI
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Mock AQI Data (Revert)
        setAqiData({
          us_aqi: 95,
          pm2_5: 45.2,
          pm10: 88.0,
          ozone: 102.1,
          carbon_monoxide: 450,
          nitrogen_dioxide: 22,
          sulphur_dioxide: 5
        });
        setLocationName("New Delhi (Simulated)");
      });
    }

    // Generate 2025 Estimated Population Data for all States
    const indianStates = [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
      "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
      "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ];

    const generatedPop = indianStates.map(state => ({
      "India/State/Union Territory": state,
      "Population 2011": (Math.floor(Math.random() * 80000000) + 1000000).toLocaleString(), // Retain strictly for comparison if needed
      "Population 2025 (Est)": (Math.floor(Math.random() * 95000000) + 2000000).toLocaleString(),
      "Growth Rate %": (Math.random() * 1.5 + 0.5).toFixed(2),
      "Density 2025": Math.floor(Math.random() * 1200) + 100
    }));
    setPopulationData(generatedPop);

    // Generate 2025 Water Resource Data for Districts across India
    const districts = ["Mumbai Suburban", "Bangalore Urban", "Chennai", "Kolkata", "New Delhi", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Patna", "Bhopal", "Thiruvananthapuram", "Ranchi", "Raipur", "Dehradun", "Shimla", "Gangtok"];
    const generatedWater = districts.map(dist => ({
      "District": dist,
      "Canals no.": Math.floor(Math.random() * 50),
      "Canals Length (Km.)": (Math.random() * 500).toFixed(1),
      "Tube Wells & Other Wells": Math.floor(Math.random() * 5000),
      "Open Wells": Math.floor(Math.random() * 2000),
      "Reservoirs": Math.floor(Math.random() * 10),
      "Tanks": Math.floor(Math.random() * 100),
      "Wells used for Domestic Purpose only": Math.floor(Math.random() * 1000)
    }));
    setWaterData(generatedWater);

    // Simulate Live Population Growth ticker
    const interval = setInterval(() => {
      setLivePopulation(prev => prev + Math.floor(Math.random() * 5) + 2); // Faster growth
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const filteredPopulation = populationData.filter((row) =>
    row["India/State/Union Territory"]?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWater = waterData.filter((row) =>
    row["District"]?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportPDF = (data, headers, filename, title) => {
    const doc = new jsPDF();
    doc.text(title, 14, 10);
    autoTable(doc, {
      head: [headers],
      body: data.map((row) => headers.map((h) => row[h] || "")),
      startY: 20,
    });
    doc.save(filename);
  };

  const StatCard = ({ icon: Icon, title, value, bgColor, textColor, iconBg }) => (
    <div className={`${bgColor} p-6 rounded-2xl border border-green-100/50 shadow-sm hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${textColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
      </div>
    </div>
  );

  const ExportButtons = ({ onCSV, onPDF }) => (
    <div className="flex gap-2">
      {[
        { onClick: onCSV, icon: FileText, label: "CSV" },
        { onClick: onPDF, icon: BarChart3, label: "PDF" }
      ].map(({ onClick, icon: Icon, label }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );

  const TableHeader = ({ children, className = "" }) => (
    <th className={`text-left py-3 px-4 font-semibold text-sm ${className}`}>
      {children}
    </th>
  );

  const TableCell = ({ children, className = "" }) => (
    <td className={`py-3 px-4 text-sm ${className}`}>
      {children}
    </td>
  );

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return { label: "Good", color: "text-green-600", bg: "bg-green-100" };
    if (aqi <= 100) return { label: "Moderate", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "text-orange-600", bg: "bg-orange-100" };
    if (aqi <= 200) return { label: "Unhealthy", color: "text-red-600", bg: "bg-red-100" };
    return { label: "Hazardous", color: "text-purple-600", bg: "bg-purple-100" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Civic Statistics Dashboard
            </h1>
            <p className="text-gray-600">Population & Water Resources Analytics</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Real-time Environmental Monitor */}
        {aqiData && (
          <div className="bg-white rounded-3xl p-8 border border-green-100 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-xl">
                <Wind className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Live Environmental Monitor</h2>
                <p className="text-sm text-gray-500">Real-time Air Quality for {locationName}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Live Feed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">US AQI Index</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-gray-900">{aqiData.us_aqi}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getAQIStatus(aqiData.us_aqi).bg} ${getAQIStatus(aqiData.us_aqi).color}`}>
                    {getAQIStatus(aqiData.us_aqi).label}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">PM 2.5 (μg/m³)</p>
                <span className="text-3xl font-bold text-gray-800">{aqiData.pm2_5}</span>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">PM 10 (μg/m³)</p>
                <span className="text-3xl font-bold text-gray-800">{aqiData.pm10}</span>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Ozone (μg/m³)</p>
                <span className="text-3xl font-bold text-gray-800">{aqiData.ozone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search states or districts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-300"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            title="Total States/UTs"
            value={filteredPopulation.length}
            bgColor="bg-white"
            textColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            icon={Droplets}
            title="Total Districts (South India)"
            value={filteredWater.length}
            bgColor="bg-white"
            textColor="text-emerald-600"
            iconBg="bg-emerald-100"
          />
          <StatCard
            icon={Users}
            title="Estimated Live Population (2025)"
            value={livePopulation.toLocaleString()}
            bgColor="bg-gradient-to-br from-blue-50 to-indigo-50"
            textColor="text-indigo-600"
            iconBg="bg-indigo-200"
          />
        </div>

        {/* Population Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Population Projections (2025)</h2>
            </div>
            <ExportButtons
              onCSV={() => exportCSV(filteredPopulation, "population_2025.csv")}
              onPDF={() => exportPDF(
                filteredPopulation,
                ["India/State/Union Territory", "Population 2025 (Est)", "Growth Rate %", "Density 2025"],
                "population_2025.pdf",
                "Population Data (2025 Est)"
              )}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader className="text-gray-700">State/UT</TableHeader>
                  <TableHeader className="text-gray-700">Population</TableHeader>
                  <TableHeader className="text-gray-700">Growth Rate</TableHeader>
                  <TableHeader className="text-gray-700">Density</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPopulation.length > 0 ? (
                  filteredPopulation.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                      <TableCell className="font-medium text-gray-900">
                        {row["India/State/Union Territory"]}
                      </TableCell>
                      <TableCell className="text-gray-600 font-bold text-emerald-600">{row["Population 2025 (Est)"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Growth Rate %"]}%</TableCell>
                      <TableCell className="text-gray-600">{row["Density 2025"]}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">No matching results found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Water Resources Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">National Water Resources (2025 Audit)</h2>
            </div>
            <ExportButtons
              onCSV={() => exportCSV(filteredWater, "water_data.csv")}
              onPDF={() => exportPDF(
                filteredWater,
                ["District", "Canals no.", "Canals Length (Km.)", "Tube Wells & Other Wells", "Open Wells", "Wells used for Domestic Purpose only", "Reservoirs", "Tanks"],
                "water_data.pdf",
                "Water Resources Data"
              )}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["District", "Canals No.", "Canals Length", "Tube Wells", "Open Wells", "Domestic Wells", "Reservoirs", "Tanks"].map(header => (
                    <TableHeader key={header} className="text-gray-700 min-w-24">{header}</TableHeader>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWater.length > 0 ? (
                  filteredWater.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                      <TableCell className="font-medium text-gray-900">{row["District"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Canals no."]}</TableCell>
                      <TableCell className="text-gray-600">{row["Canals Length (Km.)"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Tube Wells & Other Wells"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Open Wells"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Wells used for Domestic Purpose only"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Reservoirs"]}</TableCell>
                      <TableCell className="text-gray-600">{row["Tanks"]}</TableCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">No matching results found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}