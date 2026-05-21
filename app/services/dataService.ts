import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Institution = any; 
type Bursary = any;

class DataService {
  institutions: Institution[] = [];
  nationalEmergency: any = {};
  bursaries: Bursary[] = [];
  isLoaded = false;

  async init() {
    if (this.isLoaded) return;

    // Web: fetch fresh every time
    if (Platform.OS === 'web') {
      await this.loadFromNetwork();
      this.isLoaded = true;
      return;
    }

    // Mobile: try cache first
    const [cachedInst, cachedFunding, cachedNational, cachedAfrica] = await Promise.all([
      AsyncStorage.getItem('cache_institutions'),
      AsyncStorage.getItem('cache_funding'),
      AsyncStorage.getItem('cache_national'),
      AsyncStorage.getItem('cache_africa_non_sa')
    ]);

    if (cachedInst && cachedFunding) {
      this.institutions = JSON.parse(cachedInst);
      this.bursaries = JSON.parse(cachedFunding);
      this.nationalEmergency = JSON.parse(cachedNational || '{}');
      this.isLoaded = true;
      console.log(`${this.institutions.length} Institutions Loaded from Cache`);
      return;
    }

    await this.loadFromNetwork();
    
    // Cache everything on mobile
    try {
      await Promise.all([
        AsyncStorage.setItem('cache_institutions', JSON.stringify(this.institutions)),
        AsyncStorage.setItem('cache_funding', JSON.stringify(this.bursaries)),
        AsyncStorage.setItem('cache_national', JSON.stringify(this.nationalEmergency)),
        AsyncStorage.setItem('cache_africa_non_sa', JSON.stringify(this.institutions.filter(i => i.country !== 'South Africa')))
      ]);
    } catch (e) {
      console.warn('Cache save failed:', e);
    }

    this.isLoaded = true;
  }

  async loadFromNetwork() {
    try {
      const baseUrl = Platform.OS === 'web' 
        ? '' 
        : `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:8081`;

      console.log('Fetching from:', baseUrl + '/data');

      const [knowledgeRes, knowledgeLiteRes, fundingRes, schoolIndexRes, africaRes] = await Promise.all([
        fetch(`${baseUrl}/data/knowledge.json`),
        fetch(`${baseUrl}/data/knowledge-lite.json`),
        fetch(`${baseUrl}/data/funding.json`),
        fetch(`${baseUrl}/data/schools/index.json`),
        fetch(`${baseUrl}/data/africa_non_sa.json`) // NEW
      ]);

      if (!knowledgeRes.ok || !knowledgeLiteRes.ok || !fundingRes.ok || !schoolIndexRes.ok) {
        throw new Error(`Failed to load core data files`);
      }

      const knowledge = await knowledgeRes.json();
      const knowledgeLite = await knowledgeLiteRes.json();
      const funding = await fundingRes.json();
      const schoolIndex = await schoolIndexRes.json();
      const africaNonSA = africaRes.ok ? await africaRes.json() : [];

      // Load SA schools
      const schoolPromises = Object.values(schoolIndex).map((p: any) =>
        fetch(`${baseUrl}${p.file}`).then(r => r.ok ? r.json() : [])
      );
      const schoolArrays = await Promise.all(schoolPromises);
      const schools = schoolArrays.flat();
      console.log(`Loaded ${schools.length} SA schools`);
      console.log(`Loaded ${africaNonSA.length} Africa institutions`);

      // Build lite map for quick merge
      const liteMap = new Map();
      [...(knowledgeLite.institutions || []), 
       ...(knowledgeLite.tvet_colleges || []), 
       ...(knowledgeLite.private_institutions || []),
       ...(knowledgeLite.schools || [])]
       .forEach(i => liteMap.set(i.id, i));

      // Merge SA institutions
      const mergedSA = [
        ...(knowledge.institutions || []),
        ...(knowledge.tvet_colleges || []),
        ...(knowledge.private_institutions || []),
        ...schools
      ];
      
      // Normalize Africa institutions
      const normalizedAfrica = africaNonSA.map((inst: any, i: number) => ({
        ...inst,
        id: inst.id || `africa-${i}`,
        country: inst.country || 'Africa',
        city: inst.city || '',
        province: inst.province || '',
        lat: inst.latitude,
        lng: inst.longitude,
        latitude: inst.latitude,
        longitude: inst.longitude,
        coords: { lat: inst.latitude, lng: inst.longitude },
        level: 'Tertiary',
        type: inst.type || 'TVET College',
        applyUrl: inst.apply_link,
        apply_link: inst.apply_link || '',
        student_portal: inst.student_portal || null,
        website: inst.website || inst.apply_link || '',
        primaryColor: inst.primaryColor || '#1B3A6B',
        security_phone: inst.security_phone || '',
        phone: inst.phone || inst.security_phone || '',
        email: inst.email || '',
        applications_open: inst.applications_open || 'TBA',
        applications_close: inst.applications_close || 'TBA'
      }));

      // Dedupe SA institutions
      const uniqueSA = Array.from(
        new Map(mergedSA.map(i => [i.id, i])).values()
      );

      const tvetIds = new Set((knowledge.tvet_colleges || []).map(i => i.id));
      const privateIds = new Set((knowledge.private_institutions || []).map(i => i.id));
      const schoolIds = new Set(schools.map(i => i.id));

      // Final SA institutions with lite merge
      const finalSA = uniqueSA.map(inst => {
        const lite = liteMap.get(inst.id) || {};
        
        return {
          ...lite,
          ...inst,
          country: 'South Africa',
          city: inst.location || inst.city || lite.city || '',
          lat: inst.latitude || inst.lat || lite.lat || null,
          lng: inst.longitude || inst.lng || lite.lng || null,
          latitude: inst.latitude || inst.lat || lite.lat || null,
          longitude: inst.longitude || inst.lng || lite.lng || null,
          coords: { 
            lat: inst.latitude || inst.lat || lite.lat || null, 
            lng: inst.longitude || inst.lng || lite.lng || null 
          },
          apply_link: inst.apply_link || lite.apply_link || '',
          student_portal: inst.student_portal || lite.student_portal || null,
          website: inst.website || inst.apply_link || lite.website || lite.apply_link || '',
          faculties: inst.faculties || lite.faculties || {},
          aps_requirements: inst.aps_requirements || lite.aps_requirements || {},
          prospectus_link: inst.prospectus_link || lite.prospectus_link || '',
          security_phone: inst.security_phone || lite.security_phone || '',
          medical_phone: inst.medical_phone || lite.medical_phone || '',
          email: inst.email || lite.email || '',
          phone: inst.phone || inst.security_phone || lite.phone || lite.security_phone || '',
          applications_open: inst.applications_open || lite.applications_open || 'TBA',
          applications_close: inst.applications_close || inst.application_deadline_2026 || lite.applications_close || 'TBA',
          type: tvetIds.has(inst.id) 
            ? 'TVET College' 
            : privateIds.has(inst.id)
            ? 'Private Institution'
            : schoolIds.has(inst.id)
            ? 'High School'
            : 'Public University'
        };
      });

      // Combine SA + Africa
      this.institutions = [...finalSA,...normalizedAfrica];
      this.bursaries = funding;
      this.nationalEmergency = knowledgeLite.national_emergency || {};

      console.log(`${this.institutions.length} Total Institutions Ready`);
      console.log(`SA: ${finalSA.length}, Africa: ${normalizedAfrica.length}`);

    } catch (e) {
      console.error('Failed to load data:', e);
      this.institutions = [];
      this.bursaries = [];
    }
  }

  getAllInstitutions() {
    return this.institutions;
  }

  getAllBursaries() {
    return this.bursaries;
  }

  getNationalEmergency() {
    return this.nationalEmergency;
  }

  clearCache() {
    return Promise.all([
      AsyncStorage.removeItem('cache_institutions'),
      AsyncStorage.removeItem('cache_funding'),
      AsyncStorage.removeItem('cache_national'),
      AsyncStorage.removeItem('cache_africa_non_sa')
    ]);
  }
}

export default new DataService();