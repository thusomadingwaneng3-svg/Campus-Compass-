import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Linking, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/8B0000/FFD700?text=University';

export default function AccommodationScreen() {
  const [accommodation, setAccommodation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [imagesMap, setImagesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadAccommodation();
  }, []);

  const loadAccommodation = async () => {
    try {
      const res = await fetch('/data/accommodation.json');
      if (res.ok) {
        const data = await res.json();
        setAccommodation(data);
        await loadImages(data);
      }
    } catch (e) {
      console.log('Failed to load accommodation:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (data: any[]) => {
    const imgMap: Record<string, string[]> = {};
    const toFetch = data.slice(0, 8);

    if (Platform.OS === 'web') {
      // Web: fetch real images via proxy
      await Promise.all(
        toFetch.map(async (item) => {
          try {
            const res = await fetch(
              `/api/google-places?q=${encodeURIComponent(item.institution + ' South Africa')}`
            );
            
            if (!res.ok) return;
            
            const json = await res.json();
            if (json.results?.[0]?.images) {
              imgMap[item.institution] = json.results[0].images;
            }
          } catch (e) {
            console.log('Image fetch failed for', item.institution, e);
          }
        })
      );
    } else {
      // Mobile: use placeholder
      toFetch.forEach(item => {
        imgMap[item.institution] = [PLACEHOLDER_IMAGE];
      });
    }

    setImagesMap(imgMap);
  };

  const openInMaps = async (institution: string, province: string) => {
    try {
      const query = encodeURIComponent(`${institution} ${province} South Africa`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'Failed to open maps');
    }
  };

  const filtered = accommodation.filter(item => {
    const matchesSearch = item.institution.toLowerCase().includes(search.toLowerCase()) ||
                          item.province.toLowerCase().includes(search.toLowerCase());
    const matchesProvince = selectedProvince === 'All' || item.province === selectedProvince;
    return matchesSearch && matchesProvince;
  });

  const provinces = ['All',...Array.from(new Set(accommodation.map(i => i.province)))];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen options={{
        title: 'Residences & Accommodation',
        headerStyle: { backgroundColor: '#8B0000' },
        headerTintColor: '#FFD700'
      }} />

      <View style={{ padding: 16 }}>
        <TextInput
          style={{ backgroundColor: 'white', padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#DDD', marginBottom: 12 }}
          placeholder="Search institution, province..."
          value={search}
          onChangeText={setSearch}
        />

        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E5E7EB', padding: 12, borderRadius: 12, marginBottom: 16 }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ fontWeight: '600' }}>{selectedProvince}</Text>
          <Ionicons name="chevron-down" size={20} color="#374151" />
        </TouchableOpacity>

        <Text style={{ color: '#6b7280', marginBottom: 12 }}>{filtered.length} residences found</Text>

        {filtered.map((item, idx) => (
          <View key={idx} style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#111827' }}>{item.institution}</Text>
                <Text style={{ color: '#6b7280', marginTop: 4 }}>{item.province} • {item.type}</Text>
              </View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B0000', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 5 }}
                onPress={() => openInMaps(item.institution, item.province)}
              >
                <Ionicons name="map" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Maps</Text>
              </TouchableOpacity>
            </View>

            {imagesMap[item.institution] && imagesMap[item.institution].length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {imagesMap[item.institution].map((url, i) => (
                  <Image 
                    key={i} 
                    source={{ uri: url }} 
                    style={{ width: 200, height: 130, marginRight: 8, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            <View style={{ marginTop: 12 }}>
              {item.residences.map((res: any, i: number) => (
                <View key={i} style={{ borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 12, marginTop: 12 }}>
                  <Text style={{ fontWeight: '600', color: '#1f2937' }}>{res.name}</Text>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{res.gender} • {res.roomType}</Text>
                  {res.price && <Text style={{ color: '#059669', fontWeight: '600', marginTop: 4 }}>{res.price}</Text>}

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    {res.contact && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${res.contact}`)}>
                        <Text style={{ color: '#2563eb' }}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {res.applyLink && (
                      <TouchableOpacity onPress={() => Linking.openURL(res.applyLink)}>
                        <Text style={{ color: '#2563eb' }}>Apply →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}