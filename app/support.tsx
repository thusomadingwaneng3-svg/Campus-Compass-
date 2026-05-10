import { ScrollView, View, Text, Linking, TouchableOpacity } from 'react-native';

export default function Support() {
  const openEmail = () => Linking.openURL('mailto:thusomadingwaneng3@gmail.com');
  const openForm = () => Linking.openURL('https://forms.gle/TvpvrJJ4c7UbG9Q19'); // replace this

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 24, maxWidth: 700, alignSelf: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Support</Text>
        
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 24 }}>
          Need help or found incorrect info? We’ve got you.
        </Text>

        <TouchableOpacity 
          onPress={openEmail}
          style={{ backgroundColor: '#000', padding: 16, borderRadius: 8, marginBottom: 12 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
            Email Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={openForm}
          style={{ backgroundColor: '#f2f2f2', padding: 16, borderRadius: 8, marginBottom: 24 }}
        >
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
            Report Incorrect Data
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>FAQ</Text>
        
        <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12 }}>Why can’t I install the APK?</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
          Go to Settings > Security > Install unknown apps > allow your browser. 
          Only install APKs from campus-compass-thuso.vercel.app.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 12 }}>Is my data safe?</Text>
        <Text style={{ fontSize: 16, lineHeight: 24 }}>
          Yes. We don’t collect or store any personal data. See our Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}