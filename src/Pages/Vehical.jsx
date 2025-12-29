import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Clock, Shield, FileText } from 'lucide-react';

const ExternalLinkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export default function GovtLinksSection() {
  const [vehicleNo, setVehicleNo] = useState("");
  const [status, setStatus] = useState("idle");
  const [challans, setChallans] = useState([]);

  const handleSearch = () => {
    if (!vehicleNo) return;
    setStatus("loading");

    // Simulating API Fetch
    setTimeout(() => {
      const isPending = Math.random() > 0.6;
      if (isPending) {
        setChallans([
          { id: "CHN-" + Math.floor(Math.random() * 100000), date: "2025-08-12", type: "Over Speeding", amount: 2000, loc: "Ring Road, Delhi" },
          { id: "CHN-" + Math.floor(Math.random() * 100000), date: "2025-06-01", type: "Signal Jump", amount: 500, loc: "CP, Delhi" }
        ]);
      } else {
        setChallans([]);
      }
      setStatus("result");
    }, 1500);
  };

  const sections = [
    // ... (Keep existing sections but just re-render them below)
    { title: "Vehicle RC", desc: "Check vehicle registration details.", url: "https://vahan.parivahan.gov.in/vahanservice/vahan/rc/", cta: "Check RC" },
    { title: "Insurance", desc: "Verify vehicle insurance status.", url: "https://vahan.parivahan.gov.in/vahanservice/vahan/insurance/", cta: "Verify" },
    { title: "PUC Status", desc: "Check pollution certificate validity.", url: "https://parivahan.gov.in/puc/", cta: "Check PUC" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* 1. Hero / Search Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">Traffic E-Challan Portal</h1>
            <p className="text-emerald-100/90 text-lg mb-8 font-medium">Instantly check pending fines and challan status for any vehicle across India.</p>

            <div className="bg-white p-2 rounded-2xl shadow-lg flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter Vehicle Number (e.g. DL 01 AB 1234)"
                className="flex-1 px-6 py-4 rounded-xl text-gray-900 font-bold text-lg focus:outline-none placeholder:font-normal"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
              />
              <button
                onClick={handleSearch}
                disabled={status === "loading"}
                className="px-8 py-4 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Get Details
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Results Section (Conditional) */}
        {status === "result" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {challans.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-red-100 dark:border-red-900/30 overflow-hidden shadow-xl">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 flex items-center gap-4 border-b border-red-100">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Action Required</h3>
                    <p className="text-red-600/80 dark:text-red-400/80 text-sm">Found {challans.length} pending challans for {vehicleNo}</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {challans.map((c, i) => (
                    <div key={i} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono font-bold text-gray-500">{c.id}</span>
                          <span className="text-sm text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {c.date}</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">{c.type}</h4>
                        <p className="text-gray-500 text-sm">{c.loc}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">₹{c.amount}</p>
                        <button className="mt-2 text-sm text-blue-600 font-semibold hover:underline">Pay Now &rarr;</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-xl border border-green-100">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Clean Record!</h3>
                <p className="text-gray-500">No pending challans found for {vehicleNo}. Drive safely!</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Quick Links Grid */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            More Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="group bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow hover:shadow-lg transition-all hover:-translate-y-1">
                <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 group-hover:text-emerald-600 transition-colors">{s.title}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{s.desc}</p>
                <span className="inline-flex items-center text-sm font-semibold text-emerald-600 gap-1">
                  {s.cta} <ExternalLinkIcon />
                </span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
