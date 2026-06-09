import { useState, useEffect } from 'react';
import Select from 'react-select';

type Subject = { name: string; mark: number };

const SUBJECT_OPTIONS = [
  { value: 'English Home Language', label: 'English Home Language' },
  { value: 'Afrikaans Home Language', label: 'Afrikaans Home Language' },
  { value: 'isiZulu Home Language', label: 'isiZulu Home Language' },
  { value: 'isiXhosa Home Language', label: 'isiXhosa Home Language' },
  { value: 'Sepedi Home Language', label: 'Sepedi Home Language' },
  { value: 'Sesotho Home Language', label: 'Sesotho Home Language' },
  { value: 'Setswana Home Language', label: 'Setswana Home Language' },
  { value: 'siSwati Home Language', label: 'siSwati Home Language' },
  { value: 'Tshivenda Home Language', label: 'Tshivenda Home Language' },
  { value: 'Xitsonga Home Language', label: 'Xitsonga Home Language' },
  { value: 'isiNdebele Home Language', label: 'isiNdebele Home Language' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Mathematical Literacy', label: 'Mathematical Literacy' },
  { value: 'Physical Sciences', label: 'Physical Sciences' },
  { value: 'Life Sciences', label: 'Life Sciences' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Economics', label: 'Economics' },
  { value: 'Life Orientation', label: 'Life Orientation' }
];

export default function APSScreen() {
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'English Home Language', mark: 0 },
    { name: 'Mathematics', mark: 0 },
    { name: 'Life Orientation', mark: 0 }
  ]);
  const [aps, setAps] = useState(0);
  const [knowledge, setKnowledge] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const res = await fetch('/data/knowledge.json');
        if (res.ok) {
          const data = await res.json();
          setKnowledge(data);
        } else {
          console.log('Failed to load knowledge.json:', res.status);
        }
      } catch (e) {
        console.log('Failed to load knowledge.json:', e);
      } finally {
        setLoading(false);
      }
    };
    loadKnowledge();
  }, []);

  const calculateAPS = () => {
    const validSubjects = subjects.filter(s => s.name && s.mark > 0);
    const lo = validSubjects.find(s => s.name === 'Life Orientation');
    const otherSubjects = validSubjects.filter(s => s.name!== 'Life Orientation');

    const bestSix = otherSubjects
     .map(s => ({...s, apsPoints: markToAPS(s.mark) }))
     .sort((a, b) => b.apsPoints - a.apsPoints)
     .slice(0, 6);

    const total = bestSix.reduce((sum, s) => sum + s.apsPoints, 0) + (lo? 1 : 0);
    setAps(total);
  };

  const markToAPS = (mark: number): number => {
    if (mark >= 80) return 7; // 80-100 = 7
    if (mark >= 70) return 6; // 70-79 = 6
    if (mark >= 60) return 5; // 60-69 = 5
    if (mark >= 50) return 4; // 50-59 = 4
    if (mark >= 40) return 3; // 40-49 = 3
    if (mark >= 30) return 2; // 30-39 = 2
    return 1; // 0-29 = 1
  };

  const addSubject = () => {
    if (subjects.length < 8) setSubjects([...subjects, { name: '', mark: 0 }]);
  };

  const updateSubject = (index: number, field: 'name' | 'mark', value: string) => {
    const newSubjects = [...subjects];
    if (field === 'name') newSubjects[index].name = value;
    else newSubjects[index].mark = Number(value) || 0;
    setSubjects(newSubjects);
  };

  const removeSubject = (index: number) => {
    if (subjects.length > 3) setSubjects(subjects.filter((_, i) => i!== index));
  };

  const getQualifyingDegrees = () => {
    if (!knowledge.institutions) return [];

    const allInstitutions = [
     ...(knowledge.institutions || []),
     ...(knowledge.tvet_colleges || []),
     ...(knowledge.private_institutions || [])
    ];

    const results: any[] = [];
    allInstitutions.forEach(inst => {
      Object.entries(inst.faculties || {}).forEach(([faculty, data]: [string, any]) => {
        if (aps >= data.aps) {
          results.push({
            institution: inst.short || inst.name,
            faculty,
            apsRequired: data.aps,
            degrees: data.degrees?.slice(0, 2).join(', ') || 'Various',
            color: inst.primaryColor || '#8B0000'
          });
        }
      });
    });

    return results.sort((a, b) => b.apsRequired - a.apsRequired).slice(0, 10);
  };

  const qualifying = getQualifyingDegrees();
  const hasHomeLanguage = subjects.some(s => s.name.includes('Home Language'));

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading institutions...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <div style={{ backgroundColor: '#8B0000', color: 'white', padding: 20, borderRadius: 12, textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>APS Calculator</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>Check what you qualify for</p>
      </div>

      <div style={{ backgroundColor: '#8B0000', color: 'white', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Your APS Score</div>
        <div style={{ fontSize: 48, fontWeight: 'bold', margin: '8px 0' }}>{aps}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {hasHomeLanguage? 'Based on your 6 best subjects + Life Orientation' : 'Select a Home Language first'}
        </div>
      </div>

      {!hasHomeLanguage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8, marginBottom: 16, color: '#dc2626' }}>
          ⚠️ Home Language is compulsory for university admission
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Enter Your Marks</h2>

      {subjects.map((subject, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Select
              options={SUBJECT_OPTIONS}
              value={SUBJECT_OPTIONS.find(opt => opt.value === subject.name) || null}
              onChange={(opt) => updateSubject(index, 'name', opt?.value || '')}
              placeholder="Select Subject"
              isSearchable={true}
            />
          </div>
          <input
            type="number"
            placeholder="%"
            min="0"
            max="100"
            value={subject.mark || ''}
            onChange={(e) => updateSubject(index, 'mark', e.target.value)}
            style={{ width: 70, padding: 10, borderRadius: 8, border: '1px solid #ddd', textAlign: 'center' }}
          />
          {subjects.length > 3 && (
            <button onClick={() => removeSubject(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
              🗑️
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addSubject}
        disabled={subjects.length >= 8}
        style={{ width: '100%', padding: 12, border: '2px dashed #8B0000', background: 'none', color: '#8B0000', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}
      >
        + Add Subject (Max 8)
      </button>

      <button
        onClick={calculateAPS}
        style={{ width: '100%', backgroundColor: '#8B0000', color: 'white', padding: 16, borderRadius: 12, border: 'none', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
      >
        Calculate APS
      </button>

      {aps > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>You Qualify For ({qualifying.length})</h2>
          {qualifying.length === 0? (
            <p style={{ color: '#666', textAlign: 'center', padding: 20 }}>No qualifications found with APS {aps}. Try TVET colleges - they accept APS 20+.</p>
          ) : (
            qualifying.map((q, i) => (
              <div key={i} style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8, borderLeft: `4px solid ${q.color}` }}>
                <div style={{ fontWeight: 'bold', fontSize: 15 }}>{q.institution}</div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{q.faculty} - APS {q.apsRequired}</div>
                <div style={{ color: '#333', fontSize: 13, marginTop: 4 }}>{q.degrees}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}