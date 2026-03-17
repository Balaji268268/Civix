import React, { useState } from 'react';
import PropTypes from 'prop-types';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Select from '../ui/Select';
import { PUBLIC_CATEGORIES } from '../../constants/categories';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  ShieldAlert,
  MapPin,
  Sparkles
} from 'lucide-react';

export default function EvidencePanel({
  issue,
  onApprove,
  onReject,
  onCategoryCorrect
}) {
  const [selectedCategory, setSelectedCategory] = useState(issue?.category || 'other');
  const [rejectReason, setRejectReason] = useState('UNACTIONABLE');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!issue) return null;

  const aiData = issue.aiAnalysis || {};
  const detectedObjects = aiData.detectedObjects || [];
  const quality = aiData.imageQuality || {};
  const matchVerdict = aiData.matchVerdict || 'UNCERTAIN';
  const matchScore = aiData.matchScore || 0.5;

  const rejectionReasonOptions = [
    { value: 'DUPLICATE', label: 'Duplicate Report' },
    { value: 'FAKE_TEXT', label: 'Spam / Gibberish Text' },
    { value: 'FAKE_IMAGE', label: 'Unrelated / Spam Image' },
    { value: 'MISMATCH', label: 'Description-Image Mismatch' },
    { value: 'OUT_OF_AREA', label: 'Outside Municipal Jurisdiction' },
    { value: 'UNACTIONABLE', label: 'Insufficient Information' }
  ];

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      if (selectedCategory !== issue.category && onCategoryCorrect) {
        await onCategoryCorrect(issue._id, selectedCategory);
      }
      await onApprove(issue._id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(issue._id, rejectReason, rejectRemarks);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {issue.complaintId}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {issue.title}
          </h3>
        </div>
        <StatusBadge status={issue.status} size="md" reasonCode={issue.closeReason} />
      </div>

      {/* Side-by-Side Evidence Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: Visual Evidence (Photo + YOLO Bounding Boxes + Quality) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
              <span>Image & Visual Detections</span>
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              matchVerdict === 'MATCH'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                : matchVerdict === 'MISMATCH'
                ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
            }`}>
              Match: {matchVerdict} ({(matchScore * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="relative w-full h-56 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            {issue.fileUrl ? (
              <img
                src={issue.fileUrl}
                alt="Issue evidence"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">No image uploaded</span>
            )}

            {/* Render YOLO Bounding Box Pill Overlay */}
            {detectedObjects.length > 0 && (
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 z-10">
                {detectedObjects.map((obj, i) => (
                  <span key={i} className="text-[10px] font-mono bg-slate-900/80 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/20">
                    {obj.class} ({Math.round(obj.conf * 100)}%)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quality & EXIF Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase">Blur Score</span>
              <span className="font-semibold">{quality.blur_score != null ? quality.blur_score : '0.12'}</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase">Exposure</span>
              <span className="font-semibold capitalize">{quality.exposure || 'ok'}</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase">GPS EXIF</span>
              <span className="font-semibold">{aiData.geo_mismatch_km ? `${aiData.geo_mismatch_km}km diff` : 'Verified'}</span>
            </div>
          </div>
        </div>

        {/* Right: Text NLP Analysis & Category Flywheel */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Complaint Narrative & ML Signals</span>
          </span>

          <Card padding="tight" className="text-xs space-y-2 bg-slate-50/70 dark:bg-slate-800/50">
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
              "{issue.description}"
            </p>
            {issue.location && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                <MapPin className="w-3 h-3 text-teal-600" />
                <span>{issue.location}</span>
              </div>
            )}
          </Card>

          {/* Department Category Correction Flywheel */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Assigned Department Category (Flywheel Correction):
            </label>
            <Select
              options={PUBLIC_CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 text-xs"
            />
          </div>

          {/* AI Decision Diagnostics */}
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Spam Anomaly Score:</span>
              <span className="font-mono">{issue.fakeConfidence ? (issue.fakeConfidence * 100).toFixed(0) : '0'}%</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Priority Prediction:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{issue.priority || 'Medium'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Actions Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Rejection Form with Reason Code */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="w-48">
            <Select
              options={rejectionReasonOptions}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="py-1 text-xs"
            />
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={isSubmitting}
            onClick={handleReject}
            iconLeft={<XCircle className="w-4 h-4" />}
          >
            Reject with Code
          </Button>
        </div>

        {/* Approve Button */}
        <Button
          variant="primary"
          size="md"
          loading={isSubmitting}
          onClick={handleApprove}
          iconLeft={<CheckCircle2 className="w-4 h-4" />}
        >
          Approve & Dispatch
        </Button>
      </div>
    </div>
  );
}

EvidencePanel.propTypes = {
  issue: PropTypes.object.isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onCategoryCorrect: PropTypes.func
};
