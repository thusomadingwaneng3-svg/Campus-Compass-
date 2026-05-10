import React, { useContext, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CampusContext } from '../CampusContext';

export default function EmergencyHub() {
  const { allCampuses } = useContext(CampusContext);
  const [search, setSearch] = useState('');
  const [expandedNational, setExpandedNational] = useState({});
  const [expandAllNational, setExpandAllNational] = useState(false);

  const filtered = useMemo(() => allCampuses.filter(inst =>
    inst.name.toLowerCase().includes(search.toLowerCase()) ||
    inst.short.toLowerCase().includes(search.toLowerCase()) ||
    inst.city.toLowerCase().includes(search.toLowerCase())
  ), [allCampuses, search]);

  const call = (num) => {
    if (!num) return;
    Linking.openURL(`tel:${num.replace(/\s/g, '')}`);
  };

  const handlePanicCall = (campus) => {
    call(campus.security_phone || campus.emergency?.security);
  };

  const handleEmail = (email) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleNavigate = (campus) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${campus.latitude},${campus.longitude}`;
    Linking.openURL(url);
  };

  const toggleNational = (id) => {
    setExpandedNational(prev => ({...prev, [id]:!prev[id] }));
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
             .map(i => i.security_phone || i.emergency?.security)
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />
      <View style={styles.header}>
        <Ionicons name="warning" size={28} color="#FFD700" />
        <Text style={styles.headerText}>SA CAMPUS EMERGENCY HUB</Text>
        <Ionicons name="warning" size={28} color="#FFD700" />
      </View>

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

      <ScrollView style={styles.list}>
        {filtered.map((campus) => {
          const showNational = expandAllNational || expandedNational[campus.id];
          return (
            <View key={campus.id} style={[styles.card, { borderLeftColor: campus.primaryColor }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{campus.short}</Text>
                  <Text style={styles.fullName}>{campus.name}</Text>
                  <Text style={styles.city}>{campus.city}, {campus.province}</Text>
                </View>
                <View style={[styles.colorDot, { backgroundColor: campus.primaryColor }]} />
              </View>

              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.red]} onPress={() => handlePanicCall(campus)}>
                  <Ionicons name="call" size={18} color="white" />
                  <Text style={styles.btnText}>Security: {campus.security_phone || campus.emergency?.security}</Text>
                </TouchableOpacity>
              </View>

              {(campus.medical_phone || campus.emergency?.medical) && (
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.btn, styles.orange]} onPress={() => call(campus.medical_phone || campus.emergency?.medical)}>
                    <Ionicons name="medical" size={18} color="white" />
                    <Text style={styles.btnText}>Medical: {campus.medical_phone || campus.emergency?.medical}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.blue]} onPress={() => handleNavigate(campus)}>
                  <Ionicons name="navigate" size={18} color="white" />
                  <Text style={styles.btnText}>Navigate to Campus</Text>
                </TouchableOpacity>
              </View>

              {campus.email && (
                <TouchableOpacity style={[styles.btn, styles.green]} onPress={() => handleEmail(campus.email)}>
                  <Ionicons name="mail" size={18} color="white" />
                  <Text style={styles.btnText}>{campus.email}</Text>
                </TouchableOpacity>
              )}

              {/* National Emergency Numbers - Collapsible */}
              <View style={styles.nationalBox}>
                <TouchableOpacity
                  style={styles.nationalHeader}
                  onPress={() => toggleNational(campus.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nationalTitle}>National Emergency Numbers</Text>
                  <Ionicons
                    name={showNational? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {showNational && (
                  <View style={styles.nationalGrid}>
                    {Object.entries(campus.emergency?.national || {}).map(([key, num]) => (
                      <TouchableOpacity key={key} style={styles.nationalBtn} onPress={() => call(num)}>
                        <Text style={styles.nationalLabel}>{key.replace('_', ' ').toUpperCase()}</Text>
                        <Text style={styles.nationalNum}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No institutions found</Text>
            <Text style={styles.emptySubText}>Try searching by city or short name</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#8B0000', paddingTop: 50, paddingBottom: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  headerText: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  count: { fontSize: 14, color: '#666', fontWeight: '600' },
  expandAllText: { fontSize: 13, color: '#1E90FF', fontWeight: '600' },
  massPanic: { backgroundColor: '#DC143C', margin: 12, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 5 },
  massPanicText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  search: { backgroundColor: 'white', marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#DDD' },
  list: { paddingHorizontal: 12 },
  card: { backgroundColor: 'white', marginBottom: 12, padding: 16, borderRadius: 12, borderLeftWidth: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  fullName: { fontSize: 13, color: '#666', marginTop: 2 },
  city: { fontSize: 12, color: '#999', marginTop: 2 },
  row: { marginVertical: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8 },
  btnText: { color: 'white', fontWeight: '600', fontSize: 14, flexShrink: 1 },
  red: { backgroundColor: '#DC143C' },
  blue: { backgroundColor: '#1E90FF' },
  green: { backgroundColor: '#228B22' },
  orange: { backgroundColor: '#FF8C00' },
  nationalBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  nationalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  nationalTitle: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  nationalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  nationalBtn: { backgroundColor: '#f0f0f0', padding: 8, borderRadius: 6, minWidth: '48%' },
  nationalLabel: { fontSize: 10, color: '#666', fontWeight: '600' },
  nationalNum: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#999', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#bbb', marginTop: 4 },
});