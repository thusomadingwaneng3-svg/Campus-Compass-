import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jsPDF from 'jspdf';

type PassDoc = {
  id: string;
  type: 'id' | 'matric' | 'income' | 'other';
  name: string;
  size: number;
  uploadedAt: string;
  dataUrl?: string; // base64 for web preview
}

const DOC_TYPES = [
  { key: 'id', label: 'ID / Passport', icon: 'card-outline' },
  { key: 'matric', label: 'Matric Certificate', icon: 'school-outline' },
  { key: 'income', label: 'Proof of Income', icon: 'document-text-outline' },
];

export default function PassScreen() {
  const [docs, setDocs] = useState<PassDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPass, setGeneratingPass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const stored = await AsyncStorage.getItem('studentPass_web');
    if (stored) {
      setDocs(JSON.parse(stored));
    }
  };

  const saveDocs = async (newDocs: PassDoc[]) => {
    await AsyncStorage.setItem('studentPass_web', JSON.stringify(newDocs));
    setDocs(newDocs);
  };

  const triggerFilePicker = (type: string) => {
    setSelectedType(type);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newDoc: PassDoc = {
        id: Date.now().toString(),
        type: selectedType as any,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl
      };

      const updatedDocs = [...docs.filter(d => d.type!== selectedType), newDoc];
      await saveDocs(updatedDocs);
      setLoading(false);
      Alert.alert('Success', `${DOC_TYPES.find(t => t.key === selectedType)?.label} uploaded`);
    };

    reader.readAsDataURL(file);
    e.target.value = ''; // reset input
  };

  const deleteDoc = async (id: string) => {
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updatedDocs = docs.filter(d => d.id!== id);
        await saveDocs(updatedDocs);
      }}
    ]);
  };

  const generatePassPDF = async () => {
    if (docs.length === 0) {
      Alert.alert('No Documents', 'Upload at least 1 document first');
      return;
    }

    setGeneratingPass(true);
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      const hash = docs.map(d => d.name).join('|');

      doc.setFontSize(22);
      doc.setTextColor(139, 0, 0);
      doc.text('Campus Compass Pass', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${date}`, 105, 30, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Verification Hash: ${hash.substring(0, 50)}`, 20, 45);

      doc.setFontSize(14);
      doc.text('Documents:', 20, 60);

      let y = 70;
      docs.forEach((d, i) => {
        doc.setFontSize(11);
        doc.text(`${i + 1}. ${DOC_TYPES.find(t => t.key === d.type)?.label}`, 20, y);
        doc.text(`File: ${d.name}`, 25, y + 7);
        doc.text(`Uploaded: ${new Date(d.uploadedAt).toLocaleDateString()}`, 25, y + 14);
        y += 25;
      });

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Independent tool. Not affiliated with any university.', 105, 280, { align: 'center' });

      doc.save(`CampusCompass_Pass_${Date.now()}.pdf`);
      Alert.alert('Pass Generated!', 'PDF downloaded to your device');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate Pass');
      console.error(e);
    } finally {
      setGeneratingPass(false);
    }
  };

  const getDocsByType = (type: string) => docs.find(d => d.type === type);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      )}

      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={40} color="#8B0000" />
        <Text style={styles.title}>Campus Compass Pass</Text>
        <Text style={styles.subtitle}>Upload once. Apply everywhere.</Text>
        <View style={styles.webBadge}>
          <Ionicons name="globe-outline" size={14} color="#1E90FF" />
          <Text style={styles.webText}>Web version - saves locally in browser</Text>
        </View>
      </View>

      {DOC_TYPES.map(dt => {
        const existingDoc = getDocsByType(dt.key);
        return (
          <View key={dt.key} style={styles.docCard}>
            <View style={styles.docHeader}>
              <Ionicons name={dt.icon as any} size={24} color="#8B0000" />
              <Text style={styles.docTitle}>{dt.label}</Text>
            </View>

            {existingDoc? (
              <View style={styles.docContent}>
                <Text style={styles.docName} numberOfLines={1}>{existingDoc.name}</Text>
                <Text style={styles.docSize}>{(existingDoc.size / 1024).toFixed(1)} KB</Text>
                <View style={styles.docActions}>
                  <TouchableOpacity style={styles.replaceBtn} onPress={() => triggerFilePicker(dt.key)}>
                    <Text style={styles.replaceBtnText}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDoc(existingDoc.id)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => triggerFilePicker(dt.key)}
                disabled={loading}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#8B0000" />
                <Text style={styles.uploadBtnText}>Upload {dt.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.generateBtn, docs.length === 0 && styles.generateBtnDisabled]}
        onPress={generatePassPDF}
        disabled={generatingPass || docs.length === 0}
      >
        <Ionicons name="document-text" size={20} color="white" />
        <Text style={styles.generateBtnText}>
          {generatingPass? 'Generating...' : 'Download Pass PDF'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        💡 Your files stay in your browser. Nothing uploaded to servers.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4 },
  webBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4
  },
  webText: { fontSize: 12, color: '#1E90FF', fontWeight: '600' },
  docCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  docTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  docContent: { gap: 4 },
  docName: { fontSize: 14, color: '#333' },
  docSize: { fontSize: 12, color: '#666' },
  docActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  replaceBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B0000',
    alignItems: 'center'
  },
  replaceBtnText: { color: '#8B0000', fontWeight: '600' },
  deleteBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fee',
    alignItems: 'center'
  },
  deleteBtnText: { color: '#DC143C', fontWeight: '600' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B0000',
    borderStyle: 'dashed'
  },
  uploadBtnText: { color: '#8B0000', fontWeight: '600' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B0000',
    padding: 16,
    borderRadius: 12,
    marginTop: 20
  },
  generateBtnDisabled: { backgroundColor: '#ccc' },
  generateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  note: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic'
  }
});