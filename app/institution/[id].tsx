import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import DataService from '../services/dataService';

// Report component - always at the bottom
const ReportWrongInfo = ({ institution }: { institution: any }) => {
  const handleReport = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email not available', 'Email is not set up on this device');
      return;
    }

    await MailComposer.composeAsync({
      recipients: ['support@campuscompass.co.za'],
      subject: `Report: Incorrect info for ${institution.name}`,
      body: `Institution: ${institution.name} (${institution.id})\nProvince: ${institution.province}\nCity: ${institution.city}\n\nWhat needs to be corrected?\n\n---\nPlease describe the issue here.`,
    });
  };

  return (
    <TouchableOpacity 
      onPress={handleReport}
      style={{ 
        backgroundColor: '#f3f4f6', 
        padding: 12, 
        borderRadius: 8, 
        marginTop: 24, 
        marginBottom: 32, 
        marginHorizontal: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb'
      }}
    >
      <Ionicons name="flag-outline" size={18} color="#6b7280" />
      <Text style={{ color: '#6b7280', marginLeft: 8, fontWeight: '500' }}>
        Report incorrect information
      </Text>
    </TouchableOpacity>
  );
};

export default function InstitutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstitution();
  }, [id]);

  const loadInstitution = async () => {
    await DataService.init();
    const all = DataService.getAllInstitutions();
    const found = all.find(i => i.id === id);
    setInstitution(found);
    setLoading(false);
  };

  const handleCall = async (number: string) => {
    if (!number) {
      Alert.alert('No number', 'No contact number available');
      return;
    }
    const telUrl = `tel:${number.replace(/\s/g, '')}`;
    const supported = await Linking.canOpenURL(telUrl);
    if (supported) {
      Linking.openURL(telUrl);
    } else {
      Alert.alert('Error', 'Cannot open phone dialer');
    }
  };
  
  const handleWebsite = async (url: string) => {
    if (!url || url === 'undefined' || url === 'TBA' || url === '') {
      Alert.alert('No link', 'This institution has no link available');
      return;
    }

    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      finalUrl = `https://${url}`;
    }

    const supported = await Linking.canOpenURL(finalUrl);
    if (supported) {
      Linking.openURL(finalUrl);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 24 }}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ 
            position: 'absolute', 
            top: 48, 
            left: 16, 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: 'white', 
            paddingHorizontal: 16, 
            paddingVertical: 8, 
            borderRadius: 8,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#000" />
          <Text style={{ marginLeft: 8, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: '#374151' }}>
          Institution not found
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
          Go back and select an institution from the list
        </Text>
      </View>
    );
  }

  const primaryColor = institution.primaryColor || '#8B0000';
  const hasWebsite = institution.website && institution.website !== 'TBA' && institution.website !== '';
  const hasApply = institution.apply_link && institution.apply_link !== 'TBA' && institution.apply_link !== '';
  const hasPortal = institution.student_portal && institution.student_portal !== 'TBA' && institution.student_portal !== '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen 
        options={{ 
          title: institution.shortName || institution.name,
          headerStyle: { backgroundColor: primaryColor },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8, padding: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )
        }} 
      />
      
      {/* Header Card */}
      <View style={{ padding: 24, backgroundColor: primaryColor }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
          {institution.name}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {institution.city || institution.location}, {institution.province}
        </Text>
        {institution.type && (
          <View style={{ 
            alignSelf: 'flex-start', 
            backgroundColor: 'rgba(255,255,255,0.25)', 
            paddingHorizontal: 10, 
            paddingVertical: 4, 
            borderRadius: 12, 
            marginTop: 8 
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>
              {institution.type}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions - shows Apply AND iEnabler separately */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {hasWebsite && (
            <TouchableOpacity 
              onPress={() => handleWebsite(institution.website)}
              style={{ 
                flex: 1, 
                minWidth: '48%',
                backgroundColor: 'white', 
                padding: 16, 
                borderRadius: 8, 
                borderWidth: 1, 
                borderColor: '#e5e7eb', 
                alignItems: 'center' 
              }}
            >
              <Ionicons name="globe-outline" size={24} color={primaryColor} />
              <Text style={{ marginTop: 8, fontWeight: '600' }}>Website</Text>
            </TouchableOpacity>
          )}

          {hasApply && (
            <TouchableOpacity 
              onPress={() => handleWebsite(institution.apply_link)}
              style={{ 
                flex: 1, 
                minWidth: '48%',
                backgroundColor: '#2563eb', 
                padding: 16, 
                borderRadius: 8, 
                alignItems: 'center' 
              }}
            >
              <Ionicons name="document-text-outline" size={24} color="white" />
              <Text style={{ marginTop: 8, fontWeight: '600', color: 'white' }}>Apply Now</Text>
            </TouchableOpacity>
          )}

          {hasPortal && (
            <TouchableOpacity 
              onPress={() => handleWebsite(institution.student_portal)}
              style={{ 
                flex: 1, 
                minWidth: '48%',
                backgroundColor: '#059669', 
                padding: 16, 
                borderRadius: 8, 
                alignItems: 'center' 
              }}
            >
              <Ionicons name="school-outline" size={24} color="white" />
              <Text style={{ marginTop: 8, fontWeight: '600', color: 'white' }}>iEnabler Portal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Application Dates */}
      <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Application Dates</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#6b7280' }}>Opens</Text>
          <Text style={{ fontWeight: '600' }}>
            {institution.applications_open || 'Check website'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#6b7280' }}>Closes</Text>
          <Text style={{ fontWeight: '600', color: '#dc2626' }}>
            {institution.applications_close || 'Check website'}
          </Text>
        </View>
      </View>

      {/* Faculties & APS */}
      {(institution.faculties || institution.aps_requirements) && (
        <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            Faculties & APS Requirements
          </Text>
          {Object.entries(institution.faculties || institution.aps_requirements || {}).map(([faculty, data]: [string, any]) => (
            <View key={faculty} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12 }}>
              <Text style={{ fontWeight: '600', color: '#1f2937' }}>{faculty}</Text>
              <Text style={{ color: '#2563eb', fontWeight: 'bold', marginTop: 4 }}>
                APS: {data.aps || data}+
              </Text>
              {data.subjects && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Required Subjects:</Text>
                  {Object.entries(data.subjects).map(([subject, level]: [string, any]) => (
                    <Text key={subject} style={{ color: '#374151', fontSize: 14, marginLeft: 8 }}>
                      - {subject}: Level {level}
                    </Text>
                  ))}
                </View>
              )}
              {data.degrees && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>Degrees:</Text>
                  <Text style={{ color: '#374151', fontSize: 14, marginLeft: 8 }}>
                    {data.degrees.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {institution.prospectus_link && institution.prospectus_link !== 'TBA' && (
            <TouchableOpacity onPress={() => handleWebsite(institution.prospectus_link)}>
              <Text style={{ color: '#2563eb', fontWeight: '600', marginTop: 8 }}>
                View Full Prospectus →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Emergency Contact */}
      {(institution.security_phone || institution.medical_phone) && (
        <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: '#991b1b' }}>
            24/7 Emergency Contacts
          </Text>
          {institution.security_phone && (
            <TouchableOpacity 
              onPress={() => handleCall(institution.security_phone)} 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
            >
              <Ionicons name="shield-checkmark" size={20} color="#dc2626" />
              <Text style={{ marginLeft: 8, color: '#991b1b', fontWeight: '600' }}>
                Security: {institution.security_phone}
              </Text>
            </TouchableOpacity>
          )}
          {institution.medical_phone && (
            <TouchableOpacity 
              onPress={() => handleCall(institution.medical_phone)} 
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="medkit" size={20} color="#dc2626" />
              <Text style={{ marginLeft: 8, color: '#991b1b', fontWeight: '600' }}>
                Medical: {institution.medical_phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contact Info */}
      {(institution.email || institution.phone) && (
        <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Contact</Text>
          {institution.email && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text style={{ marginLeft: 8, color: '#374151' }}>{institution.email}</Text>
            </View>
          )}
          {institution.phone && (
            <TouchableOpacity onPress={() => handleCall(institution.phone)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <Text style={{ marginLeft: 8, color: '#374151' }}>{institution.phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* REPORT BUTTON - ALWAYS AT THE BOTTOM */}
      <ReportWrongInfo institution={institution} />
    </ScrollView>
  );
}