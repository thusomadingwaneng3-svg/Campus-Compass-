import { useState, useEffect } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, ScrollView, Pressable, Linking, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DataService from './services/dataService.ts';

export default function MapScreen() {
  const { uni } = useLocalSearchParams<{ uni?: string }>();
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await DataService.init();
        const data = DataService.getAllInstitutions().filter(i => i.id);
        setAllInstitutions(data);
      } catch (e) {
        console.error('Failed to load institutions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const found = uni ? allInstitutions.find(i => 
    i.id?.toLowerCase() === String(uni).toLowerCase() ||
    i.short?.toLowerCase() === String(uni).toLowerCase() || 
    i.name?.toLowerCase().includes(String(uni).toLowerCase())
  ) : null;

  // Map JSON fields to what the component expects
  const institution = found ? {
    ...found,
    lat: found.latitude,
    lng: found.longitude,
  } : null;

  const navigateToCampus = () => {
    if (!institution?.lat || !institution?.lng) {
      Alert.alert('No location', 'This institution has no coordinates');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${institution.lat},${institution.lng}`;
    Linking.openURL(url);
  };

  const handleCall = (number: string) => {
    if (!number) {
      Alert.alert('No number', 'No contact number available');
      return;
    }
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  };

  const handleWebsite = async (url: string) => {
    if (!url || url === 'undefined') {
      Alert.alert('No website', 'This institution has no website link');
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 12, color: '#666' }}>Loading campuses...</Text>
      </View>
    );
  }

  if (!uni) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Select a Campus</Text>
          <Text style={{ color: '#666', marginBottom: 20 }}>Found {allInstitutions.length} SA institutions:</Text>
          
          {allInstitutions.map(inst => (
            <Link 
              key={inst.id} 
              href={`/map?uni=${inst.id}`} 
              asChild
            >
              <Pressable style={{ 
                padding: 12, 
                borderWidth: 1, 
                borderColor: '#ddd', 
                borderRadius: 8, 
                marginBottom: 10,
                backgroundColor: '#fff'
              }}>
                <Text style={{ fontWeight: 'bold' }}>{inst.short || inst.name}</Text>
                <Text style={{ color: '#666', fontSize: 12 }}>
                  {inst.type || 'Tertiary'} • {inst.city || inst.province}
                </Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Campus "{uni}" not found.</Text>
        <Link href="/map" asChild>
          <Pressable>
            <Text style={{ color: '#007AFF', marginTop: 8 }}>Back to list</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const primaryColor = institution.primaryColor || '#8B0000';
  const contactNumber = institution.security_phone || institution.phone;
  const hasApply = !!institution.apply_link;
  const hasPortal = !!institution.student_portal?.url;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: primaryColor, padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          {institution.short || institution.name} COMPASS
        </Text>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {institution.city || institution.location}, {institution.province}
        </Text>
      </View>
      
      {Platform.OS === 'web' && institution.lat && institution.lng && (
        <iframe 
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${institution.lng-0.008},${institution.lat-0.008},${institution.lng+0.008},${institution.lat+0.008}&layer=mapnik&marker=${institution.lat},${institution.lng}`}
          style={{ width: '100%', height: 400, border: 'none' }}
        />
      )}

      <View style={{ padding: 20, gap: 12 }}>
        {institution.lat && institution.lng && (
          <Pressable 
            onPress={navigateToCampus}
            style={{ 
              backgroundColor: '#10b981', 
              padding: 15, 
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: 'bold' }}>NAVIGATE TO CAMPUS</Text>
          </Pressable>
        )}

        {hasApply && (
          <Pressable 
            onPress={() => handleWebsite(institution.apply_link)}
            style={{ 
              backgroundColor: '#2563eb', 
              padding: 15, 
              borderRadius: 8 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>APPLY NOW</Text>
          </Pressable>
        )}

        {hasPortal && (
          <Pressable 
            onPress={() => handleWebsite(institution.student_portal.url)}
            style={{ 
              backgroundColor: '#059669', 
              padding: 15, 
              borderRadius: 8 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>iENABLER PORTAL</Text>
          </Pressable>
        )}

        {contactNumber && (
          <Pressable 
            onPress={() => handleCall(contactNumber)}
            style={{ 
              backgroundColor: primaryColor, 
              padding: 15, 
              borderRadius: 8 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              📞 CALL CAMPUS SECURITY{'\n'}{contactNumber}
            </Text>
          </Pressable>
        )}

        {institution.website && (
          <Pressable 
            onPress={() => handleWebsite(institution.website)}
            style={{ 
              backgroundColor: '#f3f4f6', 
              padding: 15, 
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#d1d5db'
            }}
          >
            <Text style={{ color: '#111827', textAlign: 'center', fontWeight: 'bold' }}>🌐 Visit Website</Text>
          </Pressable>
        )}

        <Link href="/map" asChild>
          <Pressable>
            <Text style={{ textAlign: 'center', marginTop: 4, color: '#007AFF' }}>← All Campuses</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}