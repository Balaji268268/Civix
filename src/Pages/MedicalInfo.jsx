// pages/MedicalInfo.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, Phone, Hospital, ShieldCheck, Pill, AlertTriangle, HeartPulse, User2, Edit2, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';

const defaultData = {
  name: "Aarav Sharma",
  age: 24,
  blood: "B+",
  allergies: "Peanuts, Penicillin",
  meds: "Cetirizine (SOS)",
  conditions: "Mild Asthma",
  doctorName: "Dr. Verma",
  doctorPhone: "+91111222333",
  doctorHospital: "CityCare Hospital",
  contact1Name: "Mom",
  contact1Phone: "+919999888877",
  contact2Name: "Best Friend",
  contact2Phone: "+919876543210"
};

export default function MedicalInfo() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(defaultData);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("civix_medical_info");
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse medical info");
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("civix_medical_info", JSON.stringify(formData));
    toast.success("Medical info updated successfully!");
    setIsEditing(false);
  };

  const InputField = ({ label, name, value, type = "text", placeholder }) => (
    <div className="mb-3">
      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 pb-20">
      {/* Top Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-black font-medium"
        >
          <ArrowLeft size={20} /> Back
        </button>

        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition shadow-sm ${isEditing
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
        >
          {isEditing ? <><Save size={18} /> Save Changes</> : <><Edit2 size={18} /> Edit Info</>}
        </button>
      </div>

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          {isEditing ? (
            <div className="space-y-4 max-w-md">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-white/70 text-xs font-bold">FULL NAME</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-white/20 border border-white/30 rounded-lg p-2 text-white placeholder-white/50 focus:outline-none focus:bg-white/30 font-bold text-xl"
                  />
                </div>
                <div className="w-24">
                  <label className="text-white/70 text-xs font-bold">AGE</label>
                  <input
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full bg-white/20 border border-white/30 rounded-lg p-2 text-white placeholder-white/50 focus:outline-none focus:bg-white/30 font-bold text-xl"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold">BLOOD GROUP</label>
                <select
                  name="blood"
                  value={formData.blood}
                  onChange={handleChange}
                  className="bg-white text-rose-600 font-bold px-4 py-2 rounded-lg shadow w-full focus:outline-none"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold tracking-tight">{formData.name}</h1>
              <p className="mt-2 text-xl opacity-90">Age {formData.age}</p>
              <span className="mt-4 inline-block bg-white text-rose-600 font-bold px-4 py-1.5 rounded-full shadow-lg">
                Blood Group: {formData.blood}
              </span>
            </>
          )}
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-50%] left-[-10%] w-80 h-80 bg-purple-900/20 rounded-full blur-3xl" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medical Details */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-lg p-8">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-gray-800">
              <HeartPulse className="text-rose-500 stroke-[2.5px]" /> Health Information
            </h3>

            <div className="grid sm:grid-cols-2 gap-6">
              {isEditing ? (
                <>
                  <InputField label="Allergies (comma separated)" name="allergies" value={formData.allergies} />
                  <InputField label="Medications (comma separated)" name="meds" value={formData.meds} />
                  <InputField label="Chronic Conditions" name="conditions" value={formData.conditions} />
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">Insurance details can be added in document vault.</p>
                  </div>
                </>
              ) : (
                <>
                  <Card title="Allergies" items={formData.allergies?.split(',').map(s => s.trim())} icon={<AlertTriangle className="text-red-500 w-5 h-5" />} />
                  <Card title="Medications" items={formData.meds?.split(',').map(s => s.trim())} icon={<Pill className="text-green-500 w-5 h-5" />} />
                  <Card title="Conditions" items={formData.conditions?.split(',').map(s => s.trim())} icon={<ShieldCheck className="text-blue-500 w-5 h-5" />} />
                  <div className="rounded-2xl border border-gray-100 p-5 bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                      <ShieldCheck className="text-emerald-600 w-5 h-5" /> Insurance
                    </div>
                    <p className="text-xs font-medium text-slate-500">ID: XXX-XX-9482</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Doctor Card */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-lg p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Hospital size={100} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 font-bold text-xl text-gray-800 mb-4">
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><Hospital size={24} /></div>
                Primary Doctor
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Doctor Name" name="doctorName" value={formData.doctorName} />
                  <InputField label="Hospital / Clinic" name="doctorHospital" value={formData.doctorHospital} />
                  <InputField label="Phone Number" name="doctorPhone" value={formData.doctorPhone} />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{formData.doctorName}</p>
                  <p className="text-lg text-slate-500 font-medium">{formData.doctorHospital}</p>
                  <div className="mt-6 flex gap-3">
                    <a
                      href={`tel:${formData.doctorPhone}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1"
                    >
                      <Phone className="w-5 h-5" /> Call Doctor
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="space-y-6">
          {/* Emergency Contacts */}
          <div className="rounded-3xl border border-gray-100 bg-white shadow-lg p-8">
            <h4 className="font-bold mb-6 text-xl flex items-center gap-3 text-gray-800">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><User2 size={24} /></div>
              Emergency Contacts
            </h4>

            {isEditing ? (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h5 className="font-bold text-xs uppercase text-gray-400 mb-3">Contact 1</h5>
                  <InputField label="Name" name="contact1Name" value={formData.contact1Name} />
                  <InputField label="Phone" name="contact1Phone" value={formData.contact1Phone} />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h5 className="font-bold text-xs uppercase text-gray-400 mb-3">Contact 2</h5>
                  <InputField label="Name" name="contact2Name" value={formData.contact2Name} />
                  <InputField label="Phone" name="contact2Phone" value={formData.contact2Phone} />
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {[
                  { name: formData.contact1Name, phone: formData.contact1Phone },
                  { name: formData.contact2Name, phone: formData.contact2Phone }
                ].map((c, i) => (
                  <li key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-sm text-slate-500 font-medium">{c.phone}</p>
                    </div>
                    <a
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition border border-rose-100"
                      href={`tel:${c.phone}`}
                    >
                      <Phone size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* QR Code */}
          <div className="rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 text-center">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">Scan for full history</p>
            <div className="mx-auto h-48 w-48 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center justify-center">
              <div className="w-full h-full bg-slate-800 rounded-lg opacity-10 animate-pulse"></div>
            </div>
            <button className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition shadow-lg">
              Download QR Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, items, icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5 bg-white shadow-sm hover:shadow-md transition cursor-default">
      <div className="flex items-center gap-2 font-bold text-slate-700">
        {icon} {title}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items?.map((x, i) => (
          <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400"></span>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
