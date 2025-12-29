import React, { useEffect, useState } from "react";
import Papa from "papaparse";

export default function CsvImportPage() {
  const [nfsaData, setNfsaData] = useState([]);
  const [sdrfData, setSdrfData] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1. Fetch Live Disasters (ReliefWeb API)
      try {
        const response = await fetch("https://api.reliefweb.int/v1/disasters?appname=civix&profile=list&preset=latest&limit=5&filter[field]=country.iso3&filter[value]=IND");
        const data = await response.json();
        setDisasters(data.data || []);
      } catch (error) {
        console.error("Failed to load live disasters:", error);
      }

      // 2. Load CSV Data
      Papa.parse("gtfs/RS_Session_258_AU_1935_2.csv", {
        download: true,
        header: true,
        complete: (result) => {
          setNfsaData(result.data);
          checkLoadingComplete();
        },
      });
      Papa.parse("gtfs/RS_Session_258_AU_1997_1.csv", {
        download: true,
        header: true,
        complete: (result) => {
          setSdrfData(result.data);
          checkLoadingComplete();
        },
      });
    };

    let loadedCount = 0;
    const checkLoadingComplete = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const DataTable = ({ data, title, subtitle, gradient, iconColor }) => (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl border border-green-100/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
        <div className={`${gradient} px-8 py-6 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r opacity-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                <svg className={`w-7 h-7 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
                <p className="text-white/80 font-medium">{subtitle}</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
              <span className="text-white/90 text-sm font-bold">{data.length} records</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-green-100">
                  {Object.keys(data[0]).map((header, i) => (
                    <th key={i} className="text-left py-4 px-6 font-bold text-gray-700 tracking-wide uppercase text-xs bg-gradient-to-r from-green-50 to-emerald-50 first:rounded-l-xl last:rounded-r-xl whitespace-nowrap">
                      {header.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/50 transition-all duration-200 group/row">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="py-5 px-6 text-gray-700 group-hover/row:text-gray-900 transition-colors duration-200 font-medium whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {j === 0 && <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"></div>}
                          <span>{val}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/80 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JhcGgiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwMCAwIEwgMCAwIDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMzQsIDE5NywgOTQsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmFwaCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-green-200/50 shadow-2xl">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mb-6"></div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">Loading Data</h2>
              <p className="text-gray-600 font-medium">Please wait while we fetch your CSV files...</p>
              <div className="flex space-x-1 justify-center mt-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/80 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JhcGgiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwMCAwIEwgMCAwIDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMzQsIDE5NywgOTQsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmFwaCkiLz48L3N2Zz4=')] opacity-30"></div>

      <div className="relative bg-white/95 backdrop-blur-xl border-b border-green-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-center space-x-6">
            <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                SDRF & NFSA Analytics
              </h1>
              <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto w-40 mb-3"></div>
              <p className="text-lg text-gray-600 font-medium">Government data analysis and visualization platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-8 py-12 space-y-12">

        {/* Live Disaster Alerts (ReliefWeb API) */}
        {disasters.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-red-800 font-bold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Live Situational Report (India)
              </h3>
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">Source: ReliefWeb API</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disasters.map((disaster, idx) => (
                <a key={idx} href={disaster.fields?.url || '#'} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white rounded-lg border border-red-100 hover:shadow-md transition-shadow group">
                  <p className="text-sm text-gray-500 mb-1">{disaster.fields?.date?.created ? new Date(disaster.fields.date.created).toLocaleDateString() : 'Recent'}</p>
                  <h4 className="font-semibold text-gray-800 group-hover:text-red-600 line-clamp-2">{disaster.fields?.name || 'Unknown Event'}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {disaster.fields?.type && disaster.fields.type.map(t => (
                      <span key={t.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.name}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {(!loading && (nfsaData.length > 0 || sdrfData.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-green-100 shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </span>
                Funds Analysis
              </h3>
              <div className="h-64 w-full">
                {/* Placeholder Chart - Real implementation would need specific CSV column names */}
                <div className="h-full w-full bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 border-dashed">
                  <p className="text-green-600 font-medium">Visualizing {sdrfData.length + nfsaData.length} records...</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-emerald-100 shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>
                </span>
                Distribution Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-6 rounded-2xl text-center">
                  <p className="text-emerald-600 text-sm font-bold uppercase tracking-wide">Total Records</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{nfsaData.length + sdrfData.length}</p>
                </div>
                <div className="bg-teal-50 p-6 rounded-2xl text-center">
                  <p className="text-teal-600 text-sm font-bold uppercase tracking-wide">Data Sources</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">2</p>
                </div>
                <div className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-2xl text-center text-white">
                  <p className="text-white/80 text-sm font-bold uppercase tracking-wide">System Status</p>
                  <p className="text-2xl font-bold mt-1 flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                    Live Data Feed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {nfsaData.length > 0 && (
          <DataTable
            data={nfsaData}
            title="National Food Security Act"
            subtitle="Session 258 - August 1935 Records"
            gradient="bg-gradient-to-r from-green-600 via-green-500 to-emerald-600"
            iconColor="text-white"
          />
        )}

        {sdrfData.length > 0 && (
          <DataTable
            data={sdrfData}
            title="SDRF Allocation & Release"
            subtitle="Session 258 - August 1997 Records"
            gradient="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600"
            iconColor="text-white"
          />
        )}

        {nfsaData.length === 0 && sdrfData.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full blur-xl opacity-20"></div>
              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 shadow-xl max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No Data Available</h3>
                <p className="text-gray-600 font-medium">Unable to load CSV files. Please check the file paths and try again.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="relative bg-white/95 backdrop-blur-xl border-t border-green-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <p className="text-center text-gray-600 font-medium">
            Powered by <span className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Civix</span> - Government Data Platform
          </p>
        </div>
      </footer>
    </div>
  );
}