import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Eye, Filter, ChevronRight } from 'lucide-react';

export default function TestResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await api.staff.getCourseResults();
      
      // Enrich missing student names from Firestore
      const enriched = await Promise.all((data || []).map(async (r: any) => {
        if (r.student_name && r.student_name.trim()) {
          return r;
        }
        // Fallback: fetch name from Firestore if missing
        try {
          const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/smartclassroom-a05da/databases/(default)/documents/users/${r.student_id}`,
            { method: 'GET' }
          );
          if (response.ok) {
            const data = await response.json();
            const fetchedName = data.fields?.name?.stringValue;
            return { ...r, student_name: fetchedName || r.student_id };
          }
        } catch (e) {
          console.warn('Failed to fetch student name:', e);
        }
        return { ...r, student_name: r.student_id };
      }));
      
      setResults(enriched);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
    setLoading(false);
  };

  const handleViewDetails = async (attemptId: string) => {
    setDetailsLoading(true);
    try {
      const details = await api.staff.getAttemptDetails(attemptId);
      setDetailsModal(details);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
    setDetailsLoading(false);
  };

  // Get unique courses and students for filtering
  const courses = Array.from(new Set(results.map(r => r.course_subject).filter(Boolean))).sort();
  const students = Array.from(new Set(results.map(r => (r.student_name || r.student_id)).filter(Boolean))).sort();

  // Filter results based on selected filters
  const filteredResults = results.filter(r => {
    if (selectedCourse && r.course_subject !== selectedCourse) return false;
    if (selectedStudent && (r.student_name || r.student_id) !== selectedStudent) return false;
    return true;
  });

  if (loading) return <div className="p-8">Loading results...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <button className="text-orange-600 mb-4 flex items-center gap-2" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Test Results Dashboard</h1>
        <p className="text-slate-500 mt-2">View aggregated course-wise test results</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Filter size={20} /> Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Course</label>
            <select
              value={selectedCourse || ''}
              onChange={(e) => setSelectedCourse(e.target.value || null)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-600"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Student</label>
            <select
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(e.target.value || null)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-600"
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student} value={student}>
                  {student}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            Results ({filteredResults.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Course</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold">Percentage</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs">
                        {String(r.student_name || r.student_id || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{r.student_name || r.student_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{r.course_subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">
                      {r.correct_answers}/{r.total_questions}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">
                      {Math.round(r.percentage)}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      r.status === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'Good' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(r.submitted_at).toLocaleDateString()} {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDetails(r.attempt_id)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No results found. {selectedCourse || selectedStudent ? 'Try adjusting filters.' : 'No test attempts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Attempt Details</h2>
              <button
                onClick={() => setDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center">Loading details...</div>
            ) : (
              <div className="p-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase mb-1">Total Questions</p>
                    <p className="text-2xl font-bold">{detailsModal.result.total_questions}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-xs text-emerald-600 uppercase mb-1">Correct</p>
                    <p className="text-2xl font-bold text-emerald-600">{detailsModal.result.correct_answers}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-xs text-red-600 uppercase mb-1">Wrong</p>
                    <p className="text-2xl font-bold text-red-600">{detailsModal.result.wrong_answers}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-xs text-orange-600 uppercase mb-1">Percentage</p>
                    <p className="text-2xl font-bold text-orange-600">{Math.round(detailsModal.result.percentage)}%</p>
                  </div>
                </div>

                {/* Questions Detail */}
                <h3 className="text-lg font-bold mb-4">Question-wise Breakdown</h3>
                <div className="space-y-4">
                  {detailsModal.details.map((q: any, idx: number) => (
                    <div
                      key={q.question_id}
                      className={`p-5 rounded-lg border-2 ${
                        q.is_correct
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-slate-900">
                            Q{idx + 1}. {q.question_text}
                          </h4>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            q.is_correct
                              ? 'bg-emerald-200 text-emerald-700'
                              : 'bg-red-200 text-red-700'
                          }`}>
                            {q.is_correct ? '✓ Correct' : '✗ Wrong'}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">{q.topic}</p>
                      </div>

                      <div className="space-y-2 text-sm mb-3">
                        {Object.entries(q.options).map(([key, value]: [string, any]) => (
                          <div
                            key={key}
                            className={`p-2 rounded ${
                              key === q.student_answer
                                ? q.is_correct
                                  ? 'bg-emerald-100 border-l-4 border-emerald-600'
                                  : 'bg-red-100 border-l-4 border-red-600'
                                : key === q.correct_answer
                                ? 'bg-emerald-100 border-l-4 border-emerald-600'
                                : 'bg-slate-100'
                            }`}
                          >
                            <span className="font-bold">{key}.</span> {value}
                            {key === q.student_answer && (
                              <span className="ml-2 text-xs font-bold">
                                [Student Answer]
                              </span>
                            )}
                            {key === q.correct_answer && (
                              <span className="ml-2 text-xs font-bold">
                                [Correct Answer]
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
