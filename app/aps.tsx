import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Subject = { name: string; mark: number };

// 1. ADD ALL 11 SA HOME LANGUAGES + CORE SUBJECTS
const SUBJECTS = [
  // Home Languages - COMPULSORY for APS
  'English Home Language',
  'Afrikaans Home Language',
  'isiZulu Home Language',
  'isiXhosa Home Language',
  'Sepedi Home Language',
  'Sesotho Home Language',
  'Setswana Home Language',
  'siSwati Home Language',
  'Tshivenda Home Language',
  'Xitsonga Home Language',
  'isiNdebele Home Language',

  // Other Subjects
  'Mathematics',
  'Mathematical Literacy',
  'Physical Sciences',
  'Life Sciences',
  'History',
  'Geography',
  'Accounting',
  'Business Studies',
  'Economics',
  'Life Orientation' // Counts as 1 point only
];

export default function APSScreen() {
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'English Home Language', mark: 0 }, // Default Home Language
    { name: 'Mathematics', mark: 0 },
    { name: 'Life Orientation', mark: 0 }
  ]);
  const [aps, setAps] = useState(0);
  const [knowledge, setKnowledge] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        // FIXED: removed /public
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

    // Separate Life Orientation from other subjects
    const lo = validSubjects.find(s => s.name === 'Life Orientation');
    const otherSubjects = validSubjects.filter(s => s.name!== 'Life Orientation');

    // Take best 6 subjects excluding Life Orientation
    const bestSix = otherSubjects
   .map(s => ({...s, apsPoints: markToAPS(s.mark) }))
   .sort((a, b) => b.apsPoints - a.apsPoints)
   .slice(0, 6);

    const total = bestSix.reduce((sum, s) => sum + s.apsPoints, 0) + (lo? 1 : 0);
    setAps(total);
  };

  const markToAPS = (mark: number): number => {
    if (mark >= 90) return 8;
    if (mark >= 80) return 7;
    if (mark >= 70) return 6;
    if (mark >= 60) return 5;
    if (mark >= 50) return 4;
    if (mark >= 40) return 3;
    if (mark >= 30) return 2;
    return 1;
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
            color: inst.primaryColor
          });
        }
      });
    });

    return results.sort((a, b) => b.apsRequired - a.apsRequired).slice(0, 10);
  };

  const qualifying = getQualifyingDegrees();
  const hasHomeLanguage = subjects.some(s => s.name.includes('Home Language'));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 12, color: '#666' }}>Loading institutions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>APS Calculator</Text>
        <Text style={styles.headerSubtitle}>Check what you qualify for</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.apsBox}>
          <Text style={styles.apsLabel}>Your APS Score</Text>
          <Text style={styles.apsScore}>{aps}</Text>
          <Text style={styles.apsNote}>
            {hasHomeLanguage? 'Based on your 6 best subjects + Life Orientation' : 'Select a Home Language first'}
          </Text>
        </View>

        {!hasHomeLanguage && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={styles.warningText}>Home Language is compulsory for university admission</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Enter Your Marks</Text>
        {subjects.map((subject, index) => (
          <View key={index} style={styles.subjectRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              {SUBJECTS.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateSubject(index, 'name', s)}
                  style={[styles.subjectChip, subject.name === s && styles.subjectChipActive]}
                >
                  <Text style={[styles.subjectChipText, subject.name === s && styles.subjectChipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.markInput}
              placeholder="%"
              keyboardType="numeric"
              maxLength={3}
              value={subject.mark? String(subject.mark) : ''}
              onChangeText={(v) => updateSubject(index, 'mark', v)}
            />
            {subjects.length > 3 && (
              <TouchableOpacity onPress={() => removeSubject(index)}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity onPress={addSubject} style={styles.addBtn} disabled={subjects.length >= 8}>
          <Ionicons name="add-circle-outline" size={20} color="#8B0000" />
          <Text style={styles.addBtnText}>Add Subject (Max 8)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={calculateAPS} style={styles.calcBtn}>
          <Text style={styles.calcBtnText}>Calculate APS</Text>
        </TouchableOpacity>

        {aps > 0 && (
          <>
            <Text style={styles.sectionTitle}>You Qualify For ({qualifying.length})</Text>
            {qualifying.map((q, i) => (
              <View key={i} style={[styles.qualCard, { borderLeftColor: q.color || '#8B0000' }]}>
                <Text style={styles.qualInst}>{q.institution}</Text>
                <Text style={styles.qualFaculty}>{q.faculty} - APS {q.apsRequired}</Text>
                <Text style={styles.qualDegrees}>{q.degrees}</Text>
              </View>
            ))}
            {qualifying.length === 0 && (
              <Text style={styles.noQual}>No qualifications found with APS {aps}. Try TVET colleges - they accept APS 20+.</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, borderBottomWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#8B0000' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#f3f4f6', marginTop: 4 },
  content: { padding: 16 },
  apsBox: { backgroundColor: '#8B0000', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  apsLabel: { color: '#f3f4f6', fontSize: 14 },
  apsScore: { color: '#fff', fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
  apsNote: { color: '#f3f4f6', fontSize: 12, textAlign: 'center' },
  warningBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  warningText: { color: '#dc2626', fontSize: 13, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  subjectPicker: { flex: 1 },
  subjectChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#ddd', marginRight: 6 },
  subjectChipActive: { backgroundColor: '#8B0000', borderColor: '#8B0000' },
  subjectChipText: { fontSize: 11, color: '#333' },
  subjectChipTextActive: { color: '#fff', fontWeight: '600' },
  markInput: { width: 60, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, textAlign: 'center', fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderWidth: 1, borderColor: '#8B0000', borderRadius: 8, borderStyle: 'dashed', marginBottom: 16 },
  addBtnText: { color: '#8B0000', fontWeight: '600' },
  calcBtn: { backgroundColor: '#8B0000', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 20 },
  calcBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  qualCard: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4 },
  qualInst: { fontWeight: 'bold', fontSize: 15 },
  qualFaculty: { color: '#666', fontSize: 13, marginTop: 2 },
  qualDegrees: { color: '#333', fontSize: 13, marginTop: 4 },
  noQual: { color: '#666', textAlign: 'center', padding: 20, fontStyle: 'italic' }
});