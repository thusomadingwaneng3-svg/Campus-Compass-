import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { allInstitutions, SAInstitution } from '../data/saInstitutions';

type FilterType = 'All' | 'University of Technology' | 'TVET College' | 'Favorites';

export default function MapScreen() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<SAInstitution | null>(null);
  const [showList, setShowList] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites on start
  useEffect(() => {
    AsyncStorage.getItem('favoriteCampusIds').then(data => {
      if (data) setFavorites(JSON.parse(data));
    });
  }, []);

  const toggleFavorite = async (id: string) => {
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    await AsyncStorage.setItem('favoriteCampusIds', JSON.stringify(newFavs));
  };

  const filteredInstitutions = useMemo(() => {
    return allInstitutions.filter(inst => {
      const matchesFilter = 
        selectedFilter === 'All' || 
        inst.type === selectedFilter ||
        (selectedFilter === 'Favorites' && favorites.includes(inst.id));
      const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           inst.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [selectedFilter, searchQuery, favorites]);

  const handleSelectCampus = (inst: SAInstitution) => {
    setSelectedCampus(inst);
    setShowList(false);
  };

  const openDirections = (inst: SAInstitution) => {
    const { lat, lng } = inst.coordinates;
    const url = Platform.OS === 'ios' 
      ? `maps:0,0?q=${lat},${lng}`
      : `geo:0,0?q=${lat},${lng}(${inst.name})`;
    Linking.openURL(url);
  };

  const openApplyPage = (inst: SAInstitution) => {
    // Most SA institutions use /apply or /study-at-xxx
    const applyUrl = `${inst.website}/apply`;
    Linking.openURL(applyUrl);
  };

  const getPinColor = (type: SAInstitution['type']) => {
    if (type === 'University') return 'red';
    if (type === 'University of Technology') return 'blue';
    return 'green';
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: -30.5595,
          longitude: 22.9375,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
        region={selectedCampus ? {
          latitude: selectedCampus.coordinates.lat,
          longitude: selectedCampus.coordinates.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : undefined}
      >
        {filteredInstitutions.map(inst => (
          <Marker
            key={inst.id}
            coordinate={inst.coordinates}
            title={inst.name}
            description={`${inst.type} • ${inst.city}`}
            pinColor={getPinColor(inst.type)}
            onPress={() => setSelectedCampus(inst)}
          />
        ))}
      </MapView>

      {/* Top Panel */}
      <View style={styles.topPanel}>
        <TextInput
          style={styles.search}
          placeholder="Search campus or city..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <View style={styles.filterRow}>
          {(['All', 'University', 'TVET College', 'Favorites'] as FilterType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterBtn, selectedFilter === type && styles.filterBtnActive]}
              onPress={() => setSelectedFilter(type)}
            >
              <Text style={[styles.filterText, selectedFilter === type && styles.filterTextActive]}>
                {type === 'TVET College' ? 'TVET' : type}
                {type === 'Favorites' && ` (${favorites.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.listBtn} onPress={() => setShowList(!showList)}>
          <Text style={styles.listBtnText}>
            {showList ? 'Hide List' : `Show ${filteredInstitutions.length} Campuses`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Campus List */}
      {showList && (
        <View style={styles.listPanel}>
          <FlatList
            data={filteredInstitutions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelectCampus(item)}>
                  <Text style={styles.listItemName}>{item.shortName}</Text>
                  <Text style={styles.listItemSub}>{item.city} • {item.studentCount.toLocaleString()} students</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <Ionicons 
                    name={favorites.includes(item.id) ? 'star' : 'star-outline'} 
                    size={24} 
                    color={favorites.includes(item.id) ? '#FFD700' : '#999'} 
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Selected Campus Card */}
      {selectedCampus && !showList && (
        <View style={styles.selectedCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>{selectedCampus.name}</Text>
              <Text style={styles.selectedInfo}>{selectedCampus.type} • {selectedCampus.city}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(selectedCampus.id)}>
              <Ionicons 
                name={favorites.includes(selectedCampus.id) ? 'star' : 'star-outline'} 
                size={28} 
                color={favorites.includes(selectedCampus.id) ? '#FFD700' : '#999'} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.selectedInfo}>{selectedCampus.address}</Text>
          <Text style={styles.selectedInfo}>{selectedCampus.phone}</Text>
          <Text style={styles.selectedInfo}>Est. {selectedCampus.established} • {selectedCampus.studentCount.toLocaleString()} students</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={() => openDirections(selectedCampus)}>
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.actionBtnText}>Directions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34C759' }]} onPress={() => Linking.openURL(selectedCampus.website)}>
              <Ionicons name="globe" size={18} color="white" />
              <Text style={styles.actionBtnText}>Website</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={() => openApplyPage(selectedCampus)}>
              <Ionicons name="school" size={18} color="white" />
              <Text style={styles.actionBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topPanel: {
    position: 'absolute', top: 50, left: 10, right: 10,
    backgroundColor: 'white', borderRadius: 12, padding: 12, elevation: 5
  },
  search: {
    backgroundColor: '#f0f0f0', borderRadius: 8, padding: 10, marginBottom: 8
  },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  filterBtn: { padding: 8, borderRadius: 6, backgroundColor: '#eee', flex: 1, marginHorizontal: 2 },
  filterBtnActive: { backgroundColor: '#007AFF' },
  filterText: { fontSize: 12, color: '#333', textAlign: 'center' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },
  listBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, alignItems: 'center' },
  listBtnText: { color: 'white', fontWeight: 'bold' },
  listPanel: {
    position: 'absolute', top: 200, left: 10, right: 10, bottom: 100,
    backgroundColor: 'white', borderRadius: 12, elevation: 5
  },
  listItem: { 
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', 
    flexDirection: 'row', alignItems: 'center' 
  },
  listItemName: { fontWeight: 'bold', fontSize: 16 },
  listItemSub: { color: '#666', fontSize: 12, marginTop: 2 },
  selectedCard: {
    position: 'absolute', bottom: 30, left: 10, right: 10,
    backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 5
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  selectedName: { fontWeight: 'bold', fontSize: 18 },
  selectedInfo: { color: '#666', fontSize: 14, marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionBtn: { 
    flex: 1, flexDirection: 'row', padding: 10, borderRadius: 8, 
    marginHorizontal: 4, alignItems: 'center', justifyContent: 'center' 
  },
  actionBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },
});