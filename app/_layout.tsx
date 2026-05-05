import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CampusProvider } from '../CampusContext';
import { Share, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Layout() {
  
  const handleShareApp = async () => {
    await Share.share({
      message: '🎓 Campus Compass: All SA institutions + 52 bursaries in one app\n\nInstall: https://campus-compass-thuso.vercel.app\n\nNo more missed deadlines. APS Calculator included.'
    });
  };

  const handleOfflineDownload = async () => {
    try {
      const funding = require('../public/data/funding.json');
      const knowledge = require('../public/data/knowledge.json');
      await AsyncStorage.setItem('offlineFunding', JSON.stringify(funding));
      await AsyncStorage.setItem('offlineKnowledge', JSON.stringify(knowledge));
      Alert.alert('Downloaded ✅', 'All SA campuses + 52 bursaries saved. App works offline now. No data needed.');
    } catch {
      Alert.alert('Error', 'Could not save offline data.');
    }
  };

  const handleSyncData = async () => {
    try {
      const res = await fetch('https://campus-compass-thuso.vercel.app/public/data/funding.json');
      const data = await res.json();
      await AsyncStorage.setItem('offlineFunding', JSON.stringify(data));
      Alert.alert('Updated ✅', `Synced ${data.length} bursaries. Restart app to see changes.`);
    } catch {
      Alert.alert('No Internet', 'Connect to WiFi to update bursary data.');
    }
  };

  const handleReport = () => {
    Linking.openURL('mailto:support@campuscompass.co.za?subject=Wrong%20Bursary%20Info&body=Bursary%20name:%20%0AWhat%20is%20wrong:%20%0A%0AScreenshot%20link%20(optional):%20');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CampusProvider>
        <Drawer
          screenOptions={{
            headerStyle: { backgroundColor: '#8B0000' },
            headerTintColor: '#FFD700',
            drawerActiveTintColor: '#8B0000',
            drawerLabelStyle: { fontSize: 15 }
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: 'ALL SA Institutions',
              title: 'ALL SA INSTITUTIONS',
              drawerIcon: ({color}) => <Ionicons name="school" size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="chat"
            options={{
              drawerLabel: 'AI Chat - Thuso',
              title: 'Campus AI',
              drawerIcon: ({color}) => <Ionicons name="chatbubbles" size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="aps"
            options={{
              drawerLabel: 'APS Calculator',
              title: 'APS Calculator', 
              drawerIcon: ({color}) => <Ionicons name="calculator" size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="emergency"
            options={{
              drawerLabel: 'Emergency Hub',
              title: 'Campus Emergency Hub',
              drawerIcon: ({color}) => <Ionicons name="warning" size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="map"
            options={{
              drawerLabel: 'Campus Map',
              title: 'Campus Map',
              drawerIcon: ({color}) => <Ionicons name="map" size={22} color={color} />,
            }}
          />
          
          {/* Utilities */}
          <Drawer.Screen
            name="offline"
            listeners={{
              drawerItemPress: (e) => {
                e.preventDefault();
                handleOfflineDownload();
              }
            }}
            options={{
              drawerLabel: 'Download for Offline',
              drawerIcon: ({color}) => <Ionicons name="cloud-download" size={22} color={color} />,
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
              drawerLabel: 'Update Bursary Data',
              drawerIcon: ({color}) => <Ionicons name="sync" size={22} color={color} />,
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
              drawerIcon: ({color}) => <Ionicons name="share-social" size={22} color={color} />,
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
              drawerLabel: 'Report Wrong Info',
              drawerIcon: ({color}) => <Ionicons name="flag" size={22} color={color} />,
            }}
          />
          <Drawer.Screen
            name="pro"
            options={{
              drawerLabel: 'Upgrade to Pro - R5/month',
              title: 'Campus Compass Pro',
              drawerIcon: ({color}) => <Ionicons name="star" size={22} color={color} />,
            }}
          />
        </Drawer>
      </CampusProvider>
    </GestureHandlerRootView>
  );
}