import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, ScrollView, Pressable, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import knowledge from '../public/data/knowledge.json';

export default function MapScreen() {
  const { uni } = useLocalSearchParams<{ uni?: string }>();
  
  const allInstitutions = [
    ...(knowledge.institutions || []),
    ...(knowledge.tvet_colleges || []),
    ...(knowledge.private_institutions || [])
  ];

  const institution = uni ? allInstitutions.find(i => 
    i.short?.toLowerCase() === String(uni).toLowerCase() || 
    i.name.toLowerCase().includes(String(uni).toLowerCase())
  ) : null;

  const navigateToCampus = () => {
    if (!institution) return;
    // Use exact GPS coords - 100% accurate
    const url = `https://www.google.com/maps/dir/?api=1&destination=${institution.latitude},${institution.longitude}`;
    Linking.openURL(url);
  };

  if (!uni) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Select a Campus</Text>
          <Text style={{ color: '#666', marginBottom: 20 }}>Found {allInstitutions.length} SA institutions:</Text>
          
          {allInstitutions.map(inst => (
            <Link key={inst.name} href={`/map?uni=${inst.short || inst.name.split(' ')[0]}`} asChild>
              <Pressable style={{ 
                padding: 12, 
                borderWidth: 1, 
                borderColor: '#ddd', 
                borderRadius: 8, 
                marginBottom: 10,
                backgroundColor: '#fff'
              }}>
                <Text style={{ fontWeight: 'bold' }}>{inst.short || inst.name}</Text>
                <Text style={{ color: '#666', fontSize: 12 }}>{inst.location}</Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!institution) return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Campus "{uni}" not found.</Text>
      <Link href="/map" asChild><Pressable><Text style={{ color: '#007AFF', marginTop: 8 }}>Back to list</Text></Pressable></Link>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: institution.primaryColor || '#8B0000', padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          {institution.short || institution.name} COMPASS
        </Text>
        <Text style={{ color: 'white', textAlign: 'center' }}>{institution.location}</Text>
      </View>
      
      {Platform.OS === 'web' && (
        <iframe 
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${institution.longitude-0.008},${institution.latitude-0.008},${institution.longitude+0.008},${institution.latitude+0.008}&layer=mapnik&marker=${institution.latitude},${institution.longitude}`}
          style={{ width: '100%', height: 400, border: 'none' }}
        />
      )}

      <View style={{ padding: 20, gap: 12 }}>
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
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            NAVIGATE TO CAMPUS
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => Linking.openURL(`tel:${institution.security_phone || institution.contact}`)}
          style={{ 
            backgroundColor: institution.primaryColor || '#8B0000', 
            padding: 15, 
            borderRadius: 8 
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            📞 CALL CAMPUS SECURITY{'\n'}{institution.security_phone || institution.contact}
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => Linking.openURL(institution.website)}
          style={{ 
            backgroundColor: '#f3f4f6', 
            padding: 15, 
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#d1d5db'
          }}
        >
          <Text style={{ color: '#111827', textAlign: 'center', fontWeight: 'bold' }}>
            🌐 Visit Website
          </Text>
        </Pressable>

        <Link href="/map" asChild>
          <Pressable><Text style={{ textAlign: 'center', marginTop: 4, color: '#007AFF' }}>← All Campuses</Text></Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}