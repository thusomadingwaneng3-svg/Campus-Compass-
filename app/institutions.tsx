import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://campus-compass-thuso.vercel.app';

interface Institution {
  id: string;
  name: string;
  province?: string;
  country?: string;
  level?: string;
  type?: string;
  lat?: number;
  lon?: number;
}

const FILTERS = [
  { key: 'All', label: 'All', icon: 'apps' },
  { key: 'Tertiary', label: 'Tertiary', icon: 'school' },
  { key: 'Africa', label: 'Africa', icon: 'globe' },
  { key: 'School', label: 'SA Schools', icon: 'library' }
];

export default function InstitutionsScreen() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'All' | 'Tertiary' | 'Africa' | 'School'>('All');
  const [provinceFilter, setProvinceFilter] = useState<string>('All');
  const [provinceIndex, setProvinceIndex] = useState<Record<string, string>>({});
  const [showProvinceModal, setShowProvinceModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true })
      ]).start();
    }
  }, [loading]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [saRes, africaRes] = await Promise.all([
        fetch(`${BASE_URL}/data/sa_tertiary.json`),
        fetch(`${BASE_URL}/data/africa_non_sa.json`)
      ]);

      const saData = saRes.ok? await saRes.json() : [];
      const africaData = africaRes.ok? await africaRes.json() : [];

      const normalizedAfrica = africaData.map((item: any) => ({
        id: item.id || `africa-${item.name}`,
        name: item.name,
        province: item.country || 'Africa',
        country: item.country || 'Africa',
        level: 'Tertiary',
        type: item.type || 'University',
        lat: item.lat,
        lon: item.lon
      }));

      const combined = [...saData,...normalizedAfrica];
      setInstitutions(combined);

      const indexRes = await fetch(`${BASE_URL}/data/schools/index.json`);
      if (indexRes.ok) {
        const index = await indexRes.json();
        setProvinceIndex(index);
      }

    } catch (e) {
      console.error('Failed to load institutions:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadProvinceSchools = async (province: string) => {
    if (province === 'All' ||!provinceIndex[province]) return;

    try {
      const fileName = provinceIndex[province].split('/').pop();
      const res = await fetch(`${BASE_URL}/data/schools/${fileName}`);
      if (res.ok) {
        const schools = await res.json();
        const normalizedSchools = schools.map((s: any) => ({
         ...s,
          level: 'School',
          province: province
        }));

        setInstitutions(prev => [
         ...prev.filter(i => i.level!== 'School'),
         ...normalizedSchools
        ]);
      }
    } catch (e) {
      console.error('Failed to load schools:', e);
    }
  };

  useEffect(() => {
    if (levelFilter === 'School') {
      loadProvinceSchools(provinceFilter);
    }
  }, [levelFilter, provinceFilter]);

  const filteredData = useMemo(() => {
    return institutions.filter(item => {
      if (search &&!item.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      if (levelFilter === 'Tertiary' && item.level!== 'Tertiary' && item.country!== 'South Africa') {
        return false;
      }
      if (levelFilter === 'Africa' && item.country === 'South Africa') {
        return false;
      }
      if (levelFilter === 'School' && item.level!== 'School') {
        return false;
      }

      if (levelFilter === 'School' && provinceFilter!== 'All' && item.province!== provinceFilter) {
        return false;
      }

      return true;
    });
  }, [institutions, search, levelFilter, provinceFilter]);

  const renderItem = ({ item }: { item: Institution; index: number }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/institution/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, item.level === 'School'? styles.schoolBadge : styles.uniBadge]}>
            <Ionicons
              name={item.level === 'School'? 'library' : 'school'}
              size={22}
              color="white"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.province || item.country} • {item.type}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={styles.loadingText}>Loading 24,715 institutions...</Text>
        <Text style={styles.loadingSub}>SA & Africa data warming up 🔥</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#D32F2F" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search institutions, schools, universities..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterScroll}>
        {FILTERS.map(filter => {
          const isActive = levelFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setLevelFilter(filter.key as any)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={filter.icon as any}
                size={18}
                color={isActive? 'white' : '#D32F2F'}
              />
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Province Picker */}
      {levelFilter === 'School' && (
        <Animated.View style={[styles.provinceWrapper, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.provinceBtn}
            onPress={() => setShowProvinceModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={18} color="#D32F2F" />
            <Text style={styles.provinceBtnText}>{provinceFilter}</Text>
            <Ionicons name="chevron-down" size={18} color="#D32F2F" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Results Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredData.length} {filteredData.length === 1? 'institution' : 'institutions'} found
        </Text>
        {levelFilter === 'School' && provinceFilter!== 'All' && (
          <Text style={styles.countSub}>in {provinceFilter}</Text>
        )}
      </View>

      {/* List */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No institutions found</Text>
              <Text style={styles.emptySub}>Try adjusting your filters</Text>
            </View>
          }
        />
      </Animated.View>

      {/* Province Modal */}
      <Modal
        visible={showProvinceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProvinceModal(false)}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Province</Text>
              <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['All',...Object.keys(provinceIndex).sort()]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, provinceFilter === item && styles.modalItemActive]}
                  onPress={() => {
                    setProvinceFilter(item);
                    setShowProvinceModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, provinceFilter === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {provinceFilter === item && <Ionicons name="checkmark" size={20} color="#D32F2F" />}
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingSub: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D32F2F20',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
    elevation: 4,
    shadowColor: '#D32F2F',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
  filterPillTextActive: {
    color: 'white',
  },
  provinceWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  provinceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D32F2F20',
    gap: 8,
  },
  provinceBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  countRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  countSub: {
    fontSize: 13,
    color: '#D32F2F',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolBadge: {
    backgroundColor: '#1976D2',
  },
  uniBadge: {
    backgroundColor: '#D32F2F',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '70%',
    width: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemActive: {
    backgroundColor: '#D32F2F10',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextActive: {
    color: '#D32F2F',
    fontWeight: '600',
  },
});