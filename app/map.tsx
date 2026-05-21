import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, ScrollView, Pressable, Linking, Platform, ActivityIndicator, Alert, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DataService from './services/dataService';

export default function MapScreen() {
  const { uni } = useLocalSearchParams<{ uni?: string }>();
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        await DataService.init();

        const raw = DataService.getAllInstitutions();
        console.log('Raw institutions:', raw.length);

        // Only show institutions with coords for map view
        const data = raw.filter(i => i.id && i.lat && i.lng);
        console.log('Filtered with coords:', data.length);

        setAllInstitutions(data);
      } catch (e) {
        console.error('Failed to load institutions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = allInstitutions.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.shortName?.toLowerCase().includes(q) ||
      i.city?.toLowerCase().includes(q) ||
      i.province?.toLowerCase().includes(q) ||
      i.country?.toLowerCase().includes(q)
    );
  });

  const found = uni ? allInstitutions.find(i => 
    i.id?.toLowerCase() === String(uni).toLowerCase() ||
    i.shortName?.toLowerCase() === String(uni).toLowerCase() || 
    i.name?.toLowerCase().includes(String(uni).toLowerCase())
  ) : null;

  const institution = found || null;

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
    if (!url || url === 'TBA') {
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

  const renderItem = ({ item }: { item: any }) => (
    <Link key={item.id} href={`/map?uni=${item.id}`} asChild>
      <Pressable style={{ 
        padding: 14, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 10, 
        marginBottom: 10,
        backgroundColor: '#fff'
      }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.shortName || item.name}</Text>
        <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
          {item.type || 'Tertiary'} • {item.city || item.province}
          {item.country && item.country!== 'South Africa'? `, ${item.country}` : ''}
        </Text>
      </Pressable>
    </Link>
  );

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
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e5e5e5' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Select a Campus</Text>
          <Text style={{ color: '#666', marginBottom: 12 }}>
            Found {allInstitutions.length} institutions
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color="#666" />
            <TextInput
              placeholder="Search campus, city, province, country..."
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, padding: 10, fontSize: 15 }}
              placeholderTextColor="#999"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </Pressable>
            )}
          </View>
        </View>
        
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>
              No campuses found
            </Text>
          }
        />
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, marginTop: 12 }}>Campus "{uni}" not found</Text>
        <Link href="/map" asChild>
          <Pressable style={{ marginTop: 16, padding: 12, backgroundColor: '#8B0000', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Back to list</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const primaryColor = institution.primaryColor || '#8B0000';
  const contactNumber = institution.security_phone || institution.phone;
  const hasApply = institution.apply_link && institution.apply_link !== 'TBA' && institution.apply_link !== '';
  const hasPortal = institution.student_portal && institution.student_portal !== 'TBA' && institution.student_portal !== '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: primaryColor, padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          {institution.shortName || institution.name}
        </Text>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 4, opacity: 0.9 }}>
          {institution.city || institution.location}, {institution.province}
          {institution.country && institution.country!== 'South Africa'? `, ${institution.country}` : ''}
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
              borderRadius: 10,
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
              borderRadius: 10 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>APPLY NOW</Text>
          </Pressable>
        )}

        {hasPortal && (
          <Pressable 
            onPress={() => handleWebsite(institution.student_portal)}
            style={{ 
              backgroundColor: '#059669', 
              padding: 15, 
              borderRadius: 10 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>STUDENT PORTAL</Text>
          </Pressable>
        )}

        {contactNumber && (
          <Pressable 
            onPress={() => handleCall(contactNumber)}
            style={{ 
              backgroundColor: primaryColor, 
              padding: 15, 
              borderRadius: 10 
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              📞 CALL SECURITY{'\n'}{contactNumber}
            </Text>
          </Pressable>
        )}

        {institution.website && institution.website !== 'TBA' && (
          <Pressable 
            onPress={() => handleWebsite(institution.website)}
            style={{ 
              backgroundColor: '#f3f4f6', 
              padding: 15, 
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#d1d5db'
            }}
          >
            <Text style={{ color: '#111827', textAlign: 'center', fontWeight: 'bold' }}>🌐 Visit Website</Text>
          </Pressable>
        )}

        <Link href="/map" asChild>
          <Pressable style={{ marginTop: 8 }}>
            <Text style={{ textAlign: 'center', color: '#007AFF', fontWeight: '600' }}>← All Campuses</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}