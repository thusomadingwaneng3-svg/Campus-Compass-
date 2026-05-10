import { ScrollView, Text } from 'react-native';
export default function Changelog() {
  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>What's New</Text>
      <Text style={{ fontSize: 16, lineHeight: 24 }}>
        {`May 2, 2026\n• Added 52 verified 2027 bursaries\n• Install App button for offline use\n• Deadline reminders\n• Fuzzy search - handles typos\n• Save favourite bursaries\n\nApr 15, 2026\n• All 75 SA institutions\n• Emergency contacts\n• Campus maps`}
      </Text>
    </ScrollView>
  );
}