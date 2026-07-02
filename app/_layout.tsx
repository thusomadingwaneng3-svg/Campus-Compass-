import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CampusProvider } from '../CampusContext';
import { AuthProvider } from '../lib/AuthContext'; // V66: Auth
import { Share, Alert, Linking, Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const emojiMap: Record<string, string> = {
  home: '🏠', 'home-outline': '🏠',
  school: '🏫', 'school-outline': '🏫',
  campus: '🎓', 'campus-outline': '🎓',
  location: '📍', 'location-outline': '📍',
  chatbubbles: '💬', 'chatbubbles-outline': '💬',
  alarm: '⏰', 'alarm-outline': '⏰',
  'bar-chart': '📊', 'bar-chart-outline': '📊',
  calculator: '🧮', 'calculator-outline': '🧮',
  warning: '⚠️', 'warning-outline': '⚠️',
  'log-in': '🔑', 'log-in-outline': '🔑',
  download: '⬇️', 'download-outline': '⬇️',
  'checkmark-circle': '✅',
  'share-social': '📤', 'share-social-outline': '📤',
  flag: '🚩', 'flag-outline': '🚩',
  menu: '☰'
};

function GlamIcon({ name, focused, gradient, bg }: any) {
  return (
    <View style={[styles.iconWrapper, { backgroundColor: focused? bg : bg + '40' }]}>
      <LinearGradient colors={gradient} style={[styles.iconGradient, { opacity: focused? 1 : 0.6 }]}>
        <Text style={{ fontSize: 18 }}>{emojiMap[name] || '•'}</Text>
      </LinearGradient>
    </View>
  );
}

function CustomDrawerContent(props: any) {
  const [counts, setCounts] = useState({ institutions: 0, saBursaries: 0, africaBursaries: 0, closingSoon: 0 });
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const isFocused = useIsFocused();

  const loadUnread = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return setUnread(0);
    const { data: campuses } = await supabase.from('user_campuses').select('institution_id, last_read_at');
    if (!campuses?.length) return setUnread(0);
    const roomIds = (await supabase.from('institution_rooms').select('id').in('institution_id', campuses.map(c => c.institution_id))).data?.map(r => r.id) || [];
    if (!roomIds.length) return setUnread(0);
    let total = 0;
    for (const c of campuses) {
      const { count } = await supabase.from('room_messages').select('id', { count: 'exact', head: true }).in('room_id', roomIds).gt('created_at', c.last_read_at || '1970-01-01');
      total += count || 0;
    }
    setUnread(total);
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const in60Days = new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0];
        const [instRes, saRes, africaRes, closingRes, lastUpd] = await Promise.all([
          supabase.from('institutions').select('id', { count: 'exact', head: true }),
          supabase.from('bursaries').select('id', { count: 'exact', head: true }).eq('region', 'SA'),
          supabase.from('bursaries').select('id', { count: 'exact', head: true }).eq('region', 'Africa'),
          supabase.from('institutions').select('id', { count: 'exact', head: true }).gte('application_deadline_2026', today).lte('application_deadline_2026', in60Days),
          AsyncStorage.getItem('offlineLastUpdated')
        ]);
        setCounts({ institutions: instRes.count || 0, saBursaries: saRes.count || 0, africaBursaries: africaRes.count || 0, closingSoon: closingRes.count || 0 });
        setLastUpdate(lastUpd);
      } catch (e) { console.log('Failed to load counts:', e); }
    };
    loadCounts();
    loadUnread();
  }, [loadUnread]);

  useEffect(() => { if (isFocused) loadUnread(); }, [isFocused, loadUnread]);
  const lastUpdateText = lastUpdate? new Date(lastUpdate).toLocaleDateString('en-ZA') : 'Never';

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <LinearGradient colors={['#C44569', '#8B0000']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={styles.logoBox}><Text style={{ fontSize: 28 }}>🏫</Text></View>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', marginLeft: 10 }}>Campus Compass</Text>
        </View>
        <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '600', marginLeft: 56 }}>{counts.institutions}+ Institutions • {counts.closingSoon} Closing Soon</Text>
        <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '500', marginLeft: 56, marginTop: 4 }}>Data updated: {lastUpdateText}</Text>
      </LinearGradient>
      <View style={{ paddingTop: 16, paddingHorizontal: 8 }}><DrawerItemList {...props} /></View>
      <TouchableOpacity onPress={() => props.navigation.navigate('my-campuses')} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 8, borderRadius: 16, backgroundColor: '#F0FDF4' }}>
        <View style={[styles.iconWrapper, { backgroundColor: '#F0FDF4' }]}><LinearGradient colors={['#10B981', '#059669']} style={styles.iconGradient}><Text style={{ fontSize: 18 }}>{emojiMap.campus}</Text></LinearGradient></View>
        <Text style={{ fontSize: 15, fontWeight: '700', marginLeft: 12, flex: 1, color: '#059669' }}>My Campuses</Text>
        {unread > 0 && <View style={{ backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{unread}</Text></View>}
      </TouchableOpacity>
      <View style={{ padding: 16, marginTop: 20, borderTopWidth: 1, borderColor: '#eee' }}><Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>v1.0.0 • Powered by Supabase</Text></View>
    </DrawerContentScrollView>
  );
}

export default function Layout() {
  const navigation = useNavigation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const autoSync = async () => {
      try {
        const lastSync = await AsyncStorage.getItem('offlineLastUpdated');
        const hoursSince = lastSync? (Date.now() - new Date(lastSync).getTime()) / 3600000 : 999;
        if (hoursSince > 24) {
          const { data } = await supabase.from('institutions').select('*');
          if (data) { await AsyncStorage.setItem('offlineInstitutions', JSON.stringify(data)); await AsyncStorage.setItem('offlineLastUpdated', new Date().toISOString()); }
        }
      } catch (e) { console.log('Auto-sync failed, using cache'); }
    };
    setTimeout(autoSync, 3000);
  }, []);

  useEffect(() => {
    if (Platform.OS!== 'web') return;
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => { if (Platform.OS === 'web') return; Location.requestForegroundPermissionsAsync(); }, []);
  const handleShareApp = async () => { await Share.share({ message: '🎓 Campus Compass: All SA institutions + bursaries in one app\nInstall: https://campus-compass-thuso.vercel.app\nNo more missed deadlines. APS Calculator included.' }); };
  const handleInstallApp = async () => {
    if (isInstalled) return Alert.alert('Already Installed', 'Campus Compass is already on your home screen');
    if (Platform.OS!== 'web') return Alert.alert('Install App', 'Download from Play Store for the native app');
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); setIsInstalled(true); return; }
    Alert.alert('Install App', 'Open in Chrome/Edge and tap install icon in address bar');
  };
  const handleReport = () => { Linking.openURL('mailto:support@campuscompass.co.za?subject=Wrong%20Info'); };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider> {/* V66: This fixes useAuth crash */}
        <CampusProvider>
          <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              headerShown: true, headerStyle: { backgroundColor: '#8B0000', elevation: 4 }, headerTintColor: '#FFD700',
              headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
              headerLeft: () => (<TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginLeft: 16, padding: 8 }}><Text style={{ fontSize: 28, color: '#FFD700' }}>{emojiMap.menu}</Text></TouchableOpacity>),
              drawerActiveBackgroundColor: 'transparent', drawerActiveTintColor: '#8B0000', drawerInactiveTintColor: '#6B7280',
              drawerLabelStyle: { fontSize: 15, fontWeight: '700', marginLeft: -8 }, drawerItemStyle: { borderRadius: 16, marginHorizontal: 8, marginVertical: 3 },
              drawerStyle: { backgroundColor: '#fff', width: Platform.OS === 'web'? 380 : 300 }
            }}
          >
            <Drawer.Screen name="index" options={{ drawerLabel: 'Home', title: 'CAMPUS COMPASS', drawerIcon: ({ focused }) => <GlamIcon name={focused? "home" : "home-outline"} focused={focused} gradient={['#FF6B9D', '#C44569']} bg="#FFF0F5" /> }} />
            <Drawer.Screen name="institutions" options={{ drawerLabel: 'All Institutions', title: 'SA & AFRICA INSTITUTIONS', drawerIcon: ({ focused }) => <GlamIcon name={focused? "school" : "school-outline"} focused={focused} gradient={['#4F46E5', '#7C3AED']} bg="#F5F3FF" /> }} />
            <Drawer.Screen name="map" initialParams={{ mode: 'cluster' }} options={{ drawerLabel: 'Map View', title: 'Institutions Map', drawerIcon: ({ focused }) => <GlamIcon name={focused? "location" : "location-outline"} focused={focused} gradient={['#10B981', '#059669']} bg="#F0FDF4" /> }} />
            <Drawer.Screen name="chat" options={{ drawerLabel: 'AI Chat - Thuso', title: 'Campus AI', drawerIcon: ({ focused }) => <GlamIcon name={focused? "chatbubbles" : "chatbubbles-outline"} focused={focused} gradient={['#F59E0B', '#D97706']} bg="#FFFBEB" /> }} />
            <Drawer.Screen name="my-campuses" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="institution-chat" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="deadlines" options={{ drawerLabel: 'Deadlines Tracker', title: 'Application Deadlines', drawerIcon: ({ focused }) => <GlamIcon name={focused? "alarm" : "alarm-outline"} focused={focused} gradient={['#EF4444', '#DC2626']} bg="#FEF2F2" /> }} />
            <Drawer.Screen name="compare" options={{ drawerLabel: 'Compare Unis', title: 'Compare Institutions', drawerIcon: ({ focused }) => <GlamIcon name={focused? "bar-chart" : "bar-chart-outline"} focused={focused} gradient={['#8B5CF6', '#7C3AED']} bg="#F5F3FF" /> }} />
            <Drawer.Screen name="aps" options={{ drawerLabel: 'APS Calculator', title: 'APS Calculator', drawerIcon: ({ focused }) => <GlamIcon name={focused? "calculator" : "calculator-outline"} focused={focused} gradient={['#3B82F6', '#2563EB']} bg="#EFF6FF" />, drawerItemStyle: { borderRadius: 16, marginHorizontal: 8, marginVertical: 3, marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 } }} />
            <Drawer.Screen name="emergency" options={{ drawerLabel: 'Emergency Hub', title: 'Campus Emergency Hub', drawerIcon: ({ focused }) => <GlamIcon name={focused? "warning" : "warning-outline"} focused={focused} gradient={['#EF4444', '#DC2626']} bg="#FEF2F2" /> }} />
            <Drawer.Screen name="login" options={{ drawerLabel: 'Login / Register', title: 'Login', drawerIcon: ({ focused }) => <GlamIcon name={focused? "log-in" : "log-in-outline"} focused={focused} gradient={['#06B6D4', '#0891B2']} bg="#ECFEFF" /> }} />
            <Drawer.Screen name="install" listeners={{ drawerItemPress: (e) => { e.preventDefault(); handleInstallApp(); } }} options={{ drawerLabel: isInstalled? 'Installed ✓' : 'Add to Home Screen', drawerIcon: ({ focused }) => <GlamIcon name={isInstalled? "checkmark-circle" : focused? "download" : "download-outline"} focused={focused} gradient={['#22C55E', '#16A34A']} bg="#F0FDF4" /> }} />
            <Drawer.Screen name="share" listeners={{ drawerItemPress: (e) => { e.preventDefault(); handleShareApp(); } }} options={{ drawerLabel: 'Share App', drawerIcon: ({ focused }) => <GlamIcon name={focused? "share-social" : "share-social-outline"} focused={focused} gradient={['#F97316', '#EA580C']} bg="#FFF7ED" /> }} />
            <Drawer.Screen name="report" listeners={{ drawerItemPress: (e) => { e.preventDefault(); handleReport(); } }} options={{ drawerLabel: 'Report Issue', drawerIcon: ({ focused }) => <GlamIcon name={focused? "flag" : "flag-outline"} focused={focused} gradient={['#DC2626', '#B91C1C']} bg="#FEF2F2" /> }} />
            <Drawer.Screen name="(internal)/pass" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/links" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/offline" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/privacy" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/support" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/analytics" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/changelog" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/ambassador" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/institution/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/apply/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="(internal)/services/dataService" options={{ drawerItemStyle: { display: 'none' } }} />
            {/* V66: DELETED api/ai-web/route and api/copilot/route from here */}
            <Drawer.Screen name="pro" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="sync" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="power" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="accommodation" options={{ drawerItemStyle: { display: 'none' } }} />
          </Drawer>
        </CampusProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 50, paddingBottom: 24, borderBottomRightRadius: 24 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconGradient: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }
});