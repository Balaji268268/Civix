// src/Pages/NewIssue.jsx
import { useState } from 'react';
import CharacterCounter from '../components/ui/CharacterCounter';
import SubmissionConfirmation from '../components/modals/SubmissionConfirmation';
import useFormPersistence from '../hooks/useFormPersistence';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';
import toast from 'react-hot-toast';

export default function NewIssue() {
  /* Persistence: Description saved to localStorage */
  const [description, setDescription, clearDescription] = useFormPersistence('new_issue_description', '', false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      // Post to same endpoint as ReportIssue but with simplified data? 
      // Or create specific endpoint? reusing existing /api/issues for now with defaults.
      const formData = new FormData();
      formData.append('title', 'Quick Issue Report'); // Default title
      formData.append('description', description);
      formData.append('category', 'Other');
      formData.append('issueType', 'Public');

      const res = await csrfManager.secureFetch('/api/issues', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
          // Content-Type handled by fetch for FormData
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedId(data.issue._id);
        setShowConfirmation(true);
        clearDescription();
      } else {
        toast.error("Failed to submit issue");
      }
    } catch (error) {
      toast.error("Error submitting issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <form onSubmit={handleSubmit}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-800"
          rows={5}
        />
        <CharacterCounter value={description} />
        <button
          type="submit"
          disabled={isSubmitting || !description.trim()}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
        >
          {isSubmitting ? "Submitting..." : "Submit Issue"}
        </button>
      </form>

      <SubmissionConfirmation
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        issueId={submittedId}
        onViewIssue={() => window.location.href = `/issues/${submittedId}`}
        onReportAnother={() => clearDescription()}
      />
    </div>
  );
}