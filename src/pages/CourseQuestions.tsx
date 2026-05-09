import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Question } from '../types';

export default function CourseQuestions() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await api.student.getQuestions();
        const filtered = all.filter((q: Question) => ((q.subject || '').trim().toLowerCase()) === (subject || '').trim().toLowerCase());
        setQuestions(filtered);
        setAnswers({});
        setCurrentIndex(0);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, [subject]);

  if (loading) return <div className="p-8">Loading questions...</div>;
  if (!questions.length) return (
    <div className="p-8 max-w-3xl mx-auto">
      <button className="text-orange-600 mb-4" onClick={() => navigate(-1)}>← Back</button>
      <h2 className="text-2xl font-bold">{subject}</h2>
      <p className="text-slate-500 mt-4">No questions available for this course.</p>
    </div>
  );

  const current = questions[currentIndex];
  const total = questions.length;

  const selectOption = (opt: string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: opt }));
  };

  const handleNext = () => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      // Build payload in question order so server can return review in same order, include subject
      const payload = { 
        answers: questions.map((q, idx) => ({ question_id: q.id, selected_answer: answers[idx] || '' })),
        subject: subject // Send course/subject for course-wise result tracking
      };
      const res = await api.student.submitAnswers(payload);
      if (res?.result) {
        try { localStorage.setItem('lastQuizResult', JSON.stringify(res.result)); localStorage.setItem('lastQuizReview', JSON.stringify(res.review)); } catch (e) {}
        navigate('/result', { state: { result: res.result, review: res.review, subject } });
      } else {
        console.error('Submit failed', res);
      }
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button className="text-orange-600 mb-1" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="text-2xl font-bold">{subject}</h1>
          <p className="text-sm text-slate-500">Question {currentIndex + 1} of {total}</p>
        </div>
        <div className="w-40">
          <div className="h-2 bg-slate-200 rounded-lg overflow-hidden">
            <div className="h-full bg-orange-600" style={{ width: `${Math.round((answeredCount / total) * 100)}%` }} />
          </div>
          <p className="text-xs text-slate-500 text-right mt-1">{answeredCount} answered</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-sm font-bold text-orange-600 uppercase mb-2">{current.subject} • {current.topic}</p>
        <h2 className="text-xl font-bold text-slate-900 mb-6">{current.question_text}</h2>

        <div className="space-y-3">
          {(['A','B','C','D'] as const).map((opt) => {
            const val = (current as any)[`option_${opt.toLowerCase()}`];
            const checked = answers[currentIndex] === opt;
            return (
              <label key={opt} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${checked ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center gap-4">
                  <input type="radio" name={`q-${current.id}`} checked={checked} onChange={() => selectOption(opt)} className="h-4 w-4" />
                  <div>{opt}. {val}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <button onClick={handlePrev} disabled={currentIndex === 0} className="px-4 py-2 mr-2 bg-white border border-slate-200 rounded-xl disabled:opacity-50">Previous</button>
            {currentIndex < total - 1 ? (
              <button onClick={handleNext} disabled={!answers[currentIndex]} className="px-4 py-2 bg-orange-600 text-white rounded-xl disabled:opacity-50">Next</button>
            ) : (
              <button onClick={handleSubmitAll} disabled={submitting || answeredCount === 0} className="px-4 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
            )}
          </div>
          <div className="text-sm text-slate-500">Selected: {answers[currentIndex] || '—'}</div>
        </div>
      </div>
    </div>
  );
}
