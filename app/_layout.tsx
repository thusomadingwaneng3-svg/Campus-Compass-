import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CampusProvider } from '../CampusContext';
import { Share, Alert, Linking, Platform, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

const BASE_URL = 'https://campus-compass-thuso.vercel.app';

function CustomDrawerContent(props: any) {
  const navigation = useNavigation<any>();
  const [counts, setCounts] = useState({ institutions: 90, saBursaries: 0, africaBursaries: 0, schools: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [funding, africaBursaries, knowledge, schools] = await Promise.all([
          AsyncStorage.getItem('offlineFunding'),
          AsyncStorage.getItem('offlineAfricaBursaries'),
          AsyncStorage.getItem('offlineKnowledge'),
          AsyncStorage.getItem('offlineSchoolsAfrica')
        ]);

        const saBursaries = funding ? JSON.parse(funding).length : 0;
        const afBursaries = africaBursaries ? JSON.parse(africaBursaries).length : 0;
        const schoolCount = schools ? JSON.parse(schools).length : 0;
        
        let instCount = 90;
        if (knowledge) {
          const k = JSON.parse(knowledge);
          instCount = (k.institutions?.length || 0) + (k.tvet_colleges?.length || 0) + (k.private_institutions?.length || 0);
        }

        setCounts({ institutions: instCount, saBursaries, africaBursaries: afBursaries, schools: schoolCount });
      } catch (e) {
        console.log('Failed to load counts:', e);
      }
    };
    loadCounts();
  }, []);

  const totalBursaries = counts.saBursaries + counts.africaBursaries;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: '#8B0000', 
        padding: 20, 
        paddingTop: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="school" size={32} color="#FFD700" />
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginLeft: 10 }}>
            Campus Compass
          </Text>
        </View>
        <Text style={{ color: '#FFD700', fontSize: 13, opacity: 0.9 }}>
          {counts.institutions}+ Institutions • {totalBursaries} Bursaries • {counts.schools} Schools • Offline Ready
        </Text>
      </View>

      {/* Default items */}
      <View style={{ paddingTop: 10 }}>
        <DrawerItemList {...props} />
      </View>

      {/* Quick Actions */}
      <View style={{ padding: 16, marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '600' }}>
          QUICK ACTIONS
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('copilot')}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
        >
          <Ionicons name="sparkles" size={20} color="#8B0000" />
          <Text style={{ marginLeft: 12, fontSize: 15, color: '#333' }}>AI Copilot</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ padding: 16, marginTop: 20, borderTopWidth: 1, borderColor: '#eee' }}>
        <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
          v1.0.0 • Made for SA Students
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function Layout() {
  const navigation = useNavigation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleShareApp = async () => {
    await Share.share({
      message: '🎓 Campus Compass: All SA institutions + bursaries in one app\nInstall: https://campus-compass-thuso.vercel.app\nNo more missed deadlines. APS Calculator included.'
    });
  };

  const handleInstallApp = async () => {
    if (isInstalled) {
      Alert.alert('Already Installed', 'Campus Compass is already on your home screen');
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert('Install App', 'Download from Play Store for the native app');
      return;
    }
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

    if (isIOS && isSafari) {
      Alert.alert(
        'Install App',
        '1. Tap the Share button at the bottom\n2. Scroll and tap "Add to Home Screen"\n3. Tap Add'
      );
    } else if (isIOS) {
      Alert.alert(
        'Install App',
        'Open this page in Safari to install. Chrome on iOS doesn\'t support install.'
      );
    } else {
      Alert.alert(
        'Install App',
        'Open this site in Chrome or Edge. Look for the install icon in the address bar, or use Menu > Install App'
      );
    }
  };

  const handleOfflineDownload = async () => {
    try {
      Alert.alert('Downloading', 'This may take 30-90s depending on your connection');

      const [fundingRes, knowledgeRes, africaRes, bursaryRes, schoolRes] = await Promise.all([
        fetch(`${BASE_URL}/data/funding.json`),
        fetch(`${BASE_URL}/data/knowledge.json`),
        fetch(`${BASE_URL}/data/africa_non_sa.json`),
        fetch(`${BASE_URL}/data/africa_bursaries.json`),
        fetch(`${BASE_URL}/data/schools_africa.json`)
      ]);

      if (!fundingRes.ok || !knowledgeRes.ok || !africaRes.ok || !bursaryRes.ok || !schoolRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const funding = await fundingRes.json();
      const knowledge = await knowledgeRes.json();
      const africa = await africaRes.json();
      const bursaries = await bursaryRes.json();
      const schools = await schoolRes.json();

      await AsyncStorage.setItem('offlineFunding', JSON.stringify(funding));
      await AsyncStorage.setItem('offlineKnowledge', JSON.stringify(knowledge));
      await AsyncStorage.setItem('offlineAfricaNonSA', JSON.stringify(africa));
      await AsyncStorage.setItem('offlineAfricaBursaries', JSON.stringify(bursaries));
      await AsyncStorage.setItem('offlineSchoolsAfrica', JSON.stringify(schools));
      await AsyncStorage.setItem('offlineLastUpdated', new Date().toISOString());

      const tertiaryCount = (knowledge.institutions?.length || 0) + 
                           (knowledge.tvet_colleges?.length || 0) + 
                           (knowledge.private_institutions?.length || 0);

      Alert.alert(
        'Downloaded ✅', 
        `All data saved offline.\nTertiary: ${tertiaryCount}\nSA Bursaries: ${funding.length}\nAfrica Bursaries: ${bursaries.length}\nAfrica Institutions: ${africa.length}\nAfrica Schools: ${schools.length}`
      );
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not save offline data. Check your internet connection.');
    }
  };

  const handleSyncData = async () => {
    try {
      const [fundingRes, africaRes, bursaryRes, schoolRes] = await Promise.all([
        fetch(`${BASE_URL}/data/funding.json`),
        fetch(`${BASE_URL}/data/africa_non_sa.json`),
        fetch(`${BASE_URL}/data/africa_bursaries.json`),
        fetch(`${BASE_URL}/data/schools_africa.json`)
      ]);
      
      if (!fundingRes.ok || !africaRes.ok || !bursaryRes.ok || !schoolRes.ok) throw new Error('Fetch failed');
      
      const funding = await fundingRes.json();
      const africa = await africaRes.json();
      const bursaries = await bursaryRes.json();
      const schools = await schoolRes.json();
      
      await AsyncStorage.setItem('offlineFunding', JSON.stringify(funding));
      await AsyncStorage.setItem('offlineAfricaNonSA', JSON.stringify(africa));
      await AsyncStorage.setItem('offlineAfricaBursaries', JSON.stringify(bursaries));
      await AsyncStorage.setItem('offlineSchoolsAfrica', JSON.stringify(schools));
      await AsyncStorage.setItem('offlineLastUpdated', new Date().toISOString());
      
      Alert.alert('Updated ✅', `Synced ${funding.length} SA bursaries, ${bursaries.length} Africa bursaries, ${africa.length} Africa institutions, ${schools.length} schools.`);
    } catch {
      Alert.alert('No Internet', 'Connect to WiFi to update data.');
    }
  };

  const handleReport = () => {
    Linking.openURL('mailto:support@campuscompass.co.za?subject=Wrong%20Bursary%20Info&body=Bursary%20name:%20%0AWhat%20is%20wrong:%20%0A%0AScreenshot%20link%20(optional):%20');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CampusProvider>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: true,
            headerStyle: { 
              backgroundColor: '#8B0000',
              elevation: 4,
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 }
            },
            headerTintColor: '#FFD700',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
            headerLeft: ({ tintColor }) => (
              <TouchableOpacity
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                style={{ marginLeft: 16, padding: 8 }}
              >
                <Ionicons name="menu" size={28} color={tintColor} />
              </TouchableOpacity>
            ),
            drawerActiveBackgroundColor: '#8B0000',
            drawerActiveTintColor: '#fff',
            drawerInactiveTintColor: '#333',
            drawerLabelStyle: { fontSize: 15, fontWeight: '500', marginLeft: -10 },
            drawerItemStyle: { 
              borderRadius: 12, 
              marginHorizontal: 10, 
              marginVertical: 2,
              paddingVertical: 4
            },
            drawerStyle: { 
              backgroundColor: '#fff',
              width: Platform.OS === 'web' ? 420 : 320
            }
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: 'Home',
              title: 'CAMPUS COMPASS',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="institutions"
            options={{
              drawerLabel: 'All Institutions',
              title: 'SA & AFRICA INSTITUTIONS',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "school" : "school-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="map"
            initialParams={{ mode: 'cluster' }}
            options={{
              drawerLabel: 'Maps',
              title: 'institutions',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "location" : "location-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="chat"
            options={{
              drawerLabel: 'AI Chat - Thuso',
              title: 'Campus AI',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="copilot"
            options={{
              drawerLabel: 'AI Copilot',
              title: 'Campus Copilot',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="aps"
            options={{
              drawerLabel: 'APS Calculator',
              title: 'APS Calculator',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "calculator" : "calculator-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="emergency"
            options={{
              drawerLabel: 'Emergency Hub',
              title: 'Campus Emergency Hub',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "warning" : "warning-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="accommodation"
            options={{
              drawerLabel: 'Residences & Accommodation',
              title: 'SA Residences',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "bed" : "bed-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="offline"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleOfflineDownload();
              }
            }}
            options={{
              drawerLabel: 'Download Offline',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "cloud-download" : "cloud-download-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="install"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleInstallApp();
              }
            }}
            options={{
              drawerLabel: isInstalled ? 'Installed' : 'Add to Home Screen',
              drawerIcon: ({ color, focused }) => (
                <Ionicons 
                  name={isInstalled ? "checkmark-circle" : focused ? "download" : "download-outline"} 
                  size={22} 
                  color={isInstalled ? "#4CAF50" : color} 
                />
              ),
            }}
          />

          <Drawer.Screen
            name="sync"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleSyncData();
              }
            }}
            options={{
              drawerLabel: 'Sync Data',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "sync" : "sync-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="share"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleShareApp();
              }
            }}
            options={{
              drawerLabel: 'Share App',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "share-social" : "share-social-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="report"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleReport();
              }
            }}
            options={{
              drawerLabel: 'Report Issue',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "flag" : "flag-outline"} size={22} color={color} />
              ),
            }}
          />

          <Drawer.Screen
            name="pro"
            options={{
              drawerLabel: 'Upgrade to Pro',
              title: 'Campus Compass Pro',
              drawerIcon: ({ color, focused }) => (
                <Ionicons name="star" size={22} color={color} />
              ),
            }}
          />

          {/* Hidden screens */}
          <Drawer.Screen
            name="services/dataService"
            options={{ drawerHidden: true }}
          />
          <Drawer.Screen
            name="institution/[id]"
            options={{ drawerHidden: true }}
          />
        </Drawer>
      </CampusProvider>
    </GestureHandlerRootView>
  );
}