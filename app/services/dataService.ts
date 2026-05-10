import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type Institution = any; 
type Bursary = any;

class DataService {
  institutions: Institution[] = [];
  nationalEmergency: any = {};
  bursaries: Bursary[] = [];
  isLoaded = false;

  async init() {
    if (this.isLoaded) return;

    // Try cache first
    const [cachedInst, cachedFunding, cachedNational] = await Promise.all([
      AsyncStorage.getItem('cache_institutions'),
      AsyncStorage.getItem('cache_funding'),
      AsyncStorage.getItem('cache_national')
    ]);

    if (cachedInst && cachedFunding) {
      this.institutions = JSON.parse(cachedInst);
      this.bursaries = JSON.parse(cachedFunding);
      this.nationalEmergency = JSON.parse(cachedNational || '{}');
      this.isLoaded = true;
      console.log(`${this.institutions.length} Institutions Loaded from Cache`);
      return;
    }

    try {
      const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
      // FIX: Expo serves /public at root, so use /data not /public/data
      const baseUrl = `http://${host}:8081/data`;

      console.log('Fetching from:', baseUrl);

      const [knowledgeRes, knowledgeLiteRes, fundingRes] = await Promise.all([
        fetch(`${baseUrl}/knowledge.json`),
        fetch(`${baseUrl}/knowledge-lite.json`),
        fetch(`${baseUrl}/funding.json`)
      ]);

      if (!knowledgeRes.ok || !knowledgeLiteRes.ok || !fundingRes.ok) {
        throw new Error(`Failed to load data files: ${knowledgeRes.status}`);
      }

      const knowledge = await knowledgeRes.json();
      const knowledgeLite = await knowledgeLiteRes.json();
      const funding = await fundingRes.json();

      // Merge knowledge.json + knowledge-lite.json for fallback data
      const liteMap = new Map();
      [...(knowledgeLite.institutions || []), 
       ...(knowledgeLite.tvet_colleges || []), 
       ...(knowledgeLite.private_institutions || [])]
       .forEach(i => liteMap.set(i.id, i));

      // Merge all institutions, deduplicate by id
      const merged = [
        ...(knowledge.institutions || []),
        ...(knowledge.tvet_colleges || []),
        ...(knowledge.private_institutions || [])
      ];
      
      const uniqueInstitutions = Array.from(
        new Map(merged.map(i => [i.id, i])).values()
      );

      this.institutions = uniqueInstitutions.map(inst => {
        const lite = liteMap.get(inst.id) || {};
        return {
          ...lite,
          ...inst,
          city: inst.location || inst.city || lite.city,
          lat: inst.latitude || inst.lat || lite.lat,
          lng: inst.longitude || inst.lng || lite.lng,
          apply_link: inst.apply_link || lite.apply_link,
          student_portal: inst.student_portal || lite.student_portal,
          website: inst.website || lite.website,
          faculties: inst.faculties || lite.faculties,
          aps_requirements: inst.aps_requirements || lite.aps_requirements,
          prospectus_link: inst.prospectus_link || lite.prospectus_link,
          security_phone: inst.security_phone || lite.security_phone,
          medical_phone: inst.medical_phone || lite.medical_phone,
          email: inst.email || lite.email,
          phone: inst.phone || lite.phone,
          applications_open: inst.applications_open || lite.applications_open,
          applications_close: inst.applications_close || lite.applications_close,
          type: inst.tvet ? 'TVET College' : inst.private ? 'Private Institution' : 'Public University'
        };
      });

      this.bursaries = funding;
      this.nationalEmergency = knowledgeLite.national_emergency;

      // Cache for offline
      await Promise.all([
        AsyncStorage.setItem('cache_institutions', JSON.stringify(this.institutions)),
        AsyncStorage.setItem('cache_funding', JSON.stringify(this.bursaries)),
        AsyncStorage.setItem('cache_national', JSON.stringify(this.nationalEmergency))
      ]);

      this.isLoaded = true;
      console.log(`${this.institutions.length} Institutions Ready`);

    } catch (e) {
      console.error('Failed to load knowledge.json:', e);
      this.institutions = [];
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
}

export default new DataService();