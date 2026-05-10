import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// remove this line:
// import knowledgeData from '../public/data/knowledge.json';

type Answers = {
  income: string;
  citizenship: string;
  institution_type: string;
  field_of_study: string;
};

export default function BursaryChecker() {
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    income: '',
    citizenship: '',
    institution_type: '',
    field_of_study: ''
  });
  const [knowledgeData, setKnowledgeData] = useState<any>({ bursaries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/public/data/knowledge.json');
        if (res.ok) {
          setKnowledgeData(await res.json());
        }
      } catch (e) {
        console.log('Failed to load knowledge.json:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const incomeOptions = [
    { label: 'Under R350,000', value: '350000' },
    { label: 'R350,000 - R600,000', value: '600000' },
    { label: 'R600,000 - R1,000,000', value: '1000000' },
    { label: 'Over R1,000,000', value: '9999' }
  ];

  const fieldOptions = [
    { label: 'All Fields', value: 'all' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Medicine/Health/Nursing', value: 'medicine' },
    { label: 'Teaching/Education', value: 'education' },
    { label: 'ICT/Computer Science/Data Science', value: 'ict' },
    { label: 'Finance/Accounting/Business', value: 'finance' },
    { label: 'Science/Mathematics/Chemistry', value: 'science' },
    { label: 'Law', value: 'law' },
    { label: 'Media/Communications', value: 'media' }
  ];

  const institutionOptions = [
    { label: 'Public University', value: 'public_university' },
    { label: 'Public TVET College', value: 'public_tvet' },
    { label: 'Private Institution', value: 'private' }
  ];

  const eligibleBursaries = useMemo(() => {
    if (step !== 5 || !knowledgeData.bursaries) return [];
    const userIncome = parseInt(answers.income);
    
    return knowledgeData.bursaries.filter(bursary => {
      const el = {
        max_income: bursary.income_threshold?.includes('R350,000') ? 350000 : 
                   bursary.income_threshold?.includes('R400,000') ? 400000 :
                   bursary.income_threshold?.includes('R500,000') ? 500000 :
                   bursary.income_threshold?.includes('R600,000') ? 600000 :
                   bursary.income_threshold?.includes('R1,000,000') ? 1000000 : 9999,
        citizenship: bursary.notes?.toLowerCase().includes('south african citizen') ? ['SA'] : ['SA', 'PR', 'FOREIGN'],
        institution_type: bursary.notes?.toLowerCase().includes('public') ? ['public_university', 'public_tvet'] : ['public_university', 'public_tvet', 'private'],
        field_of_study: (bursary.fields || []).map(f => f.toLowerCase().includes('all') ? 'all' : 
          f.toLowerCase().includes('engineering') ? 'engineering' :
          f.toLowerCase().includes('medicine') || f.toLowerCase().includes('nursing') ? 'medicine' :
          f.toLowerCase().includes('teaching') || f.toLowerCase().includes('education') ? 'education' :
          f.toLowerCase().includes('it') || f.toLowerCase().includes('computer') || f.toLowerCase().includes('data') ? 'ict' :
          f.toLowerCase().includes('finance') || f.toLowerCase().includes('accounting') ? 'finance' :
          f.toLowerCase().includes('science') || f.toLowerCase().includes('mathematics') || f.toLowerCase().includes('chemistry') ? 'science' :
          f.toLowerCase().includes('law') ? 'law' :
          f.toLowerCase().includes('media') || f.toLowerCase().includes('journalism') ? 'media' : 'all')
      };
      
      if (userIncome > el.max_income) return false;
      if (!el.citizenship.includes(answers.citizenship)) return false;
      if (!el.institution_type.includes(answers.institution_type)) return false;
      if (!el.field_of_study.includes('all') && !el.field_of_study.includes(answers.field_of_study)) return false;
      
      return bursary.status === 'open';
    });
  }, [step, answers, knowledgeData]);

  const reset = () => {
    setStep(1);
    setAnswers({ income: '', citizenship: '', institution_type: '', field_of_study: '' });
  };

  const renderQuestion = () => {
    if (loading) {
      return (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-600">Loading bursaries...</Text>
        </View>
      );
    }

    switch (step) {
      case 1:
        return (
          <>
            <Text className="text-lg font-bold mb-4">What is your household annual income?</Text>
            {incomeOptions.map(opt => (
              <TouchableOpacity 
                key={opt.value}
                onPress={() => { setAnswers({...answers, income: opt.value}); setStep(2); }}
                className="bg-gray-100 p-4 rounded-lg mb-3"
              >
                <Text>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      case 2:
        return (
          <>
            <Text className="text-lg font-bold mb-4">What is your citizenship?</Text>
            <TouchableOpacity onPress={() => { setAnswers({...answers, citizenship: 'SA'}); setStep(3); }} className="bg-gray-100 p-4 rounded-lg mb-3">
              <Text>South African Citizen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAnswers({...answers, citizenship: 'PR'}); setStep(3); }} className="bg-gray-100 p-4 rounded-lg mb-3">
              <Text>Permanent Resident</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAnswers({...answers, citizenship: 'FOREIGN'}); setStep(3); }} className="bg-gray-100 p-4 rounded-lg">
              <Text>Foreign National</Text>
            </TouchableOpacity>
          </>
        );
      case 3:
        return (
          <>
            <Text className="text-lg font-bold mb-4">What type of institution will you study at?</Text>
            {institutionOptions.map(opt => (
              <TouchableOpacity key={opt.value} onPress={() => { setAnswers({...answers, institution_type: opt.value}); setStep(4); }} className="bg-gray-100 p-4 rounded-lg mb-3">
                <Text>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      case 4:
        return (
          <>
            <Text className="text-lg font-bold mb-4">What field of study?</Text>
            {fieldOptions.map(opt => (
              <TouchableOpacity key={opt.value} onPress={() => { setAnswers({...answers, field_of_study: opt.value}); setStep(5); }} className="bg-gray-100 p-4 rounded-lg mb-3">
                <Text>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      case 5:
        return (
          <ScrollView>
            <View className="items-center mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
              <Text className="text-xl font-bold mt-2">Found {eligibleBursaries.length} Bursary{eligibleBursaries.length !== 1 ? 's' : ''}</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Based on your answers</Text>
            </View>
            
            {eligibleBursaries.length === 0 ? (
              <View className="items-center p-6">
                <Ionicons name="sad-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-600 text-center mt-2">No bursaries match your criteria. Try adjusting your answers.</Text>
              </View>
            ) : (
              eligibleBursaries.map(bursary => (
                <View key={bursary.id} className="bg-white p-4 rounded-lg mb-3 border-gray-200">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="font-bold text-lg">{bursary.name}</Text>
                      <Text className="text-gray-600 text-sm">{bursary.provider}</Text>
                      <Text className="text-blue-600 text-xs mt-1">{bursary.type}</Text>
                    </View>
                    <View className="bg-green-100 px-2 py-1 rounded">
                      <Text className="text-green-700 text-xs font-semibold">OPEN</Text>
                    </View>
                  </View>

                  <Text className="text-green-700 font-semibold mt-2">{bursary.covers.join(' • ')}</Text>
                  <Text className="text-red-600 text-sm mt-1">Deadline: {bursary.deadline}</Text>
                  <Text className="text-gray-500 text-xs mt-1">{bursary.income_threshold}</Text>
                  
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(bursary.apply_link)}
                    className="bg-blue-600 p-3 rounded-lg mt-3 flex-row justify-center items-center"
                  >
                    <Text className="text-white font-bold mr-2">Apply Now</Text>
                    <Ionicons name="open-outline" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            
            <TouchableOpacity onPress={reset} className="mt-4 p-3 border-gray-300 rounded-lg">
              <Text className="text-center font-semibold">Start Over</Text>
            </TouchableOpacity>
          </ScrollView>
        );
    }
  };

  return (
    <>
      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        className="bg-blue-600 p-4 rounded-lg mx-4 mt-4 flex-row items-center justify-center"
      >
        <Ionicons name="document-text" size={20} color="white" />
        <Text className="text-white font-bold ml-2">Check Bursary Eligibility</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-white p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold">Bursary Eligibility</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); reset(); }}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>
          
          {step < 5 && (
            <View className="h-2 bg-gray-200 rounded-full mb-6">
              <View className="h-2 bg-blue-600 rounded-full" style={{ width: `${(step / 4) * 100}%` }} />
            </View>
          )}

          {renderQuestion()}

          {step > 1 && step < 5 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} className="mt-4">
              <Text className="text-blue-600">← Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}