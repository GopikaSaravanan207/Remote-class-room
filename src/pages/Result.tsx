import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Question } from '../types';

export default function ResultPage() {
  const { state } = useLocation() as any;
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(state?.result ?? null);
  const [review, setReview] = useState<Record<number, any> | null>(state?.review ?? null);
  const [subject, setSubject] = useState<string | undefined>(state?.subject);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!result) {
      try {
        const r = localStorage.getItem('lastQuizResult');
        const rev = localStorage.getItem('lastQuizReview');
        if (r) setResult(JSON.parse(r));
        if (rev) setReview(JSON.parse(rev));
      } catch (e) { /* ignore */ }
    }
    if (!subject && state?.subject) setSubject(state.subject);
  }, [result, state, subject]);

  useEffect(() => {
    const load = async () => {
      if (!subject) return;
      setLoading(true);
      try {
        const all = await api.student.getQuestions();
        const filtered = all.filter((q: Question) => ((q.subject || '').trim().toLowerCase()) === (subject || '').trim().toLowerCase());
        setQuestions(filtered);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [subject]);

  if (!result) return <div className="p-8">No result found.</div>;

  const handleRetry = () => {
    // clear last stored answers/result and go back to course
    try {
      localStorage.removeItem('lastQuizResult');
      localStorage.removeItem('lastQuizReview');
    } catch (e) {}
    if (subject) navigate(`/course/${subject}`);
    else navigate(-1);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button className="text-orange-600 mb-4" onClick={() => navigate(-1)}>← Back</button>
      <h1 className="text-2xl font-bold mb-4">Test Result</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Total Questions</div>
            <div className="text-xl font-bold">{result.totalQuestions}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Correct Answers</div>
            <div className="text-xl font-bold text-emerald-600">{result.correctAnswers}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Wrong Answers</div>
            <div className="text-xl font-bold text-red-600">{result.wrongAnswers}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Percentage</div>
            <div className="text-xl font-bold">{Math.round(result.percentage)}%</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-slate-500">Status</div>
          <div className="text-lg font-semibold mt-1">{result.status}</div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={handleRetry} className="px-4 py-2 bg-orange-600 text-white rounded-xl">Retry Test</button>
          <button onClick={() => navigate('/student/progress')} className="px-4 py-2 bg-slate-100 rounded-xl">View Progress</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold mb-4">Answer Review</h2>
        {loading ? (
          <div>Loading questions...</div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(review || {}) as any[]).map((k) => {
              const idx = Number(k);
              const item = review![idx];
              const q = questions[idx];
              return (
                <div key={k} className={`p-4 rounded-lg border ${item.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
                  <div className="text-sm text-slate-500">Question {idx + 1}</div>
                  <div className="font-medium">{q ? q.question_text : `Question ${idx + 1}`}</div>
                  <div className="mt-2 text-sm">Selected: <span className="font-semibold">{item.selected ?? '—'}</span></div>
                  <div className="text-sm">Correct: <span className="font-semibold">{item.correct ?? '—'}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
