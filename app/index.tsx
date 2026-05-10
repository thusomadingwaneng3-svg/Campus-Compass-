import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, Linking, SafeAreaView, StatusBar, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { CampusContext } from '../CampusContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InstitutionsScreen() {
  const router = useRouter();
  const { setActiveCampus } = useContext(CampusContext);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<any>(null);

  // Data state
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any>({});
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [provinceIndex, setProvinceIndex] = useState<any>({});

  // Filters
  const [levelFilter, setLevelFilter] = useState<'All' | 'Tertiary' | 'School'>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Load knowledge.json at runtime
  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const res = await fetch('/public/data/knowledge.json');
        if (res.ok) {
          const data = await res.json();
          setKnowledge(data);
        }
      } catch (e) {
        console.log('Failed to load knowledge.json:', e);
      }
    };
    loadKnowledge();
  }, []);

  // Load tertiary institutions once knowledge is loaded
  useEffect(() => {
    if (!knowledge.institutions) return;

    const tertiary = [
     ...knowledge.institutions,
     ...knowledge.tvet_colleges,
     ...knowledge.private_institutions
    ].map(campus => ({
      id: campus.id,
      name: campus.name,
      shortName: campus.short || campus.name,
      city: campus.location,
      province: campus.province,
      level: 'Tertiary',
      type: campus.tvet? 'TVET College' : campus.private? 'Private Institution' : 'Public University',
      applyUrl: campus.website,
      primaryColor: campus.primaryColor || '#8B0000',
      coords: { lat: campus.lat, lng: campus.lng },
      emergency: { security: campus.security_phone || campus.contact },
      offices: {}
    }));
    setInstitutions(tertiary);
  }, [knowledge]);

  // Load province index when Schools filter is selected
  useEffect(() => {
    if (levelFilter === 'School' || levelFilter === 'All') {
      loadProvinceIndex();
    }
  }, [levelFilter]);

  const loadProvinceIndex = async () => {
    try {
      const res = await fetch('/public/data/schools/index.json');
      if (res.ok) {
        const data = await res.json();
        setProvinceIndex(data);
        return;
      }
    } catch {}

    try {
      const offline = await AsyncStorage.getItem('offlineSchoolIndex');
      if (offline) {
        setProvinceIndex(JSON.parse(offline));
      } else {
        console.log('Schools data not found. Run "Download for Offline" in the drawer.');
      }
    } catch (e) {
      console.log('Error loading province index:', e);
    }
  };

  // Load schools for selected province
  useEffect(() => {
    if (selectedProvince === 'All' || levelFilter!== 'School') return;
    if (!provinceIndex[selectedProvince]) return;

    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const file = provinceIndex[selectedProvince].file;
        const offlineKey = `offline_${file.split('/').pop().replace('.json', '')}`;

        try {
          const res = await fetch(file);
          if (res.ok) {
            const schools = await res.json();
            setInstitutions(prev => [
             ...prev.filter(i => i.level!== 'School'),
             ...schools
            ]);
            setLoadingSchools(false);
            return;
          }
        } catch {}

        const offline = await AsyncStorage.getItem(offlineKey);
        if (offline) {
          const schools = JSON.parse(offline);
          setInstitutions(prev => [
           ...prev.filter(i => i.level!== 'School'),
           ...schools
          ]);
        } else {
          console.log('No offline data for', selectedProvince);
        }
      } catch (e) {
        console.log('Failed to load schools:', e);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, [selectedProvince, provinceIndex, levelFilter]);

  // Listen for PWA install prompt
  useEffect(() => {
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

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  const filtered = institutions.filter(c => {
    if (levelFilter!== 'All' && c.level!== levelFilter) return false;
    if (selectedProvince!== 'All' && c.province!== selectedProvince) return false;

    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.shortName.toLowerCase().includes(searchLower) ||
      c.city.toLowerCase().includes(searchLower) ||
      c.province.toLowerCase().includes(searchLower)
    );
  });

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <View style={styles.header}>
        <Ionicons name="school" size={32} color="#FFD700" />
        <Text style={styles.headerText}>SA INSTITUTIONS</Text>
        <Text style={styles.subHeader}>Map • Emergency • Apply</Text>

        {canInstall && (
          <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
            <Ionicons name="download" size={18} color="#111827" />
            <Text style={styles.installBtnText}>Install App</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Level Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, levelFilter === 'All' && styles.filterBtnActive]}
          onPress={() => setLevelFilter('All')}
        >
          <Text style={[styles.filterBtnText, levelFilter === 'All' && styles.filterBtnTextActive]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, levelFilter === 'Tertiary' && styles.filterBtnActive]}
          onPress={() => setLevelFilter('Tertiary')}
        >
          <Text style={[styles.filterBtnText, levelFilter === 'Tertiary' && styles.filterBtnTextActive]}>Tertiary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, levelFilter === 'School' && styles.filterBtnActive]}
          onPress={() => setLevelFilter('School')}
        >
          <Text style={[styles.filterBtnText, levelFilter === 'School' && styles.filterBtnTextActive]}>Schools</Text>
        </TouchableOpacity>
      </View>

      {/* Province Filters */}
      {levelFilter === 'School' && Object.keys(provinceIndex).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.provinceScroll}>
          <TouchableOpacity
            style={[styles.provinceBtn, selectedProvince === 'All' && styles.provinceBtnActive]}
            onPress={() => setSelectedProvince('All')}
          >
            <Text style={selectedProvince === 'All' && styles.provinceBtnTextActive}>All Provinces</Text>
          </TouchableOpacity>
          {Object.keys(provinceIndex).map(prov => (
            <TouchableOpacity
              key={prov}
              style={[styles.provinceBtn, selectedProvince === prov && styles.provinceBtnActive]}
              onPress={() => setSelectedProvince(prov)}
            >
              <Text style={selectedProvince === prov && styles.provinceBtnTextActive}>
                {prov} ({provinceIndex[prov].count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TextInput
        style={styles.search}
        placeholder="Search institution, city, province..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView style={{ paddingHorizontal: 12 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {loadingSchools && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.loadingText}>Loading schools...</Text>
          </View>
        )}

        <Text style={styles.notice}>
          {filtered.length} institutions shown. Data verified May 2026.
        </Text>

        {filtered.length === 0 &&!loadingSchools && (
          <Text style={styles.noResults}>
            {search? `No institutions found for "${search}"` : 'Select a province to load schools'}
          </Text>
        )}

        {filtered.map(campus => (
          <TouchableOpacity
            key={campus.id}
            style={[styles.card, { backgroundColor: campus.primaryColor }]}
            onPress={() => handleSelect(campus)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{campus.shortName}</Text>
              <Text style={styles.cardSubtitle}>{campus.name}</Text>
              <Text style={styles.cardCity}>{campus.city}, {campus.province}</Text>
              <Text style={styles.cardType}>{campus.type || campus.level}</Text>
            </View>
            <Ionicons name="chevron-forward" size={28} color="white" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCampus?.shortName}</Text>
            <Text style={styles.modalSubTitle}>{selectedCampus?.name}</Text>
            <Text style={styles.modalMeta}>{selectedCampus?.type} • {selectedCampus?.province}</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#111827', paddingTop: 20, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#FFD700' },
  headerText: { color: '#FFD700', fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  subHeader: { color: '#fff', fontSize: 14, marginTop: 4, opacity: 0.9 },

  installBtn: { flexDirection: 'row', backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12, alignItems: 'center', gap: 6 },
  installBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 14 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 12, marginBottom: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#111827' },
  filterBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  filterBtnTextActive: { color: '#fff' },

  provinceScroll: { paddingHorizontal: 16, marginBottom: 12, maxHeight: 40 },
  provinceBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E5E7EB', marginRight: 8 },
  provinceBtnActive: { backgroundColor: '#FFD700' },
  provinceBtnTextActive: { fontWeight: 'bold' },

  search: { backgroundColor: 'white', margin: 16, padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#DDD' },

  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  loadingText: { fontSize: 14, color: '#666' },

  notice: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center', paddingHorizontal: 16 },
  noResults: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 40, fontStyle: 'italic' },

  card: { padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  cardSubtitle: { color: 'white', fontSize: 13, opacity: 0.9, marginTop: 2 },
  cardCity: { color: 'white', fontSize: 12, opacity: 0.8, marginTop: 4 },
  cardType: { color: 'white', fontSize: 11, opacity: 0.7, marginTop: 2, fontStyle: 'italic' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#8B0000', marginBottom: 4 },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 4, textAlign: 'center' },
  modalMeta: { fontSize: 12, color: '#999', marginBottom: 24, textAlign: 'center' },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, width: '100%', marginBottom: 12, gap: 10 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 8, padding: 12 },
  cancelText: { color: '#666', fontSize: 16 },
});