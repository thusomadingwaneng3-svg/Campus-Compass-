import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { universities, tvetColleges, Course, SAInstitution } from '../data/saInstitutions';

type Subject = {
  name: string;
  level: number;
};

const ALL_SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Accounting', 'Business Studies', 'Economics', 'Geography', 'History',
  'English Home Language', 'Afrikaans', 'IsiZulu', 'IsiXhosa', 'Sepedi',
  'Agricultural Sciences', 'Information Technology', 'Computer Applications Technology',
  'Engineering Graphics & Design', 'Consumer Studies', 'Tourism', 'Dramatic Arts'
];

export default function APSScreen() {
  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'English Home Language', level: 0 },
    { name: 'Mathematics', level: 0 },
  ]);
  const [apsScore, setApsScore] = useState<number | null>(null);
  const [eligible, setEligible] = useState<{uni: SAInstitution, course: Course}[]>([]);
  const [showResults, setShowResults] = useState(false);

  const calculateAPS = () => {
    // APS = sum of 6 best subjects, excluding Life Orientation
    const validSubjects = subjects.filter(s => s.level > 0 && s.name!== 'Life Orientation');

    if (validSubjects.length < 4) {
      Alert.alert('Need More Subjects', 'Enter at least 4 subjects with levels 1-7');
      return;
    }

    const sorted = validSubjects.sort((a, b) => b.level - a.level);
    const top6 = sorted.slice(0, 6);
    const score = top6.reduce((sum, s) => sum + s.level, 0);
    setApsScore(score);

    // Find eligible courses
    const allInstitutions = [...universities,...tvetColleges];
    const matches: {uni: SAInstitution, course: Course}[] = [];

    allInstitutions.forEach(uni => {
      uni.courses?.forEach(course => {
        if (score >= course.minAPS) {
          // Check subject requirements
          const meetsSubjects = course.subjects?.every(req => {
            const userSubject = subjects.find(s => s.name === req.name);
            return userSubject && userSubject.level >= req.minLevel;
          })?? true;

          if (meetsSubjects) {
            matches.push({ uni, course });
          }
        }
      });
    });

    setEligible(matches.sort((a, b) => b.course.minAPS - a.course.minAPS));
    setShowResults(true);
  };

  const updateSubject = (index: number, field: 'name' | 'level', value: string | number) => {
    const newSubjects = [...subjects];
    if (field === 'name') {
      newSubjects[index].name = value as string;
    } else {
      const level = Math.max(0, Math.min(7, Number(value)));
      newSubjects[index].level = level;
    }
    setSubjects(newSubjects);
  };

  const addSubject = () => {
    if (subjects.length < 7) {
      setSubjects([...subjects, { name: ALL_SUBJECTS[0], level: 0 }]);
    }
  };

  const removeSubject = (index: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i!== index));
    }
  };

  const reset = () => {
    setSubjects([
      { name: 'English Home Language', level: 0 },
      { name: 'Mathematics', level: 0 },
    ]);
    setApsScore(null);
    setEligible([]);
    setShowResults(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#E0D6FF', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          APS Calculator 🧮
        </Text>
        <Text style={{ color: '#A78BFA', marginBottom: 16 }}>
          Enter your Matric results to see what you qualify for
        </Text>

        {!showResults? (
          <>
            {subjects.map((subject, index) => (
              <View key={index} style={{
                backgroundColor: '#1A1A1A',
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#7C3AED'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    {ALL_SUBJECTS.map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => updateSubject(index, 'name', s)}
                        style={{
                          backgroundColor: subject.name === s? '#7C3AED' : '#2A2A2A',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          marginRight: 8
                        }}>
                        <Text style={{ color: subject.name === s? '#FFF' : '#A78BFA', fontSize: 12 }}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {subjects.length > 1 && (
                    <TouchableOpacity onPress={() => removeSubject(index)} style={{ marginLeft: 8 }}>
                      <Text style={{ color: '#EF4444', fontSize: 20 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: '#CCC', marginRight: 12 }}>Level:</Text>
                  {[1,2,3,4,5,6,7].map(level => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => updateSubject(index, 'level', level)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: subject.level === level? '#10B981' : '#2A2A2A',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 8
                      }}>
                      <Text style={{ color: subject.level === level? '#FFF' : '#A78BFA', fontWeight: 'bold' }}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {subjects.length < 7 && (
              <TouchableOpacity
                onPress={addSubject}
                style={{
                  backgroundColor: '#1A1A1A',
                  padding: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#7C3AED',
                  borderStyle: 'dashed',
                  marginBottom: 16
                }}>
                <Text style={{ color: '#7C3AED', textAlign: 'center', fontWeight: 'bold' }}>
                  + Add Subject
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={calculateAPS}
              style={{ backgroundColor: '#10B981', padding: 18, borderRadius: 12 }}>
              <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Calculate My APS 🎯
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{
              backgroundColor: '#1A1A1A',
              padding: 24,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: '#10B981'
            }}>
              <Text style={{ color: '#A78BFA', textAlign: 'center' }}>Your APS Score</Text>
              <Text style={{ color: '#10B981', fontSize: 48, fontWeight: 'bold', textAlign: 'center' }}>
                {apsScore}
              </Text>
              <Text style={{ color: '#CCC', textAlign: 'center', marginTop: 8 }}>
                You qualify for {eligible.length} programmes
              </Text>
            </View>

            <Text style={{ color: '#E0D6FF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
              Eligible Courses 👇
            </Text>

            {eligible.length === 0? (
              <View style={{ backgroundColor: '#1A1A1A', padding: 16, borderRadius: 8 }}>
                <Text style={{ color: '#F59E0B', textAlign: 'center' }}>
                  No matches found. Consider TVET colleges or bridging courses.
                </Text>
              </View>
            ) : (
              eligible.slice(0, 20).map(({ uni, course }, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => Linking.openURL(uni.website)}
                  style={{
                    backgroundColor: '#1A1A1A',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: '#7C3AED'
                  }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 16, flex: 1 }}>
                      {course.name}
                    </Text>
                    <Text style={{ color: '#F59E0B' }}>APS {course.minAPS}</Text>
                  </View>
                  <Text style={{ color: '#A78BFA', marginTop: 4 }}>{uni.shortName}</Text>
                  <Text style={{ color: '#CCC', fontSize: 12, marginTop: 4 }}>{uni.city}, {uni.province}</Text>
                  <Text style={{ color: '#7C3AED', marginTop: 8, fontWeight: 'bold' }}>
                    View on Website →
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              onPress={reset}
              style={{
                backgroundColor: '#1A1A1A',
                padding: 16,
                borderRadius: 8,
                marginTop: 16,
                borderWidth: 1,
                borderColor: '#7C3AED'
              }}>
              <Text style={{ color: '#7C3AED', textAlign: 'center', fontWeight: 'bold' }}>
                ← Calculate Again
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}