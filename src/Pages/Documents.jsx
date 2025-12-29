import React, { useState } from 'react';
import { Search, Folder, Upload, Download, Trash2, Eye } from 'lucide-react'; // Removed unused icons
import { useNavigate } from "react-router-dom";
import AdminSidebar from '../components/AdminSidebar';

const Documents = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Placeholder data
  const documents = [
    { id: 1, name: 'Q1_Report.pdf', type: 'PDF', size: '2.4 MB', date: '2024-03-01', uploader: 'Admin' },
    { id: 2, name: 'User_Guidelines_v2.docx', type: 'DOCX', size: '1.1 MB', date: '2024-02-28', uploader: 'Sarah C.' },
    { id: 3, name: 'Platform_Policy.pdf', type: 'PDF', size: '856 KB', date: '2024-01-15', uploader: 'System' },
    { id: 4, name: 'Budget_Analysis_2024.xlsx', type: 'XLSX', size: '3.2 MB', date: '2024-03-10', uploader: 'Finance Dept' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans flex">
      <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Mobile Sidebar Overlay managed by AdminSidebar if needed, or we can leave basic structure */}

        {/* Main Content */}
        <div className="p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-6">Document Management</h1>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition shadow-md">
                <Upload className="h-4 w-4" />
                <span>Upload New</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                    <th className="pb-4 pl-2 font-medium">Name</th>
                    <th className="pb-4 font-medium">Type</th>
                    <th className="pb-4 font-medium">Size</th>
                    <th className="pb-4 font-medium">Date Uploaded</th>
                    <th className="pb-4 font-medium">Uploader</th>
                    <th className="pb-4 pr-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {documents.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="py-4 pl-2 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                          <Folder className="h-5 w-5" />
                        </div>
                        <span className="font-medium">{doc.name}</span>
                      </td>
                      <td className="py-4 text-gray-500">{doc.type}</td>
                      <td className="py-4 text-gray-500">{doc.size}</td>
                      <td className="py-4 text-gray-500">{doc.date}</td>
                      <td className="py-4 text-gray-500">{doc.uploader}</td>
                      <td className="py-4 pr-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition" title="Preview">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-1.5 hover:bg-green-50 text-emerald-600 rounded-md transition" title="Download">
                            <Download className="h-4 w-4" />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {documents.length === 0 && <div className="text-center py-10 text-gray-400">No documents found.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
