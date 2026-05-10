import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, TextInput, StyleSheet } from 'react-native';
import { UNIVERSITY_CONTACTS } from '../data/universityContacts';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function ContactsScreen() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('universities'); // 'universities' or 'tvetColleges'

  const data = selectedType === 'universities' 
    ? UNIVERSITY_CONTACTS.universities 
    : UNIVERSITY_CONTACTS.tvetColleges;

  const filtered = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.offices.some(o => o.office.toLowerCase().includes(search.toLowerCase()))
  );

  const openEmail = (email) => {
    if (email.includes('Check') || email.includes('@')) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const callPhone = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderOffice = ({ item: office }) => (
    <View style={styles.officeRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.officeName}>{office.office}</Text>
        <TouchableOpacity onPress={() => openEmail(office.email)}>
          <Text style={styles.email}>{office.email}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => callPhone(office.phone)}>
          <Text style={styles.phone}>{office.phone}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => callPhone(office.phone)}>
        <Icon name="phone" size={24} color="#1976d2" />
      </TouchableOpacity>
    </View>
  );

  const renderInstitution = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.uniName}>{item.name}</Text>
      <Text style={styles.province}>{item.province || item.shortName}</Text>
      <FlatList
        data={item.offices}
        renderItem={renderOffice}
        keyExtractor={(o, i) => `${item.name}-${i}`}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedType === 'universities' && styles.activeTab]} 
          onPress={() => setSelectedType('universities')}>
          <Text style={styles.tabText}>Universities</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedType === 'tvetColleges' && styles.activeTab]} 
          onPress={() => setSelectedType('tvetColleges')}>
          <Text style={styles.tabText}>TVET Colleges</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search university, college, or office..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        renderItem={renderInstitution}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff' },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#1976d2' },
  tabText: { fontWeight: '600', fontSize: 16 },
  search: { 
    backgroundColor: '#fff', margin: 12, padding: 12, 
    borderRadius: 8, fontSize: 16, elevation: 2 
  },
  card: { 
    backgroundColor: '#fff', margin: 12, marginTop: 0, 
    padding: 16, borderRadius: 8, elevation: 2 
  },
  uniName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  province: { fontSize: 14, color: '#666', marginBottom: 12 },
  officeRow: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee' 
  },
  officeName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  email: { fontSize: 14, color: '#1976d2', marginBottom: 2 },
  phone: { fontSize: 14, color: '#333' },
});