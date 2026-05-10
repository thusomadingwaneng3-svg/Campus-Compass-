import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type CampusStats = {
  campus_name: string;
  province: string;
  apply_clicks: number;
};

type Totals = {
  total_clicks: number;
  total_universities: number;
  total_tvet: number;
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const [topCampuses, setTopCampuses] = useState<CampusStats[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_clicks: 0, total_universities: 0, total_tvet: 0 });
  const [provinceStats, setProvinceStats] = useState<{ province: string; clicks: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      // 1. Top 10 campuses by apply clicks
      const { data: topData, error: topError } = await supabase
        .from('apply_clicks')
        .select('campus_name, province')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (topError) throw topError;

      // Count clicks per campus
      const campusCounts: { [key: string]: { count: number; province: string } } = {};
      topData?.forEach(row => {
        if (!campusCounts[row.campus_name]) {
          campusCounts[row.campus_name] = { count: 0, province: row.province };
        }
        campusCounts[row.campus_name].count++;
      });

      const sortedTop = Object.entries(campusCounts)
        .map(([campus_name, data]) => ({
          campus_name,
          province: data.province,
          apply_clicks: data.count
        }))
        .sort((a, b) => b.apply_clicks - a.apply_clicks)
        .slice(0, 10);

      setTopCampuses(sortedTop);

      // 2. Totals
      const totalClicks = topData?.length || 0;
      const uniCount = sortedTop.filter(c => !c.campus_name.includes('TVET') && !c.campus_name.includes('College')).length;
      const tvetCount = sortedTop.length - uniCount;

      setTotals({
        total_clicks: totalClicks,
        total_universities: uniCount,
        total_tvet: tvetCount
      });

      // 3. By Province
      const provinceCounts: { [key: string]: number } = {};
      topData?.forEach(row => {
        provinceCounts[row.province] = (provinceCounts[row.province] || 0) + 1;
      });

      const sortedProvinces = Object.entries(provinceCounts)
        .map(([province, clicks]) => ({ province, clicks }))
        .sort((a, b) => b.clicks - a.clicks);

      setProvinceStats(sortedProvinces);

    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Ionicons name="stats-chart" size={32} color="#FFD700" />
          <Text style={styles.headerText}>CAMPUS COMPASS ANALYTICS</Text>
          <Text style={styles.subHeader}>Last 30 Days</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />}
      >
        {/* Totals Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#8B0000' }]}>
            <Text style={styles.statNumber}>{totals.total_clicks.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Apply Clicks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#003D7C' }]}>
            <Text style={styles.statNumber}>{totals.total_universities}</Text>
            <Text style={styles.statLabel}>Universities</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#228B22' }]}>
            <Text style={styles.statNumber}>{totals.total_tvet}</Text>
            <Text style={styles.statLabel}>TVET Colleges</Text>
          </View>
        </View>

        {/* Top 10 Campuses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Top 10 Most Applied-To</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : topCampuses.length === 0 ? (
            <Text style={styles.emptyText}>No apply clicks yet. Share the app!</Text>
          ) : (
            topCampuses.map((campus, index) => (
              <View key={campus.campus_name} style={styles.rankCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campusName}>{campus.campus_name}</Text>
                  <Text style={styles.provinceText}>{campus.province}</Text>
                </View>
                <View style={styles.clicksBadge}>
                  <Text style={styles.clicksNumber}>{campus.apply_clicks}</Text>
                  <Text style={styles.clicksLabel}>clicks</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* By Province */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Apply Clicks by Province</Text>
          {provinceStats.map(stat => (
            <View key={stat.province} style={styles.provinceRow}>
              <Text style={styles.provinceName}>{stat.province}</Text>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${(stat.clicks / totals.total_clicks) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.provinceClicks}>{stat.clicks}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Data updates live. Pull to refresh.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    backgroundColor: '#111827', 
    paddingTop: 16, 
    paddingBottom: 20, 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 4, 
    borderBottomColor: '#FFD700' 
  },
  backBtn: { padding: 8 },
  headerText: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  subHeader: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.9 },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  statNumber: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: 'white', fontSize: 11, opacity: 0.9, marginTop: 4, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  loadingText: { textAlign: 'center', color: '#666', padding: 20 },
  emptyText: { textAlign: 'center', color: '#666', padding: 20, fontStyle: 'italic' },
  rankCard: { 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  rankBadge: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#FFD700', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 12
  },
  rankNumber: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
  campusName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  provinceText: { fontSize: 12, color: '#666', marginTop: 2 },
  clicksBadge: { alignItems: 'flex-end' },
  clicksNumber: { fontSize: 20, fontWeight: 'bold', color: '#8B0000' },
  clicksLabel: { fontSize: 11, color: '#666' },
  provinceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  provinceName: { width: 110, fontSize: 14, fontWeight: '600', color: '#111827' },
  progressBarBg: { 
    flex: 1, 
    height: 8, 
    backgroundColor: '#E5E7EB', 
    borderRadius: 4, 
    marginHorizontal: 12,
    overflow: 'hidden'
  },
  progressBarFill: { height: '100%', backgroundColor: '#8B0000' },
  provinceClicks: { width: 40, textAlign: 'right', fontWeight: 'bold', color: '#111827' },
  footer: { textAlign: 'center', color: '#999', fontSize: 12, padding: 20 }
});