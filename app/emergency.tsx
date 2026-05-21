import React, { useContext, useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CampusContext } from '../CampusContext';
import PassScreen from './pass'; // 1. Import the new screen

type Tab = 'sa' | 'africa-emergency' | 'africa-bursaries' | 'pass'; // 2. Add 'pass' to Tab type

type EmergencyNumber = {
  country: string;
  police: string;
  ambulance: string;
  fire: string;
  note?: string;
};

type Bursary = {
  id: string;
  name: string;
  provider: string;
  type: string;
  level: string[];
  institutions: string[];
  fields: string[];
  income_threshold: string;
  covers: string[];
  deadline: string;
  status: string;
  apply_link: string;
  requirements: string;
  notes: string;
  country: string;
};

export default function EmergencyHub() {
  const { allCampuses } = useContext(CampusContext);
  const [tab, setTab] = useState<Tab>('sa');
  const [search, setSearch] = useState('');
  const [bursarySearch, setBursarySearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [expandedNational, setExpandedNational] = useState<Record<string, boolean>>({});
  const [expandAllNational, setExpandAllNational] = useState(false);

  const [africanEmergencyNumbers, setAfricanEmergencyNumbers] = useState<EmergencyNumber[]>([]);
  const [nonSABursaries, setNonSABursaries] = useState<Bursary[]>([]);
  const [saBursaries, setSaBursaries] = useState<Bursary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [emergencyRes, africaBursaryRes, saBursaryRes] = await Promise.all([
          fetch('/data/africa_emergency.json'),
          fetch('/data/africa_bursaries.json'),
          fetch('/data/funding.json')
        ]);

        if (emergencyRes.ok) {
          setAfricanEmergencyNumbers(await emergencyRes.json());
        }
        if (africaBursaryRes.ok) {
          const data = await africaBursaryRes.json();
          setNonSABursaries(data.map((b: any) => ({...b, country: b.notes || 'Africa' })));
        }
        if (saBursaryRes.ok) {
          const data = await saBursaryRes.json();
          setSaBursaries(data.map((b: any) => ({...b, country: 'South Africa' })));
        }
      } catch (e) {
        console.log('Failed to load data:', e);
        Alert.alert('Error', 'Failed to load data. Check your connection.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const allBursaries = useMemo(() => [...saBursaries,...nonSABursaries], [saBursaries, nonSABursaries]);

  const filtered = useMemo(() => allCampuses.filter(inst =>
    inst.name.toLowerCase().includes(search.toLowerCase()) ||
    (inst.short && inst.short.toLowerCase().includes(search.toLowerCase())) ||
    (inst.city || inst.location || '').toLowerCase().includes(search.toLowerCase())
  ), [allCampuses, search]);

  const filteredBursaries = useMemo(() => {
    return allBursaries.filter(b => {
      const matchesSearch =
        b.name.toLowerCase().includes(bursarySearch.toLowerCase()) ||
        b.provider.toLowerCase().includes(bursarySearch.toLowerCase()) ||
        b.fields.some(f => f.toLowerCase().includes(bursarySearch.toLowerCase()));

      const matchesCountry = countryFilter === 'All' || b.country.includes(countryFilter) || b.notes.includes(countryFilter);

      return matchesSearch && matchesCountry;
    });
  }, [allBursaries, bursarySearch, countryFilter]);

  const countries = useMemo(() => {
    const set = new Set<string>(['South Africa']);
    nonSABursaries.forEach(b => {
      if (b.notes.includes('Nigeria')) set.add('Nigeria');
      if (b.notes.includes('Ghana')) set.add('Ghana');
      if (b.notes.includes('Uganda')) set.add('Uganda');
      if (b.notes.includes('Kenya')) set.add('Kenya');
      if (b.notes.includes('Mauritius')) set.add('Mauritius');
      if (b.notes.includes('EAC')) set.add('East Africa');
      if (b.notes.includes('SADC')) set.add('Southern Africa');
      if (b.notes.includes('ECOWAS')) set.add('West Africa');
    });
    return ['All',...Array.from(set)];
  }, [nonSABursaries]);

  const call = (num: string | undefined) => {
    if (!num) return;
    const cleanNum = num.split('/')[0].replace(/\s/g, '');
    Linking.openURL(`tel:${cleanNum}`);
  };

  const openURL = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot open URL');
  };

  const handlePanicCall = (campus: any) => {
    const num = campus.security_phone || campus.contact || campus.emergency?.security;
    call(num);
  };

  const handleEmail = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleNavigate = (campus: any) => {
    const lat = campus.lat || campus.latitude;
    const lng = campus.lng || campus.longitude;
    if (!lat ||!lng) {
      Alert.alert('No location', 'This campus has no coordinates');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const toggleNational = (id: string) => {
    setExpandedNational(prev => ({...prev, [id]:!prev[id]}));
  };

  const handleMassAlert = () => {
    Alert.alert(
      'Mass Emergency Alert',
      `This will SMS the first 10 campus security numbers out of ${allCampuses.length} total. Only use in a REAL emergency affecting multiple campuses.\n\nNote: Phone carriers limit SMS to ~10 recipients. For true mass alert you need backend SMS API.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND ALERT',
          style: 'destructive',
          onPress: () => {
            const allNumbers = allCampuses
         .map(i => i.security_phone || i.contact || i.emergency?.security)
         .filter(Boolean)
         .slice(0, 10)
         .join(',');
            const message = `EMERGENCY: Campus Compass mass alert triggered at ${new Date().toLocaleTimeString()}. Check app for details.`;
            Linking.openURL(`sms:${allNumbers}?body=${encodeURIComponent(message)}`);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />

      <View style={styles.header}>
        <Ionicons name="warning" size={28} color="#FFD700" />
        <Text style={styles.headerText}>EMERGENCY HUB</Text>
        <Ionicons name="warning" size={28} color="#FFD700" />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'sa' && styles.tabActive]}
          onPress={() => setTab('sa')}
        >
          <Ionicons name="school" size={18} color={tab === 'sa'? '#8B0000' : '#666'} />
          <Text style={[styles.tabText, tab === 'sa' && styles.tabTextActive]}>SA Campuses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'africa-emergency' && styles.tabActive]}
          onPress={() => setTab('africa-emergency')}
        >
          <Ionicons name="medkit" size={18} color={tab === 'africa-emergency'? '#8B0000' : '#666'} />
          <Text style={[styles.tabText, tab === 'africa-emergency' && styles.tabTextActive]}>Africa Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'africa-bursaries' && styles.tabActive]}
          onPress={() => setTab('africa-bursaries')}
        >
          <Ionicons name="school-outline" size={18} color={tab === 'africa-bursaries'? '#8B0000' : '#666'} />
          <Text style={[styles.tabText, tab === 'africa-bursaries' && styles.tabTextActive]}>Bursaries</Text>
        </TouchableOpacity>

        {/* 3. Add Pass Tab */}
        <TouchableOpacity
          style={[styles.tab, tab === 'pass' && styles.tabActive]}
          onPress={() => setTab('pass')}
        >
          <Ionicons name="shield-checkmark" size={18} color={tab === 'pass'? '#8B0000' : '#666'} />
          <Text style={[styles.tabText, tab === 'pass' && styles.tabTextActive]}>My Pass</Text>
        </TouchableOpacity>
      </View>

      {/* SA Campus Tab */}
      {tab === 'sa' && (
        <>
          <View style={styles.subHeader}>
            <Text style={styles.count}>{allCampuses.length} Institutions Ready</Text>
            <TouchableOpacity onPress={() => setExpandAllNational(!expandAllNational)}>
              <Text style={styles.expandAllText}>
                {expandAllNational? 'Collapse All' : 'Expand All'} National Numbers
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.massPanic} onPress={handleMassAlert}>
            <Ionicons name="megaphone" size={24} color="white" />
            <Text style={styles.massPanicText}>🚨 MASS PANIC ALERT 🚨</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.search}
            placeholder="Search 94 institutions by name or city..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </>
      )}

      {/* Bursary Filters */}
      {tab === 'africa-bursaries' && (
        <>
          <TextInput
            style={styles.search}
            placeholder="Search bursaries, field, provider..."
            placeholderTextColor="#999"
            value={bursarySearch}
            onChangeText={setBursarySearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {countries.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, countryFilter === c && styles.filterChipActive]}
                onPress={() => setCountryFilter(c)}
              >
                <Text style={[styles.filterChipText, countryFilter === c && styles.filterChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* 4. Render Pass Screen when selected */}
      {tab === 'pass' && <PassScreen />}

      {/* Main ScrollView only shows for other tabs */}
      {tab!== 'pass' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >

          {/* SA Campuses */}
          {tab === 'sa' && filtered.map((campus) => {
            const showNational = expandAllNational || expandedNational[campus.id];
            const city = campus.city || campus.location;
            const securityNum = campus.security_phone || campus.contact || campus.emergency?.security;
            const medicalNum = campus.medical_phone || campus.emergency?.medical;

            return (
              <View key={campus.id} style={[styles.card, { borderLeftColor: campus.primaryColor || '#8B0000' }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{campus.short || campus.name}</Text>
                    <Text style={styles.fullName}>{campus.name}</Text>
                    <Text style={styles.city}>{city}, {campus.province}</Text>
                  </View>
                  <View style={[styles.colorDot, { backgroundColor: campus.primaryColor || '#8B0000' }]} />
                </View>

                {securityNum && (
                  <TouchableOpacity style={[styles.btn, styles.red]} onPress={() => handlePanicCall(campus)}>
                    <Ionicons name="call" size={18} color="white" />
                    <Text style={styles.btnText}>Security: {securityNum}</Text>
                  </TouchableOpacity>
                )}

                {medicalNum && (
                  <TouchableOpacity style={[styles.btn, styles.orange]} onPress={() => call(medicalNum)}>
                    <Ionicons name="medical" size={18} color="white" />
                    <Text style={styles.btnText}>Medical: {medicalNum}</Text>
                  </TouchableOpacity>
                )}

                {(campus.lat || campus.latitude) && (
                  <TouchableOpacity style={[styles.btn, styles.blue]} onPress={() => handleNavigate(campus)}>
                    <Ionicons name="navigate" size={18} color="white" />
                    <Text style={styles.btnText}>Navigate to Campus</Text>
                  </TouchableOpacity>
                )}

                {campus.email && (
                  <TouchableOpacity style={[styles.btn, styles.green]} onPress={() => handleEmail(campus.email)}>
                    <Ionicons name="mail" size={18} color="white" />
                    <Text style={styles.btnText}>{campus.email}</Text>
                  </TouchableOpacity>
                )}

                {campus.emergency?.national && Object.keys(campus.emergency.national).length > 0 && (
                  <View style={styles.nationalBox}>
                    <TouchableOpacity
                      style={styles.nationalHeader}
                      onPress={() => toggleNational(campus.id)}
                    >
                      <Text style={styles.nationalTitle}>National Emergency Numbers</Text>
                      <Ionicons name={showNational? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>

                    {showNational && (
                      <View style={styles.nationalGrid}>
                        {Object.entries(campus.emergency.national).map(([key, num]) => (
                          <TouchableOpacity key={key} style={styles.nationalBtn} onPress={() => call(num as string)}>
                            <Text style={styles.nationalLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                            <Text style={styles.nationalNum}>{num as string}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Africa Emergency Numbers */}
          {tab === 'africa-emergency' && africanEmergencyNumbers.map((item) => (
            <View key={item.country} style={styles.africaCard}>
              <Text style={styles.africaCountry}>{item.country}</Text>
              <View style={styles.africaRow}>
                {item.police && (
                  <TouchableOpacity onPress={() => call(item.police)}>
                    <Text>Police: <Text style={styles.num}>{item.police}</Text></Text>
                  </TouchableOpacity>
                )}
                {item.ambulance && (
                  <TouchableOpacity onPress={() => call(item.ambulance)}>
                    <Text>Ambulance: <Text style={styles.num}>{item.ambulance}</Text></Text>
                  </TouchableOpacity>
                )}
                {item.fire && (
                  <TouchableOpacity onPress={() => call(item.fire)}>
                    <Text>Fire: <Text style={styles.num}>{item.fire}</Text></Text>
                  </TouchableOpacity>
                )}
              </View>
              {item.note && <Text style={styles.note}>{item.note}</Text>}
            </View>
          ))}

          {/* All Bursaries - SA + Africa */}
          {tab === 'africa-bursaries' && filteredBursaries.map((b) => (
            <View key={b.id} style={styles.africaCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{b.name}</Text>
                  <Text style={styles.city}>{b.provider} • {b.country}</Text>
                </View>
                <View style={[styles.countryBadge, b.country === 'South Africa' && styles.countryBadgeSA]}>
                  <Text style={styles.countryBadgeText}>{b.country === 'South Africa'? 'SA' : 'AF'}</Text>
                </View>
              </View>

              <Text style={styles.note}>Deadline: {b.deadline}</Text>
              <Text style={styles.note}>{b.notes}</Text>

              <View style={styles.badgeRow}>
                {b.level.map(l => (
                  <View key={l} style={styles.badge}>
                    <Text style={styles.badgeText}>{l}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.badgeRow}>
                {b.fields.slice(0, 3).map(f => (
                  <View key={f} style={[styles.badge, styles.badgeGray]}>
                    <Text style={styles.badgeGrayText}>{f}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.coversText}>Covers: {b.covers.join(', ')}</Text>

              <TouchableOpacity
                style={[styles.btn, styles.blue]}
                onPress={() => openURL(b.apply_link)}
              >
                <Ionicons name="open-outline" size={18} color="white" />
                <Text style={styles.btnText}>Apply Here</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Empty States */}
          {tab === 'sa' && filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No institutions found</Text>
              <Text style={styles.emptySubText}>Try searching by city or short name</Text>
            </View>
          )}

          {tab === 'africa-bursaries' && filteredBursaries.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No bursaries found</Text>
              <Text style={styles.emptySubText}>Try changing your search or filter</Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  header: {
    backgroundColor: '#8B0000',
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  headerText: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#DDD'
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6
  },
  tabActive: {
    borderBottomWidth: 2,
    borderColor: '#8B0000'
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#8B0000',
    fontWeight: 'bold'
  },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  count: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600'
  },
  expandAllText: {
    fontSize: 13,
    color: '#1E90FF',
    fontWeight: '600'
  },

  massPanic: {
    backgroundColor: '#DC143C',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 5
  },
  massPanicText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },

  search: {
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD'
  },

  filterScroll: {
    paddingHorizontal: 12,
    marginBottom: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  filterChipActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000'
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: 'white'
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 80,
    flexGrow: 1,
  },

  card: {
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 5,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4
  },

  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  fullName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  city: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginVertical: 4
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1
  },
  red: { backgroundColor: '#DC143C' },
  blue: { backgroundColor: '#1E90FF' },
  green: { backgroundColor: '#228B22' },
  orange: { backgroundColor: '#FF8C00' },

  nationalBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  nationalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  nationalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555'
  },
  nationalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  nationalBtn: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    minWidth: '48%'
  },
  nationalLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600'
  },
  nationalNum: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold'
  },

  africaCard: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    elevation: 1
  },
  africaCountry: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333'
  },
  africaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10
  },
  num: {
    fontWeight: 'bold',
    color: '#8B0000'
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic'
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600'
  },
  badgeGray: {
    backgroundColor: '#f0f0f0'
  },
  badgeGrayText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600'
  },
  coversText: {
    fontSize: 12,
    color: '#444',
    marginVertical: 6
  },

  countryBadge: {
    backgroundColor: '#1B3A6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8
  },
  countryBadgeSA: {
    backgroundColor: '#8B0000'
  },
  countryBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16
  },
  emptySubText: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4
  },
});