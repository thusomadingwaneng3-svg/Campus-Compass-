import { View, Text, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useEffect, useState } from 'react';

export default function Download() {
  const apkUrl = "https://expo.dev/artifacts/eas/iokv5HrRJ2qbHU5xsCmjwZ.apk";
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownload = async () => {
    if (Platform.OS === 'web' && deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (Platform.OS === 'web') {
      Alert.alert(
        'Install App', 
        'Open this site in Chrome and tap "Install App" in the menu. iOS: Use "Add to Home Screen"'
      );
    } else {
      Linking.openURL(apkUrl);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Campus Compass</Text>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 }}>
        Find SA universities, TVETs & private colleges near you
      </Text>

      <TouchableOpacity 
        onPress={handleDownload}
        style={{ backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {Platform.OS === 'web' ? 'Install App' : 'Download for Android'}
        </Text>
      </TouchableOpacity>

      {Platform.OS !== 'web' && (
        <TouchableOpacity onPress={() => Linking.openURL(apkUrl)}>
          <Text style={{ marginTop: 12, fontSize: 14, color: '#007AFF' }}>
            Download APK directly
          </Text>
        </TouchableOpacity>
      )}

      <Text style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
        Android 8.0+ required • No data collected
      </Text>

      <TouchableOpacity onPress={() => Linking.openURL('https://campus-compass-thuso.vercel.app/privacy')}>
        <Text style={{ marginTop: 24, color: '#007AFF' }}>Privacy Policy</Text>
      </TouchableOpacity>
    </View>
  );
}