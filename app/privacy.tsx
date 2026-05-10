import { ScrollView, View, Text } from 'react-native';

export default function Privacy() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 24, maxWidth: 700, alignSelf: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Privacy Policy</Text>
        
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
          <Text style={{ fontWeight: '600' }}>Last updated:</Text> 10 May 2026
        </Text>

        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          1. Data We Collect
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
          Campus Compass does not collect, store, or share any personal data. 
          The app loads public institution data from a local file on your device.
        </Text>

        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          2. Location Permission
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
          If you enable location, we use it only to show institutions near you. 
          Your location is not sent to our servers or shared with third parties.
        </Text>

        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          3. Third-Party Links
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
          The app links to external university and college websites. 
          We are not responsible for their privacy practices.
        </Text>

        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          4. Contact
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24 }}>
          For questions or to report data issues, contact: 
          {'\n'}campuscompass.support@gmail.com
        </Text>
      </View>
    </ScrollView>
  );
}