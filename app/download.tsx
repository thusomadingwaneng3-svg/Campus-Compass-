import { View, Text, TouchableOpacity, Linking } from 'react-native';

export default function Download() {
  const apkUrl = "https://expo.dev/artifacts/eas/iokv5HrRJ2qbHU5xsCmjwZ.apk";

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Campus Compass</Text>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 }}>
        Find SA universities, TVETs & private colleges near you
      </Text>

      <TouchableOpacity 
        onPress={() => Linking.openURL(apkUrl)}
        style={{ backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Download for Android</Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
        Android 8.0+ required • No data collected
      </Text>

      <TouchableOpacity onPress={() => Linking.openURL('/privacy')}>
        <Text style={{ marginTop: 24, color: '#007AFF' }}>Privacy Policy</Text>
      </TouchableOpacity>
    </View>
  );
}