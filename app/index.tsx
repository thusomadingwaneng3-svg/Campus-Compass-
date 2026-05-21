import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Linking,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  ActivityIndicator,
  FlatList,
  Animated
} from 'react-native';
import { CampusContext } from '../CampusContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://campus-compass-thuso.vercel.app';

export default function InstitutionsScreen() {
  const router = useRouter();
  const context = useContext(CampusContext);
  const setActiveCampus = context?.setActiveCampus || (() => {});

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<any>(null);

  // Data state
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [saBursaries, setSaBursaries] = useState<any[]>([]);
  const [africaBursaries, setAfricaBursaries] = useState<any[]>([]);
  const [africaSchools, setAfricaSchools] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any>({});
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingBursaries, setLoadingBursaries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provinceIndex, setProvinceIndex] = useState<any>({});

  // Filters
  const [levelFilter, setLevelFilter] = useState<'All' | 'Tertiary' | 'School' | 'Africa' | 'Bursaries'>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [bursaryCountryFilter, setBursaryCountryFilter] = useState<string>('All');

  // Province dropdown state
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitialData();

    if (Platform.OS === 'web') {
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setCanInstall(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false
      }).start();
    }
  }, [loading]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadKnowledge(),
      loadAfricaNonSA(),
      loadProvinceIndex(),
      loadBursaries(),
      loadAfricaSchools()
    ]);
    setLoading(false);
  };

  const loadKnowledge = async () => {
    try {
      const offline = await AsyncStorage.getItem('offlineKnowledge');
      if (offline) {
        setKnowledge(JSON.parse(offline));
        return;
      }
      const res = await fetch(`${BASE_URL}/data/knowledge.json`);
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data);
        await AsyncStorage.setItem('offlineKnowledge', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Failed to load knowledge.json:', e);
    }
  };

  const loadAfricaNonSA = async () => {
    try {
      const offline = await AsyncStorage.getItem('offlineAfricaNonSA');
      if (offline) {
        const data = JSON.parse(offline);
        setInstitutions(prev => [...prev,...normalizeAfricaNonSA(data)]);
        return;
      }
      const res = await fetch(`${BASE_URL}/data/africa_non_sa.json`);
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeAfricaNonSA(data);
        setInstitutions(prev => [...prev,...normalized]);
        await AsyncStorage.setItem('offlineAfricaNonSA', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Failed to load africa_non_sa.json:', e);
    }
  };

  const loadAfricaSchools = async () => {
    try {
      const isWeb = Platform.OS === 'web';

      // Don't use AsyncStorage cache on web - it hits 5-10MB quota limit
      if (!isWeb) {
        const offline = await AsyncStorage.getItem('offlineSchoolsAfrica');
        if (offline) {
          const data = JSON.parse(offline);
          setAfricaSchools(normalizeAfricaSchools(data));
          return;
        }
      }

      const res = await fetch(`${BASE_URL}/data/schools_africa.json`);
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeAfricaSchools(data);
        setAfricaSchools(normalized);

        // Only cache on native
        if (!isWeb) {
          await AsyncStorage.setItem('offlineSchoolsAfrica', JSON.stringify(data));
        }
      }
    } catch (e) {
      console.log('Failed to load schools_africa.json:', e);
    }
  };

  const loadBursaries = async () => {
    setLoadingBursaries(true);
    try {
      const [offlineSA, offlineAfrica] = await Promise.all([
        AsyncStorage.getItem('offlineFunding'),
        AsyncStorage.getItem('offlineAfricaBursaries')
      ]);

      let saData: any[] = [];
      let africaData: any[] = [];

      if (offlineSA) {
        saData = JSON.parse(offlineSA).map((b: any) => ({...b, country: 'South Africa', id: b.id || `sa-${Math.random()}`}));
      }
      if (offlineAfrica) {
        africaData = JSON.parse(offlineAfrica).map((b: any) => ({...b, country: b.notes?.split(',')[0] || 'Africa', id: b.id || `af-${Math.random()}`}));
      }

      if (saData.length > 0 || africaData.length > 0) {
        setSaBursaries(saData);
        setAfricaBursaries(africaData);
        setLoadingBursaries(false);
        return;
      }

      const [saRes, africaRes] = await Promise.all([
        fetch(`${BASE_URL}/data/funding.json`),
        fetch(`${BASE_URL}/data/africa_bursaries.json`)
      ]);

      if (saRes.ok) {
        const data = await saRes.json();
        saData = data.map((b: any, i: number) => ({...b, country: 'South Africa', id: b.id || `sa-${i}`}));
        setSaBursaries(saData);
        await AsyncStorage.setItem('offlineFunding', JSON.stringify(data));
      }

      if (africaRes.ok) {
        const data = await africaRes.json();
        africaData = data.map((b: any, i: number) => ({...b, country: b.notes?.split(',')[0] || 'Africa', id: b.id || `af-${i}`}));
        setAfricaBursaries(africaData);
        await AsyncStorage.setItem('offlineAfricaBursaries', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Failed to load bursaries:', e);
    } finally {
      setLoadingBursaries(false);
    }
  };

  useEffect(() => {
    if (!knowledge.institutions) return;
    const tertiary = normalizeSA(knowledge);
    setInstitutions(prev => {
      const nonSA = prev.filter(i => i.country!== 'South Africa');
      return [...tertiary,...nonSA];
    });
  }, [knowledge]);

  const loadProvinceIndex = async () => {
    try {
      const offline = await AsyncStorage.getItem('offlineSchoolIndex');
      if (offline) {
        setProvinceIndex(JSON.parse(offline));
        return;
      }
      const res = await fetch(`${BASE_URL}/data/schools/index.json`);
      if (res.ok) {
        const data = await res.json();
        setProvinceIndex(data);
        await AsyncStorage.setItem('offlineSchoolIndex', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Error loading province index:', e);
    }
  };

  useEffect(() => {
    if (selectedProvince === 'All' || levelFilter!== 'School') return;
    if (!provinceIndex[selectedProvince]) return;
    loadSchools();
  }, [selectedProvince, provinceIndex, levelFilter]);

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const entry = provinceIndex[selectedProvince];
      if (!entry) {
        setLoadingSchools(false);
        return;
      }
      let filePath = typeof entry === 'string'? entry : entry.file || entry.path;
      if (!filePath) {
        setLoadingSchools(false);
        return;
      }
      if (!filePath.startsWith('http')) {
        filePath = `${BASE_URL}${filePath}`;
      }
      const fileName = filePath.split('/').pop().replace('.json', '');
      const offlineKey = `offline_${fileName}`;

      const offline = await AsyncStorage.getItem(offlineKey);
      if (offline) {
        const schools = JSON.parse(offline);
        setInstitutions(prev => [...prev.filter(i => i.level!== 'School'),...schools]);
        setLoadingSchools(false);
        return;
      }

      const res = await fetch(filePath);
      if (res.ok) {
        const schools = await res.json();
        const normalized = schools.map((s: any) => ({
         ...s,
          id: s.id || `school-${s.name}-${selectedProvince}`,
          level: 'School',
          province: selectedProvince,
          country: 'South Africa'
        }));
        setInstitutions(prev => [...prev.filter(i => i.level!== 'School'),...normalized]);
        await AsyncStorage.setItem(offlineKey, JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Failed to load schools:', e);
    } finally {
      setLoadingSchools(false);
    }
  };

  const normalizeSA = (knowledge: any) => {
    const all = [
     ...(knowledge.institutions || []),
     ...(knowledge.tvet_colleges || []),
     ...(knowledge.private_institutions || [])
    ];
    return all.map((campus, i) => {
      const lat = campus.latitude?? campus.lat?? null;
      const lng = campus.longitude?? campus.lng?? null;
      return {
        id: campus.id || `sa-${i}`,
        name: campus.name,
        shortName: campus.short || campus.name,
        city: campus.location || campus.city,
        province: campus.province,
        country: 'South Africa',
        level: 'Tertiary',
        type: campus.tvet? 'TVET College' : campus.private? 'Private Institution' : 'Public University',
        applyUrl: campus.website || campus.apply_link,
        primaryColor: campus.primaryColor || '#8B0000',
        lat, lng, latitude: lat, longitude: lng,
        coords: { lat, lng },
        emergency: { security: campus.security_phone || campus.contact },
        offices: {}
      };
    });
  };

  const normalizeAfricaNonSA = (data: any[]) =>
    data.map((inst: any, i: number) => {
      const lat = inst.latitude?? inst.lat?? null;
      const lng = inst.longitude?? inst.lng?? null;
      return {
        id: inst.id || `africa-${i}`,
        name: inst.name,
        shortName: inst.short || inst.name,
        city: inst.city,
        province: inst.province,
        country: inst.country || 'Africa',
        level: 'Tertiary',
        type: inst.type || 'University',
        applyUrl: inst.apply_link,
        primaryColor: inst.primaryColor || '#1B3A6B',
        lat, lng, latitude: lat, longitude: lng,
        coords: { lat, lng },
        emergency: { security: inst.security_phone },
        offices: {}
      };
    });

  const normalizeAfricaSchools = (data: any[]) =>
    data.map((s: any) => ({
      id: s.id || `school-${s.name}`,
      name: s.name,
      shortName: s.name,
      city: '',
      province: '',
      country: 'Africa',
      level: 'School',
      type: 'School',
      applyUrl: null,
      primaryColor: '#228B22',
      lat: s.lat,
      lng: s.lon,
      latitude: s.lat,
      longitude: s.lon,
      coords: { lat: s.lat, lng: s.lon },
      emergency: {},
      offices: {}
    }));

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    setDeferredPrompt(null);
  };

  const filtered = institutions.filter(c => {
    if (levelFilter === 'Africa' && c.country === 'South Africa') return false;
    if (levelFilter === 'Tertiary' && c.level!== 'Tertiary') return false;
    if (levelFilter === 'School' && c.level!== 'School') return false;
    if (levelFilter === 'Bursaries') return false;
    if (selectedProvince!== 'All' && c.province!== selectedProvince) return false;

    if (search) {
      const searchLower = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(searchLower) ||
        c.shortName?.toLowerCase().includes(searchLower) ||
        c.city?.toLowerCase().includes(searchLower) ||
        c.province?.toLowerCase().includes(searchLower) ||
        c.country?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const displayedInstitutions = levelFilter === 'Africa'? africaSchools : filtered;

  const allBursaries = [...saBursaries,...africaBursaries];
  const filteredBursaries = allBursaries.filter(b => {
    const matchesSearch = search
     ? b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.provider?.toLowerCase().includes(search.toLowerCase()) ||
        b.fields?.some((f: string) => f.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchesCountry = bursaryCountryFilter === 'All' ||
      b.country?.includes(bursaryCountryFilter) ||
      b.notes?.includes(bursaryCountryFilter);
    return matchesSearch && matchesCountry;
  });

  const filteredProvinces = Object.keys(provinceIndex).filter(prov =>
    prov.toLowerCase().includes(provinceSearch.toLowerCase())
  );
  const countries = ['All', 'South Africa', 'Nigeria', 'Ghana', 'Kenya', 'Uganda', 'Mauritius', 'East Africa', 'Southern Africa', 'West Africa'];

  const handleSelect = (campus: any) => {
    setSelectedCampus(campus);
    setModalVisible(true);
  };

  const handleViewMap = () => {
    setActiveCampus(selectedCampus);
    setModalVisible(false);
    router.push('/map');
  };

  const handleEmergency = () => {
    setActiveCampus(selectedCampus);
    setModalVisible(false);
    router.push('/emergency');
  };

  const handleApply = async () => {
    if (!selectedCampus?.applyUrl) return;
    try {
      await supabase.from('apply_clicks').insert({
        campus_id: selectedCampus.id,
        campus_name: selectedCampus.shortName,
        province: selectedCampus.province,
        user_agent: Platform.OS,
      });
    } catch (error) {
      console.log('Analytics failed:', error);
    }
    setModalVisible(false);
    Linking.openURL(selectedCampus.applyUrl);
  };

  const selectProvince = (prov: string) => {
    setSelectedProvince(prov);
    setProvinceModalVisible(false);
    setProvinceSearch('');
  };

  const renderInstitutionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.primaryColor || '#8B0000' }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.shortName}</Text>
        <Text style={styles.cardSubtitle}>{item.name}</Text>
        <Text style={styles.cardCity}>
          {item.city}{item.city && item.province? ', ' : ''}{item.province}
          {item.country && item.country!== 'South Africa'? `, ${item.country}` : ''}
        </Text>
        <Text style={styles.cardType}>{item.type || item.level}</Text>
      </View>
      <Ionicons name="chevron-forward" size={28} color="white" />
    </TouchableOpacity>
  );

  const renderBursaryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.country === 'South Africa'? '#8B0000' : '#1B3A6B' }]}
      onPress={() => Linking.openURL(item.apply_link)}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.countryBadge, item.country === 'South Africa' && styles.countryBadgeSA]}>
            <Text style={styles.countryBadgeText}>{item.country === 'South Africa'? 'SA' : 'AF'}</Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>{item.provider}</Text>
        <Text style={styles.cardCity}>Deadline: {item.deadline}</Text>
        <Text style={styles.cardType}>{item.level?.join(', ')}</Text>
        <Text style={styles.cardCity} numberOfLines={3}>{item.notes}</Text>
        <View style={styles.badgeRow}>
          {item.covers?.slice(0, 3).map((c: string, i: number) => (
            <View key={i} style={styles.badge}>
              <Text style={styles.badgeText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="open-outline" size={28} color="white" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading institutions...</Text>
      </View>
    );
  }

  const numColumns = Platform.OS === 'web'? 2 : 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <View style={styles.header}>
        <Ionicons name="school" size={32} color="#FFD700" />
        <Text style={styles.headerText}>SA & AFRICA INSTITUTIONS</Text>
        <Text style={styles.subHeader}>Map • Emergency • Apply • Bursaries</Text>

        {canInstall && (
          <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
            <Ionicons name="download" size={18} color="#111827" />
            <Text style={styles.installBtnText}>Install App</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All', 'Tertiary', 'Africa', 'School', 'Bursaries'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterBtn, levelFilter === filter && styles.filterBtnActive]}
            onPress={() => setLevelFilter(filter as any)}
          >
            <Text style={[styles.filterBtnText, levelFilter === filter && styles.filterBtnTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {levelFilter === 'School' && Object.keys(provinceIndex).length > 0 && (
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setProvinceModalVisible(true)}
        >
          <Text style={styles.dropdownBtnText}>
            {selectedProvince === 'All'? 'All Provinces' : selectedProvince}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#374151" />
        </TouchableOpacity>
      )}

      {levelFilter === 'Bursaries' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {countries.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.filterBtn, bursaryCountryFilter === c && styles.filterBtnActive]}
              onPress={() => setBursaryCountryFilter(c)}
            >
              <Text style={[styles.filterBtnText, bursaryCountryFilter === c && styles.filterBtnTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.search}
          placeholder={levelFilter === 'Bursaries'? "Search bursaries, provider, field..." : "Search institution, city, province..."}
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {(loadingSchools || loadingBursaries) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#111827" />
          <Text style={styles.loadingText}>
            {loadingSchools? 'Loading schools...' : 'Loading bursaries...'}
          </Text>
        </View>
      )}

      <Text style={styles.notice}>
        {levelFilter === 'Bursaries'
         ? `${filteredBursaries.length} bursaries shown`
          : `${displayedInstitutions.length} institutions shown`}. Data verified May 2026.
      </Text>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {levelFilter === 'Bursaries'? (
          <FlatList
            key={`bursaries-${numColumns}`}
            data={filteredBursaries}
            keyExtractor={(item) => item.id}
            renderItem={renderBursaryItem}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1? styles.row : null}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            ListEmptyComponent={
             !loadingBursaries? (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="school-outline" size={48} color="#ddd" />
                  <Text style={styles.noResults}>No bursaries found</Text>
                </View>
              ) : null
            }
          />
        ) : (
          <FlatList
            key={`institutions-${numColumns}`}
            data={displayedInstitutions}
            keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
            renderItem={renderInstitutionItem}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1? styles.row : null}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            windowSize={10}
            ListEmptyComponent={
             !loadingSchools? (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#ddd" />
                  <Text style={styles.noResults}>
                    {search? `No institutions found for "${search}"` : 'Select a filter to load institutions'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </Animated.View>

      {/* Campus Action Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCampus?.shortName}</Text>
            <Text style={styles.modalSubTitle}>{selectedCampus?.name}</Text>
            <Text style={styles.modalMeta}>
              {selectedCampus?.type} • {selectedCampus?.province}
              {selectedCampus?.country && selectedCampus?.country!== 'South Africa'? `, ${selectedCampus?.country}` : ''}
            </Text>

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#8B0000' }]} onPress={handleViewMap}>
              <Ionicons name="map" size={24} color="white" />
              <Text style={styles.modalBtnText}>View Campus Map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#DC143C' }]} onPress={handleEmergency}>
              <Ionicons name="warning" size={24} color="white" />
              <Text style={styles.modalBtnText}>Emergency Hub</Text>
            </TouchableOpacity>

            {selectedCampus?.applyUrl && (
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#228B22' }]} onPress={handleApply}>
                <Ionicons name="school" size={24} color="white" />
                <Text style={styles.modalBtnText}>Apply Now</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => router.push('/analytics')} style={{ position: 'absolute', right: 16, top: 20 }}>
              <Ionicons name="stats-chart" size={28} color="#FFD700" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Province Dropdown Modal */}
      <Modal
        visible={provinceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProvinceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalList}>
            <View style={styles.modalListHeader}>
              <Text style={styles.modalListTitle}>Select Province</Text>
              <TouchableOpacity onPress={() => setProvinceModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.provinceSearch}
              placeholder="Search province..."
              placeholderTextColor="#999"
              value={provinceSearch}
              onChangeText={setProvinceSearch}
              autoFocus
            />

            <ScrollView>
              <TouchableOpacity
                style={styles.modalListItem}
                onPress={() => selectProvince('All')}
              >
                <Text style={selectedProvince === 'All'? styles.modalListItemActive : styles.modalListItemText}>
                  All Provinces
                </Text>
                {selectedProvince === 'All' && <Ionicons name="checkmark" size={20} color="#111827" />}
              </TouchableOpacity>

              {filteredProvinces.map(prov => (
                <TouchableOpacity
                  key={prov}
                  style={styles.modalListItem}
                  onPress={() => selectProvince(prov)}
                >
                  <Text style={selectedProvince === prov? styles.modalListItemActive : styles.modalListItemText}>
                    {prov} {provinceIndex[prov]?.count? `(${provinceIndex[prov].count})` : ''}
                  </Text>
                  {selectedProvince === prov && <Ionicons name="checkmark" size={20} color="#111827" />}
                </TouchableOpacity>
              ))}

              {filteredProvinces.length === 0 && (
                <Text style={styles.noResults}>No provinces found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#111827', paddingTop: 20, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#FFD700' },
  headerText: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  subHeader: { color: '#fff', fontSize: 14, marginTop: 4, opacity: 0.9 },
  installBtn: { flexDirection: 'row', backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12, alignItems: 'center', gap: 6 },
  installBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 14 },
  filterRow: { paddingHorizontal: 16, gap: 8, marginTop: 12, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#111827' },
  filterBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  filterBtnTextActive: { color: '#fff' },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  dropdownBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  search: { flex: 1, padding: 14, fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  loadingText: { fontSize: 14, color: '#666', marginTop: 8 },
  notice: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center', paddingHorizontal: 16 },
  noResultsContainer: { alignItems: 'center', paddingVertical: 60 },
  noResults: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  row: { justifyContent: 'space-between', gap: 12 },
  card: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 160,
    flex: Platform.OS === 'web'? 1 : undefined,
  },
  cardTitle: { color: 'white', fontWeight: 'bold', fontSize: 20, lineHeight: 24, flexShrink: 1 },
  cardSubtitle: { color: 'white', fontSize: 15, opacity: 0.9, marginTop: 4 },
  cardCity: { color: 'white', fontSize: 14, opacity: 0.8, marginTop: 6 },
  cardType: { color: 'white', fontSize: 13, opacity: 0.7, marginTop: 4, fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 13, color: 'white', fontWeight: '600' },
  countryBadge: { backgroundColor: '#1B3A6B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 8 },
  countryBadgeSA: { backgroundColor: '#FFD700' },
  countryBadgeText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#8B0000', marginBottom: 4 },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 4, textAlign: 'center' },
  modalMeta: { fontSize: 12, color: '#999', marginBottom: 24, textAlign: 'center' },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12, gap: 10 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 8, padding: 12 },
  cancelText: { color: '#666', fontSize: 16 },
  modalList: { backgroundColor: 'white', maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalListTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  provinceSearch: { backgroundColor: '#f3f4f6', margin: 16, padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  modalListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalListItemText: { fontSize: 16, color: '#374151' },
  modalListItemActive: { fontSize: 16, color: '#111827', fontWeight: 'bold' },
});