import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, Linking,
  SafeAreaView, StatusBar, ScrollView, Platform, ActivityIndicator, FlatList, Animated
} from 'react-native';
import { CampusContext } from '../CampusContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { openDB, IDBPDatabase } from 'idb'; 
import globalInstitutions from '../global_institutions.json'; 
import funding from '../funding.json'; 
import africaBursaries from '../africa_bursaries.json'; 
import schoolsAfrica from '../schools_africa.json'; 
import africaNonSA from '../africa_non_sa.json'; 

let db: IDBPDatabase;
const initDB = async () => {
  if (!db) db = await openDB('campus-compass', 1, {
    upgrade(db) { 
      if (!db.objectStoreNames.contains('institutions')) {
        db.createObjectStore('institutions', { keyPath: 'id' }); 
      }
    }
  });
  return db;
};

const normalizeRecord = (d: any, i: number, type: string) => ({
  id: d.id || `${type}-${d.name?.replace(/\s/g,'-')?.replace(/[^a-zA-Z0-9-]/g,'')}-${i}`,
  name: d.name,
  shortName: d.shortName || d.short || d.name,
  province: d.province || d.province_state || '', 
  city: d.city || '',
  country: d.country || 'South Africa',
  level: type === 'bursary'? 'Bursary' : type === 'school'? 'School' : 'Tertiary',
  type: type, 
  applyUrl: d.applyUrl || d.apply_url || d.website || d.link,
  primaryColor: d.primaryColor || d.primary_color || '#8B0000',
  lat: d.lat || d.latitude, 
  lng: d.lng || d.longitude,
  latitude: d.lat || d.latitude, 
  longitude: d.lng || d.longitude,
  provider: d.provider || d.name, 
  deadline: d.deadline || d.application_deadline_2026 || 'TBD',
  covers: d.covers || d.benefits || [],
});

export default function HomeScreen() {
  const router = useRouter();
  const context = useContext(CampusContext);
  const setActiveCampus = context?.setActiveCampus || (() => {});

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<any>(null);
  const [institutions, setInstitutions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinceIndex, setProvinceIndex] = useState<any>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [levelFilter, setLevelFilter] = useState<'All' | 'Tertiary' | 'School' | 'Africa' | 'Bursaries'>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [bursaryCountryFilter, setBursaryCountryFilter] = useState<string>('All');
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAllData(); 
    if (Platform.OS === 'web') {
      const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setCanInstall(true); };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  useEffect(() => {
    if (!loading &&!error) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    }
  }, [loading, error]);

  const loadAllData = async () => {
    setLoading(true); setError(null);
    try {
      const database = await initDB();
      let all = await database.getAll('institutions'); 
      
      if (all.length === 0) {
        const tx = database.transaction('institutions', 'readwrite');
        await Promise.all([
        ...globalInstitutions.map((d, i) => tx.store.put(normalizeRecord(d, i, 'university'))),
        ...funding.map((d, i) => tx.store.put(normalizeRecord(d, i, 'bursary'))), 
        ...africaBursaries.map((d, i) => tx.store.put(normalizeRecord(d, i, 'bursary'))), 
        ...schoolsAfrica.map((d, i) => tx.store.put(normalizeRecord(d, i, 'school'))),
        ...africaNonSA.map((d, i) => tx.store.put(normalizeRecord(d, i, 'university'))),
        ]);
        await tx.done;
        all = await database.getAll('institutions');
        console.log(`Seeded JSON: Uni:${globalInstitutions.length+africaNonSA.length} Bursary:${funding.length+africaBursaries.length} School:${schoolsAfrica.length}`);
      }
      
      setInstitutions(all);
      setTotalCount(all.length);
      setProvinceIndex(buildProvinceIndex(all)); 
      
    } catch (e) {
      console.error('Failed to load IndexedDB data:', e);
      setError('Could not load data. Try refresh.');
    } finally {
      setLoading(false);
    }
  };

  const buildProvinceIndex = (data: any[]) => {
    const index: any = {};
    data.filter(i => i.country === 'South Africa' && i.type === 'school').forEach(s => {
      if (!index[s.province]) index[s.province] = { count: 0, file: null };
      index[s.province].count += 1;
    });
    return index;
  };

  const handleInstall = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setCanInstall(false); setDeferredPrompt(null); };
  
  const filtered = institutions.filter(c => { 
    if (levelFilter === 'Africa' && c.country === 'South Africa') return false; 
    if (levelFilter === 'Tertiary' && c.type!== 'university') return false; 
    if (levelFilter === 'School' && c.type!== 'school') return false; 
    if (levelFilter === 'Bursaries' && c.type!== 'bursary') return false; 
    if (selectedProvince!== 'All' && c.province!== selectedProvince) return false; 
    if (search) { 
      const searchLower = search.toLowerCase(); 
      return (c.name?.toLowerCase().includes(searchLower) || c.shortName?.toLowerCase().includes(searchLower) || c.city?.toLowerCase().includes(searchLower) || c.province?.toLowerCase().includes(searchLower) || c.country?.toLowerCase().includes(searchLower) || c.provider?.toLowerCase().includes(searchLower)); 
    } 
    return true; 
  });

  const displayedInstitutions = levelFilter === 'Africa'? institutions.filter(i => i.type === 'university' && i.country!== 'South Africa') : filtered; 
  
  const bursaries = institutions.filter(i => i.type === 'bursary');
  const filteredBursaries = bursaries.filter(b => { 
    const matchesSearch = search? b.name?.toLowerCase().includes(search.toLowerCase()) || b.provider?.toLowerCase().includes(search.toLowerCase()) : true; 
    const matchesCountry = bursaryCountryFilter === 'All' || b.country === bursaryCountryFilter; 
    return matchesSearch && matchesCountry; 
  });

  const filteredProvinces = Object.keys(provinceIndex).filter(prov => prov.toLowerCase().includes(provinceSearch.toLowerCase()));
  const countries = ['All', 'South Africa', 'Nigeria', 'Ghana', 'Kenya', 'Uganda', 'Mauritius', 'East Africa', 'Southern Africa', 'West Africa'];
  
  const handleSelect = (campus: any) => { setSelectedCampus(campus); setModalVisible(true); };
  const handleViewMap = () => { setActiveCampus(selectedCampus); setModalVisible(false); router.push('/map'); };
  const handleEmergency = () => { setActiveCampus(selectedCampus); setModalVisible(false); router.push('/emergency'); };
  const handleApply = async () => { 
    if (!selectedCampus?.applyUrl) return; 
    try { await supabase.from('apply_clicks').insert({ campus_id: selectedCampus.id, campus_name: selectedCampus.shortName, province: selectedCampus.province, user_agent: Platform.OS }); } 
    catch (error) { console.log('Analytics failed:', error); } 
    setModalVisible(false); Linking.openURL(selectedCampus.applyUrl); 
  };
  const selectProvince = (prov: string) => { setSelectedProvince(prov); setProvinceModalVisible(false); setProvinceSearch(''); };
  
  const SkeletonCard = () => ( <View style={[styles.card, { backgroundColor: '#E5E7EB' }]}><View style={{ flex: 1 }}><View style={{ height: 20, width: '60%', backgroundColor: '#D1D5DB', borderRadius: 4, marginBottom: 8 }} /><View style={{ height: 16, width: '90%', backgroundColor: '#D1D5DB', borderRadius: 4, marginBottom: 6 }} /><View style={{ height: 14, width: '40%', backgroundColor: '#D1D5DB', borderRadius: 4 }} /></View><Ionicons name="chevron-forward" size={28} color="#9CA3AF" /></View> );
  
  const renderInstitutionItem = ({ item }: { item: any }) => ( 
    <TouchableOpacity style={[styles.card, { backgroundColor: item.primaryColor || '#8B0000' }]} onPress={() => handleSelect(item)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.shortName}</Text>
        <Text style={styles.cardSubtitle}>{item.name}</Text>
        <Text style={styles.cardCity}>{item.city}{item.city && item.province? ', ' : ''}{item.province}{item.country && item.country!== 'South Africa'? `, ${item.country}` : ''}</Text>
        <Text style={styles.cardType}>{item.type || item.level}</Text>
      </View>
      <Ionicons name="chevron-forward" size={28} color="white" />
    </TouchableOpacity> 
  );
  
  const renderBursaryItem = ({ item }: { item: any }) => ( 
    <TouchableOpacity style={[styles.card, { backgroundColor: item.country === 'South Africa'? '#8B0000' : '#1B3A6B' }]} onPress={() => Linking.openURL(item.applyUrl)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.countryBadge, item.country === 'South Africa' && styles.countryBadgeSA]}><Text style={styles.countryBadgeText}>{item.country === 'South Africa'? 'SA' : 'AF'}</Text></View>
        </View>
        <Text style={styles.cardSubtitle}>{item.provider}</Text>
        <Text style={styles.cardCity}>Deadline: {item.deadline}</Text>
        <View style={styles.badgeRow}>{item.covers?.slice(0, 3).map((c: string, i: number) => (<View key={i} style={styles.badge}><Text style={styles.badgeText}>{c}</Text></View>))}</View>
      </View>
      <Ionicons name="open-outline" size={28} color="white" />
    </TouchableOpacity> 
  );

  if (error) { 
    return ( 
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.loadingScreen}>
          <Ionicons name="cloud-offline" size={48} color="#DC143C" />
          <Text style={[styles.loadingText, { color: '#DC143C', marginTop: 12 }]}>{error}</Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#8B0000', marginTop: 20, width: '60%' }]} onPress={loadAllData}>
            <Text style={styles.modalBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView> 
    ); 
  }

  if (loading) { 
    return ( 
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.header}>
          <Ionicons name="school" size={32} color="#FFD700" />
          <Text style={styles.headerText}>SA & AFRICA INSTITUTIONS</Text>
          <Text style={styles.subHeader}>Loading {totalCount || '...'} institutions</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</View>
      </SafeAreaView> 
    ); 
  }

  const numColumns = Platform.OS === 'web'? 2 : 1;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.header}>
        <Ionicons name="school" size={32} color="#FFD700" />
        <Text style={styles.headerText}>SA & AFRICA INSTITUTIONS</Text>
        <Text style={styles.subHeader}>{totalCount}+ Institutions • Map • Emergency • Apply</Text>
        {canInstall && (<TouchableOpacity style={styles.installBtn} onPress={handleInstall}><Ionicons name="download" size={18} color="#111827" /><Text style={styles.installBtnText}>Install App</Text></TouchableOpacity>)}
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All', 'Tertiary', 'Africa', 'School', 'Bursaries'].map(filter => (
          <TouchableOpacity key={filter} style={[styles.filterBtn, levelFilter === filter && styles.filterBtnActive]} onPress={() => setLevelFilter(filter as any)}>
            <Text style={[styles.filterBtnText, levelFilter === filter && styles.filterBtnTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {levelFilter === 'School' && Object.keys(provinceIndex).length > 0 && (
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setProvinceModalVisible(true)}>
          <Text style={styles.dropdownBtnText}>{selectedProvince === 'All'? 'All Provinces' : selectedProvince}</Text>
          <Ionicons name="chevron-down" size={20} color="#374151" />
        </TouchableOpacity>
      )}

      {levelFilter === 'Bursaries' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {countries.map(c => (
            <TouchableOpacity key={c} style={[styles.filterBtn, bursaryCountryFilter === c && styles.filterBtnActive]} onPress={() => setBursaryCountryFilter(c)}>
              <Text style={[styles.filterBtnText, bursaryCountryFilter === c && styles.filterBtnTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput style={styles.search} placeholder={levelFilter === 'Bursaries'? "Search bursaries..." : "Search all institutions..."} placeholderTextColor="#999" value={search} onChangeText={setSearch} />
        {search.length > 0 && (<TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>)}
      </View>

      <Text style={styles.notice}>
        {levelFilter === 'Bursaries'? `${filteredBursaries.length} bursaries shown` : `${displayedInstitutions.length} of ${totalCount} institutions shown`}
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
            ListEmptyComponent={(<View style={styles.noResultsContainer}><Ionicons name="school-outline" size={48} color="#ddd" /><Text style={styles.noResults}>No bursaries found</Text></View>)}
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
            initialNumToRender={50} 
            windowSize={10} 
            ListEmptyComponent={(<View style={styles.noResultsContainer}><Ionicons name="search-outline" size={48} color="#ddd" /><Text style={styles.noResults}>{search? `No institutions found for "${search}"` : 'No institutions'}</Text></View>)}
          />
        )}
      </Animated.View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCampus?.shortName}</Text>
            <Text style={styles.modalSubTitle}>{selectedCampus?.name}</Text>
            <Text style={styles.modalMeta}>{selectedCampus?.type} • {selectedCampus?.province}{selectedCampus?.country && selectedCampus?.country!== 'South Africa'? `, ${selectedCampus?.country}` : ''}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#8B0000' }]} onPress={handleViewMap}><Ionicons name="map" size={24} color="white" /><Text style={styles.modalBtnText}>View Campus Map</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#DC143C' }]} onPress={handleEmergency}><Ionicons name="warning" size={24} color="white" /><Text style={styles.modalBtnText}>Emergency Hub</Text></TouchableOpacity>
            {selectedCampus?.applyUrl && (<TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#228B22' }]} onPress={handleApply}><Ionicons name="school" size={24} color="white" /><Text style={styles.modalBtnText}>Apply Now</Text></TouchableOpacity>)}
            <TouchableOpacity onPress={() => router.push('/analytics')} style={{ position: 'absolute', right: 16, top: 20 }}><Ionicons name="stats-chart" size={28} color="#FFD700" /></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={provinceModalVisible} animationType="slide" transparent={true} onRequestClose={() => setProvinceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalList}>
            <View style={styles.modalListHeader}>
              <Text style={styles.modalListTitle}>Select Province</Text>
              <TouchableOpacity onPress={() => setProvinceModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <TextInput style={styles.provinceSearch} placeholder="Search province..." placeholderTextColor="#999" value={provinceSearch} onChangeText={setProvinceSearch} autoFocus />
            <ScrollView>
              <TouchableOpacity style={styles.modalListItem} onPress={() => selectProvince('All')}>
                <Text style={selectedProvince === 'All'? styles.modalListItemActive : styles.modalListItemText}>All Provinces</Text>
                {selectedProvince === 'All' && <Ionicons name="checkmark" size={20} color="#111827" />}
              </TouchableOpacity>
              {filteredProvinces.map(prov => (
                <TouchableOpacity key={prov} style={styles.modalListItem} onPress={() => selectProvince(prov)}>
                  <Text style={selectedProvince === prov? styles.modalListItemActive : styles.modalListItemText}>
                    {prov} {provinceIndex[prov]?.count? `(${provinceIndex[prov].count})` : ''}
                  </Text>
                  {selectedProvince === prov && <Ionicons name="checkmark" size={20} color="#111827" />}
                </TouchableOpacity>
              ))}
              {filteredProvinces.length === 0 && (<Text style={styles.noResults}>No provinces found</Text>)}
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
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginHorizontal: 16, marginBottom: 12 },
  dropdownBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDD' },
  search: { flex: 1, padding: 14, fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  loadingText: { fontSize: 14, color: '#666', marginTop: 8 },
  notice: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center', paddingHorizontal: 16 },
  noResultsContainer: { alignItems: 'center', paddingVertical: 60 },
  noResults: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  row: { justifyContent: 'space-between', gap: 12 },
  card: { padding: 18, borderRadius: 14, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, minHeight: 160, flex: Platform.OS === 'web'? 1 : undefined },
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