import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

// Only load OCR on native
let MlkitOcr: any = null;
if (Platform.OS!== 'web') {
  try {
    MlkitOcr = require('expo-mlkit-ocr').default;
  } catch (e) {
    console.log('OCR not available');
  }
}

type PassDoc = {
  id: string;
  type: 'id' | 'matric' | 'income' | 'other';
  uri: string;
  name: string;
  size: number;
  status: 'pending' | 'verified' | 'rejected';
  ocrText?: string;
  uploadedAt: string;
  synced?: boolean;
}

type StudentPass = {
  docs: PassDoc[];
  createdAt: string;
  qrHash: string;
}

const DOC_TYPES = [
  { key: 'id', label: 'ID / Passport', icon: 'card-outline' },
  { key: 'matric', label: 'Matric Certificate', icon: 'school-outline' },
  { key: 'income', label: 'Proof of Income', icon: 'document-text-outline' },
];

export default function PassScreen() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<PassDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPass, setGeneratingPass] = useState(false);
  const [passUri, setPassUri] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    loadDocs();
    checkCloudStatus();
  }, [user, cloudStatus]);

  const checkCloudStatus = async () => {
    if (!user) {
      setCloudStatus('offline');
      return;
    }
    try {
      const { error } = await supabase.from('student_pass_docs').select('id').limit(1);
      setCloudStatus(error? 'offline' : 'online');
    } catch {
      setCloudStatus('offline');
    }
  };

  const loadDocs = async () => {
    const stored = await AsyncStorage.getItem('studentPass');
    if (stored) {
      const pass: StudentPass = JSON.parse(stored);
      setDocs(pass.docs);
    }

    if (user && cloudStatus === 'online') {
      try {
        const { data, error } = await supabase
         .from('student_pass_docs')
         .select('*')
         .eq('user_id', user.id);

        if (!error && data && data.length > 0) {
          const cloudDocs: PassDoc[] = data.map(d => ({
            id: d.id,
            type: d.doc_type,
            uri: d.file_url,
            name: d.doc_type,
            size: 0,
            status: d.status,
            ocrText: d.ocr_text,
            uploadedAt: d.created_at,
            synced: true
          }));
          setDocs(cloudDocs);
          await AsyncStorage.setItem('studentPass', JSON.stringify({ docs: cloudDocs }));
        }
      } catch {
        // Ignore, use local
      }
    }
  };

  const saveDocs = async (newDocs: PassDoc[]) => {
    const hash = await generateHash(newDocs);
    const pass: StudentPass = {
      docs: newDocs,
      createdAt: new Date().toISOString(),
      qrHash: hash
    };

    await AsyncStorage.setItem('studentPass', JSON.stringify(pass));
    setDocs(newDocs);

    if (user && cloudStatus === 'online') {
      try {
        const { error } = await supabase.from('student_pass_docs').upsert(
          newDocs.map(d => ({
            user_id: user.id,
            doc_type: d.type,
            file_url: d.uri,
            ocr_text: d.ocrText,
            status: d.status
          }))
        );

        if (!error) {
          setDocs(prev => prev.map(d => ({...d, synced: true })));
        }
      } catch (e) {
        console.log('Cloud sync failed, staying local');
        setCloudStatus('offline');
      }
    }
  };

  const generateHash = async (docsToHash: PassDoc[]) => {
    const data = docsToHash.map(d => ({
      type: d.type,
      name: d.name,
      size: d.size,
      ocrText: d.ocrText?.substring(0, 100)
    }));
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(data)
    );
  };

  const uploadDoc = async (type: 'id' | 'matric' | 'income') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true
      });

      if (res.canceled) return;

      const file = res.assets[0];
      setLoading(true);

      let ocrText = '';
      if (MlkitOcr && Platform.OS!== 'web') {
        try {
          const ocrResult = await MlkitOcr.detectFromUri(file.uri);
          ocrText = ocrResult.blocks.map((b: any) => b.text).join(' ');
        } catch (e) {
          console.log('OCR failed:', e);
        }
      }

      const newDoc: PassDoc = {
        id: Date.now().toString(),
        type,
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
        status: 'pending',
        ocrText,
        uploadedAt: new Date().toISOString(),
        synced: false
      };

      const updatedDocs = [...docs.filter(d => d.type!== type), newDoc];
      await saveDocs(updatedDocs);

      Alert.alert('Success', `${DOC_TYPES.find(t => t.key === type)?.label} uploaded`);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedDocs = docs.filter(d => d.id!== id);
            await saveDocs(updatedDocs);

            if (user && cloudStatus === 'online') {
              await supabase.from('student_pass_docs').delete().eq('id', id);
            }
          }
        }
      ]
    );
  };

  const generatePassPDF = async () => {
    if (docs.length === 0) {
      Alert.alert('No Documents', 'Upload at least 1 document first');
      return;
    }

    setGeneratingPass(true);
    try {
      const hash = await generateHash(docs);
      const date = new Date().toLocaleDateString();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #8B0000; text-align: center; }
           .header { text-align: center; margin-bottom: 30px; }
           .doc { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
           .label { font-weight: bold; color: #333; }
           .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Campus Compass Pass</h1>
            <p>Generated: ${date}</p>
          </div>
          <div>
            <p><strong>Verification Hash:</strong></p>
            <p style="font-family: monospace; font-size: 12px;">${hash}</p>
          </div>
          <h3>Documents:</h3>
          ${docs.map(d => `
            <div class="doc">
              <p><span class="label">Type:</span> ${DOC_TYPES.find(t => t.key === d.type)?.label}</p>
              <p><span class="label">File:</span> ${d.name}</p>
            </div>
          `).join('')}
          <div class="footer">
            <p>Independent tool. Not affiliated with any university.</p>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        // Web: open in new tab for print/save as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setPassUri('web-print');
        } else {
          Alert.alert('Popup blocked', 'Allow popups to generate PDF');
        }
      } else {
        // Native: create file and save URI
        const { uri } = await Print.printToFileAsync({ html });
        setPassUri(uri);
      }

      Alert.alert('Pass Generated!', Platform.OS === 'web'? 'Use browser print to save as PDF' : 'Share it when applying');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate Pass');
    } finally {
      setGeneratingPass(false);
    }
  };

  const sharePass = async () => {
    if (!passUri) return;

    if (Platform.OS === 'web') {
      Alert.alert('Download PDF', 'Use your browser print dialog and choose "Save as PDF"');
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(passUri);
    } else {
      Alert.alert('Sharing not available', 'Your device does not support sharing');
    }
  };

  const getDocsByType = (type: string) => docs.find(d => d.type === type);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={40} color="#8B0000" />
        <Text style={styles.title}>Campus Compass Pass</Text>
        <Text style={styles.subtitle}>Upload once. Apply everywhere.</Text>

        {!MlkitOcr && Platform.OS!== 'web' && (
          <View style={styles.offlineBadge}>
            <Ionicons name="alert-circle" size={14} color="#FF8C00" />
            <Text style={styles.offlineText}>OCR disabled - run dev build to enable</Text>
          </View>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.offlineBadge}>
            <Ionicons name="globe-outline" size={14} color="#1E90FF" />
            <Text style={styles.offlineText}>Web mode - OCR disabled</Text>
          </View>
        )}

        {cloudStatus === 'offline' && user && Platform.OS!== 'web' && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={14} color="#FF8C00" />
            <Text style={styles.offlineText}>Offline mode - data saved locally</Text>
          </View>
        )}

        {cloudStatus === 'online' && (
          <View style={styles.onlineBadge}>
            <Ionicons name="cloud-done" size={14} color="#228B22" />
            <Text style={styles.onlineText}>Synced to cloud</Text>
          </View>
        )}
      </View>

      {DOC_TYPES.map(dt => {
        const existingDoc = getDocsByType(dt.key);
        return (
          <View key={dt.key} style={styles.docCard}>
            <View style={styles.docHeader}>
              <Ionicons name={dt.icon as any} size={24} color="#8B0000" />
              <Text style={styles.docTitle}>{dt.label}</Text>
              {existingDoc && (
                <View style={[styles.statusBadge, existingDoc.synced && styles.statusBadgeSynced]}>
                  <Ionicons
                    name={existingDoc.synced? "cloud-done" : "phone-portrait"}
                    size={16}
                    color={existingDoc.synced? "#228B22" : "#666"}
                  />
                  <Text style={styles.statusText}>
                    {existingDoc.synced? 'Synced' : 'Local'}
                  </Text>
                </View>
              )}
            </View>

            {existingDoc? (
              <View style={styles.docContent}>
                <Text style={styles.docName} numberOfLines={1}>{existingDoc.name}</Text>
                <View style={styles.docActions}>
                  <TouchableOpacity style={styles.replaceBtn} onPress={() => uploadDoc(dt.key as any)}>
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
                onPress={() => uploadDoc(dt.key as any)}
                disabled={loading}
              >
                {loading? (
                  <ActivityIndicator color="#8B0000" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#8B0000" />
                    <Text style={styles.uploadBtnText}>Upload {dt.label}</Text>
                  </>
                )}
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
        {generatingPass? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="document-text" size={20} color="white" />
            <Text style={styles.generateBtnText}>Generate My Pass</Text>
          </>
        )}
      </TouchableOpacity>

      {passUri && (
        <TouchableOpacity style={styles.shareBtn} onPress={sharePass}>
          <Ionicons name="share-outline" size={20} color="white" />
          <Text style={styles.shareBtnText}>
            {Platform.OS === 'web'? 'Save as PDF' : 'Share Pass PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {!user && (
        <TouchableOpacity
          style={styles.loginPrompt}
          onPress={() => Alert.alert('Login', 'Go to login screen to enable cloud sync')}
        >
          <Ionicons name="log-in" size={20} color="#1E90FF" />
          <Text style={styles.loginText}>Login to sync across devices</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4 },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4
  },
  offlineText: { fontSize: 12, color: '#FF8C00', fontWeight: '600' },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4
  },
  onlineText: { fontSize: 12, color: '#228B22', fontWeight: '600' },

  docCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  docTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusBadgeSynced: {
    backgroundColor: '#E8F5E9'
  },
  statusText: { fontSize: 12, color: '#666', fontWeight: '600' },

  docContent: { gap: 8 },
  docName: { fontSize: 14, color: '#333' },

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

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E90FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 12
  },
  shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 8
  },
  loginText: { color: '#1E90FF', fontWeight: '600' }
});