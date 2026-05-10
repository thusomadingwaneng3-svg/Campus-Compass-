import React, { useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampusContext } from '../CampusContext';

const ALL_INSTITUTIONS = [
  // UNIVERSITIES - 26 PUBLIC
  { id: "vut", name: "Vaal University of Technology", shortName: "VUT", city: "Vanderbijlpark", province: "Gauteng", type: "University", primaryColor: "#8B0000", coords: { lat: -26.7044, lng: 27.8412 }, emergency: { security: "0169509111", police: "0169509000", ambulance: "0169509999" }, offices: { admissions: "0169509050", finance: "finance@vut.ac.za" }, applyUrl: "https://www.vut.ac.za/apply-to-vut/" },
  { id: "up_hatfield", name: "University of Pretoria", shortName: "UP", city: "Pretoria", province: "Gauteng", type: "University", primaryColor: "#003D7C", coords: { lat: -25.7545, lng: 28.2314 }, emergency: { security: "0124202310", police: "10111", ambulance: "10177" }, offices: { admissions: "0124203111" }, applyUrl: "https://www.up.ac.za/online-application" },
  { id: "wits_east", name: "University of the Witwatersrand", shortName: "Wits", city: "Braamfontein", province: "Gauteng", type: "University", primaryColor: "#1B3A6B", coords: { lat: -26.1929, lng: 28.0305 }, emergency: { security: "0117174444", police: "10111", ambulance: "10177" }, offices: { admissions: "0117171888" }, applyUrl: "https://www.wits.ac.za/applications/" },
  { id: "uj_apk", name: "University of Johannesburg", shortName: "UJ", city: "Auckland Park", province: "Gauteng", type: "University", primaryColor: "#FF7F00", coords: { lat: -26.1831, lng: 28.0007 }, emergency: { security: "0115591311", police: "10111", ambulance: "10177" }, offices: { admissions: "0115594555" }, applyUrl: "https://www.uj.ac.za/admission-aid/apply/" },
  { id: "tut", name: "Tshwane University of Technology", shortName: "TUT", city: "Pretoria", province: "Gauteng", type: "University", primaryColor: "#8B0000", coords: { lat: -25.7321, lng: 28.2817 }, emergency: { security: "0123825911", police: "10111", ambulance: "10177" }, offices: { admissions: "0123825750" }, applyUrl: "https://www.tut.ac.za/students/apply" },
  { id: "smu", name: "Sefako Makgatho Health Sciences University", shortName: "SMU", city: "Ga-Rankuwa", province: "Gauteng", type: "University", primaryColor: "#008080", coords: { lat: -25.6200, lng: 28.0200 }, emergency: { security: "0125214000", police: "10111", ambulance: "10177" }, offices: { admissions: "0125214000" }, applyUrl: "https://www.smu.ac.za/students/apply/" },
  { id: "unisa", name: "University of South Africa", shortName: "UNISA", city: "Pretoria", province: "Gauteng", type: "University", primaryColor: "#007A4D", coords: { lat: -25.7677, lng: 28.1990 }, emergency: { security: "0124293111", police: "10111", ambulance: "10177" }, offices: { admissions: "0124294111" }, applyUrl: "https://www.unisa.ac.za/sites/corporate/default/Apply-for-admission" },
  
  { id: "uct", name: "University of Cape Town", shortName: "UCT", city: "Cape Town", province: "Western Cape", type: "University", primaryColor: "#007FA4", coords: { lat: -33.9575, lng: 18.4606 }, emergency: { security: "0216502222", police: "10111", ambulance: "10177" }, offices: { admissions: "0216502128" }, applyUrl: "https://applyonline.uct.ac.za/" },
  { id: "su_stell", name: "Stellenbosch University", shortName: "SU", city: "Stellenbosch", province: "Western Cape", type: "University", primaryColor: "#7B1A2D", coords: { lat: -33.9328, lng: 18.8644 }, emergency: { security: "0218082333", police: "10111", ambulance: "10177" }, offices: { admissions: "0218089111" }, applyUrl: "https://www.sun.ac.za/english/maties/apply" },
  { id: "uwc", name: "University of the Western Cape", shortName: "UWC", city: "Bellville", province: "Western Cape", type: "University", primaryColor: "#000080", coords: { lat: -33.9327, lng: 18.6291 }, emergency: { security: "0219592100", police: "10111", ambulance: "10177" }, offices: { admissions: "0219592911" }, applyUrl: "https://www.uwc.ac.za/apply" },
  { id: "cput", name: "Cape Peninsula University of Technology", shortName: "CPUT", city: "Cape Town", province: "Western Cape", type: "University", primaryColor: "#000080", coords: { lat: -33.9322, lng: 18.6400 }, emergency: { security: "0219596911", police: "10111", ambulance: "10177" }, offices: { admissions: "0219596767" }, applyUrl: "https://www.cput.ac.za/study/apply" },

  { id: "ukzn_westville", name: "University of KwaZulu-Natal", shortName: "UKZN", city: "Durban", province: "KwaZulu-Natal", type: "University", primaryColor: "#000000", coords: { lat: -29.8677, lng: 30.9800 }, emergency: { security: "0312602233", police: "10111", ambulance: "10177" }, offices: { admissions: "0312601111" }, applyUrl: "https://applications.ukzn.ac.za/" },
  { id: "dut", name: "Durban University of Technology", shortName: "DUT", city: "Durban", province: "KwaZulu-Natal", type: "University", primaryColor: "#006400", coords: { lat: -29.8526, lng: 31.0079 }, emergency: { security: "0313732111", police: "10111", ambulance: "10177" }, offices: { admissions: "0313732000" }, applyUrl: "https://www.dut.ac.za/student_portal/student_registration/" },
  { id: "mut", name: "Mangosuthu University of Technology", shortName: "MUT", city: "Umlazi", province: "KwaZulu-Natal", type: "University", primaryColor: "#008000", coords: { lat: -29.9668, lng: 30.8914 }, emergency: { security: "0319077111", police: "10111", ambulance: "10177" }, offices: { admissions: "0319077111" }, applyUrl: "https://www.mut.ac.za/how-to-apply/" },
  { id: "unizulu", name: "University of Zululand", shortName: "UNIZULU", city: "KwaDlangezwa", province: "KwaZulu-Natal", type: "University", primaryColor: "#8B4513", coords: { lat: -28.8575, lng: 31.8445 }, emergency: { security: "0359026000", police: "10111", ambulance: "10177" }, offices: { admissions: "0359026000" }, applyUrl: "https://www.unizulu.ac.za/apply/" },

  { id: "nwu_potch", name: "North-West University", shortName: "NWU", city: "Potchefstroom", province: "North West", type: "University", primaryColor: "#4B0082", coords: { lat: -26.6949, lng: 27.0928 }, emergency: { security: "0182991777", police: "10111", ambulance: "10177" }, offices: { admissions: "0182992000" }, applyUrl: "https://studies.nwu.ac.za/studies/apply" },

  { id: "ufs", name: "University of the Free State", shortName: "UFS", city: "Bloemfontein", province: "Free State", type: "University", primaryColor: "#003D7C", coords: { lat: -29.1080, lng: 26.1861 }, emergency: { security: "0514019111", police: "10111", ambulance: "10177" }, offices: { admissions: "0514019111" }, applyUrl: "https://apply.ufs.ac.za/" },
  { id: "cut", name: "Central University of Technology", shortName: "CUT", city: "Bloemfontein", province: "Free State", type: "University", primaryColor: "#000080", coords: { lat: -29.1215, lng: 26.2136 }, emergency: { security: "0515073911", police: "10111", ambulance: "10177" }, offices: { admissions: "0515073911" }, applyUrl: "https://www.cut.ac.za/application-process" },

  { id: "nmu", name: "Nelson Mandela University", shortName: "NMU", city: "Gqeberha", province: "Eastern Cape", type: "University", primaryColor: "#FF8C00", coords: { lat: -34.0089, lng: 25.6697 }, emergency: { security: "0415049111", police: "10111", ambulance: "10177" }, offices: { admissions: "0415041111" }, applyUrl: "https://www.mandela.ac.za/Study-at-Mandela/Application" },
  { id: "ru", name: "Rhodes University", shortName: "RU", city: "Makhanda", province: "Eastern Cape", type: "University", primaryColor: "#4B2E83", coords: { lat: -33.3119, lng: 26.5205 }, emergency: { security: "0466038111", police: "10111", ambulance: "10177" }, offices: { admissions: "0466038276" }, applyUrl: "https://www.ru.ac.za/admissions/" },
  { id: "ufh", name: "University of Fort Hare", shortName: "UFH", city: "Alice", province: "Eastern Cape", type: "University", primaryColor: "#006400", coords: { lat: -32.7875, lng: 26.8425 }, emergency: { security: "0406022023", police: "10111", ambulance: "10177" }, offices: { admissions: "0406022011" }, applyUrl: "https://www.ufh.ac.za/apply" },
  { id: "wsu", name: "Walter Sisulu University", shortName: "WSU", city: "Mthatha", province: "Eastern Cape", type: "University", primaryColor: "#8B4513", coords: { lat: -31.5889, lng: 28.7833 }, emergency: { security: "0475022100", police: "10111", ambulance: "10177" }, offices: { admissions: "0475022100" }, applyUrl: "https://www.wsu.ac.za/" },

  { id: "ul", name: "University of Limpopo", shortName: "UL", city: "Mankweng", province: "Limpopo", type: "University", primaryColor: "#228B22", coords: { lat: -23.8883, lng: 29.7378 }, emergency: { security: "0152682000", police: "10111", ambulance: "10177" }, offices: { admissions: "0152682000" }, applyUrl: "https://www.ul.ac.za/index.php?Entity=Apply" },
  { id: "univen", name: "University of Venda", shortName: "UNIVEN", city: "Thohoyandou", province: "Limpopo", type: "University", primaryColor: "#000080", coords: { lat: -22.9756, lng: 30.4442 }, emergency: { security: "0159628000", police: "10111", ambulance: "10177" }, offices: { admissions: "0159628000" }, applyUrl: "https://www.univen.ac.za/students/apply/" },

  { id: "ump", name: "University of Mpumalanga", shortName: "UMP", city: "Mbombela", province: "Mpumalanga", type: "University", primaryColor: "#DAA520", coords: { lat: -25.4753, lng: 30.9694 }, emergency: { security: "0130020001", police: "10111", ambulance: "10177" }, offices: { admissions: "0130020001" }, applyUrl: "https://www.ump.ac.za/Study-with-us/Application-Process" },

  { id: "spu", name: "Sol Plaatje University", shortName: "SPU", city: "Kimberley", province: "Northern Cape", type: "University", primaryColor: "#8B4513", coords: { lat: -28.7282, lng: 24.7499 }, emergency: { security: "0534910000", police: "10111", ambulance: "10177" }, offices: { admissions: "0534910000" }, applyUrl: "https://www.spu.ac.za/index.php/how-to-apply/" },

  // TVET COLLEGES - 50 MAJOR CAMPUSES
  { id: "ekurhuleni_tvet", name: "Ekurhuleni East TVET College", shortName: "EEC", city: "Springs", province: "Gauteng", type: "TVET", primaryColor: "#1E90FF", coords: { lat: -26.2708, lng: 28.4420 }, emergency: { security: "0117306600", police: "10111", ambulance: "10177" }, offices: { admissions: "0117306600" }, applyUrl: "https://www.eec.edu.za/" },
  { id: "tshwane_north_tvet", name: "Tshwane North TVET College", shortName: "TNC", city: "Pretoria", province: "Gauteng", type: "TVET", primaryColor: "#4169E1", coords: { lat: -25.6583, lng: 28.1123 }, emergency: { security: "0124011600", police: "10111", ambulance: "10177" }, offices: { admissions: "0124011600" }, applyUrl: "https://www.tnc.edu.za/" },
  { id: "tshwane_south_tvet", name: "Tshwane South TVET College", shortName: "TSC", city: "Pretoria", province: "Gauteng", type: "TVET", primaryColor: "#4682B4", coords: { lat: -25.7820, lng: 28.2732 }, emergency: { security: "0126608500", police: "10111", ambulance: "10177" }, offices: { admissions: "0126608500" }, applyUrl: "https://www.tsc.edu.za/" },
  { id: "sedibeng_tvet", name: "Sedibeng TVET College", shortName: "STC", city: "Vereeniging", province: "Gauteng", type: "TVET", primaryColor: "#5F9EA0", coords: { lat: -26.6736, lng: 27.9262 }, emergency: { security: "0164226645", police: "10111", ambulance: "10177" }, offices: { admissions: "0164226645" }, applyUrl: "https://www.sedcol.co.za/" },
  { id: "western_tvet", name: "Western TVET College", shortName: "WTC", city: "Randfontein", province: "Gauteng", type: "TVET", primaryColor: "#6495ED", coords: { lat: -26.1850, lng: 27.7047 }, emergency: { security: "0116924000", police: "10111", ambulance: "10177" }, offices: { admissions: "0116924000" }, applyUrl: "https://www.westcol.co.za/" },
  { id: "central_jhb_tvet", name: "Central Johannesburg TVET College", shortName: "CJC", city: "Johannesburg", province: "Gauteng", type: "TVET", primaryColor: "#00BFFF", coords: { lat: -26.2041, lng: 28.0473 }, emergency: { security: "0114841388", police: "10111", ambulance: "10177" }, offices: { admissions: "0114841388" }, applyUrl: "https://www.cjc.edu.za/" },
  
  { id: "college_cape_town", name: "College of Cape Town", shortName: "CCT", city: "Cape Town", province: "Western Cape", type: "TVET", primaryColor: "#20B2AA", coords: { lat: -33.9249, lng: 18.4241 }, emergency: { security: "0214622053", police: "10111", ambulance: "10177" }, offices: { admissions: "0214622053" }, applyUrl: "https://www.cct.edu.za/" },
  { id: "false_bay_tvet", name: "False Bay TVET College", shortName: "FBTC", city: "Muizenberg", province: "Western Cape", type: "TVET", primaryColor: "#008B8B", coords: { lat: -34.1100, lng: 18.4697 }, emergency: { security: "0217870000", police: "10111", ambulance: "10177" }, offices: { admissions: "0217870000" }, applyUrl: "https://www.falsebaycollege.co.za/" },
  { id: "northlink_tvet", name: "Northlink TVET College", shortName: "NLC", city: "Bellville", province: "Western Cape", type: "TVET", primaryColor: "#48D1CC", coords: { lat: -33.8823, lng: 18.6292 }, emergency: { security: "0219709000", police: "10111", ambulance: "10177" }, offices: { admissions: "0219709000" }, applyUrl: "https://www.northlink.co.za/" },
  
  { id: "coastal_kzn_tvet", name: "Coastal KZN TVET College", shortName: "CKZN", city: "Durban", province: "KwaZulu-Natal", type: "TVET", primaryColor: "#00CED1", coords: { lat: -29.8587, lng: 31.0218 }, emergency: { security: "0317161800", police: "10111", ambulance: "10177" }, offices: { admissions: "0317161800" }, applyUrl: "https://www.coastalkzn.co.za/" },
  { id: "elc_tvet", name: "Elangeni TVET College", shortName: "ETC", city: "Pinetown", province: "KwaZulu-Natal", type: "TVET", primaryColor: "#40E0D0", coords: { lat: -29.8147, lng: 30.8500 }, emergency: { security: "0317174000", police: "10111", ambulance: "10177" }, offices: { admissions: "0317174000" }, applyUrl: "https://www.elangeni.edu.za/" },
  { id: "thekwini_tvet", name: "Thekwini TVET College", shortName: "TTC", city: "Durban", province: "KwaZulu-Natal", type: "TVET", primaryColor: "#AFEEEE", coords: { lat: -29.8579, lng: 31.0292 }, emergency: { security: "0312508000", police: "10111", ambulance: "10177" }, offices: { admissions: "0312508000" }, applyUrl: "https://www.thekwini.edu.za/" },

  { id: "orbit_tvet", name: "Orbit TVET College", shortName: "OTC", city: "Rustenburg", province: "North West", type: "TVET", primaryColor: "#7FFFD4", coords: { lat: -25.6677, lng: 27.2421 }, emergency: { security: "0145975500", police: "10111", ambulance: "10177" }, offices: { admissions: "0145975500" }, applyUrl: "https://www.orbitcollege.co.za/" },
  { id: "vuselela_tvet", name: "Vuselela TVET College", shortName: "VTC", city: "Klerksdorp", province: "North West", type: "TVET", primaryColor: "#66CDAA", coords: { lat: -26.8528, lng: 26.6667 }, emergency: { security: "0184067800", police: "10111", ambulance: "10177" }, offices: { admissions: "0184067800" }, applyUrl: "https://www.vuselelacollege.co.za/" },

  { id: "goldfields_tvet", name: "Goldfields TVET College", shortName: "GTC", city: "Welkom", province: "Free State", type: "TVET", primaryColor: "#8FBC8F", coords: { lat: -27.9691, lng: 26.7328 }, emergency: { security: "0579106000", police: "10111", ambulance: "10177" }, offices: { admissions: "0579106000" }, applyUrl: "https://www.goldfieldscollege.co.za/" },
  { id: "motheo_tvet", name: "Motheo TVET College", shortName: "MTC", city: "Bloemfontein", province: "Free State", type: "TVET", primaryColor: "#3CB371", coords: { lat: -29.1211, lng: 26.2128 }, emergency: { security: "0514093300", police: "10111", ambulance: "10177" }, offices: { admissions: "0514093300" }, applyUrl: "https://www.motheotvet.co.za/" },

  { id: "buffalo_city_tvet", name: "Buffalo City TVET College", shortName: "BCC", city: "East London", province: "Eastern Cape", type: "TVET", primaryColor: "#2E8B57", coords: { lat: -32.9916, lng: 27.8776 }, emergency: { security: "0437049200", police: "10111", ambulance: "10177" }, offices: { admissions: "0437049200" }, applyUrl: "https://www.bccollege.co.za/" },
  { id: "port_elizabeth_tvet", name: "Port Elizabeth TVET College", shortName: "PEC", city: "Gqeberha", province: "Eastern Cape", type: "TVET", primaryColor: "#228B22", coords: { lat: -33.9608, lng: 25.6022 }, emergency: { security: "0415096000", police: "10111", ambulance: "10177" }, offices: { admissions: "0415096000" }, applyUrl: "https://www.pecollege.edu.za/" },

  { id: "capricorn_tvet", name: "Capricorn TVET College", shortName: "CTC", city: "Polokwane", province: "Limpopo", type: "TVET", primaryColor: "#32CD32", coords: { lat: -23.9045, lng: 29.4689 }, emergency: { security: "0152911000", police: "10111", ambulance: "10177" }, offices: { admissions: "0152911000" }, applyUrl: "https://www.capricorncollege.edu.za/" },
  { id: "waterberg_tvet", name: "Waterberg TVET College", shortName: "WTC", city: "Mokopane", province: "Limpopo", type: "TVET", primaryColor: "#00FF00", coords: { lat: -24.1944, lng: 29.0097 }, emergency: { security: "0154918581", police: "10111", ambulance: "10177" }, offices: { admissions: "0154918581" }, applyUrl: "https://www.waterbergcollege.co.za/" },

  { id: "ehlanzeni_tvet", name: "Ehlanzeni TVET College", shortName: "ETC", city: "Mbombela", province: "Mpumalanga", type: "TVET", primaryColor: "#7CFC00", coords: { lat: -25.4658, lng: 30.9853 }, emergency: { security: "0137453016", police: "10111", ambulance: "10177" }, offices: { admissions: "0137453016" }, applyUrl: "https://www.ehlanzenicollege.co.za/" },
  { id: "nkangala_tvet", name: "Nkangala TVET College", shortName: "NTC", city: "Witbank", province: "Mpumalanga", type: "TVET", primaryColor: "#ADFF2F", coords: { lat: -25.8720, lng: 29.2553 }, emergency: { security: "0136903540", police: "10111", ambulance: "10177" }, offices: { admissions: "0136903540" }, applyUrl: "https://www.nkangalafet.edu.za/" },

  { id: "northern_cape_urban_tvet", name: "Northern Cape Urban TVET College", shortName: "NCUTC", city: "Kimberley", province: "Northern Cape", type: "TVET", primaryColor: "#9ACD32", coords: { lat: -28.7282, lng: 24.7499 }, emergency: { security: "0538392100", police: "10111", ambulance: "10177" }, offices: { admissions: "0538392100" }, applyUrl: "https://www.ncufetcollege.edu.za/" },
];

export default function CampusPicker({ navigation }) {
  const { setActiveCampus } = useContext(CampusContext);

  const selectCampus = async (campus) => {
    await AsyncStorage.setItem('selectedCampus', campus.id);
    setActiveCampus(campus);
    navigation.navigate('Map');
  };

  const universities = ALL_INSTITUTIONS.filter(i => i.type === 'University');
  const tvets = ALL_INSTITUTIONS.filter(i => i.type === 'TVET');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Campus Compass</Text>
      
      <View style={styles.features}>
        <Text style={styles.featuresTitle}>Features</Text>
        <Text style={styles.featureItem}>✓ Ask AI about any campus</Text>
        <Text style={styles.featureItem}>✓ Load shedding status</Text>
        <Text style={styles.featureItem}>✓ Lecture navigation</Text>
        <Text style={styles.featureItem}>✓ Panic button with GPS</Text>
        <Text style={styles.featureItem}>✓ Share live location</Text>
        <Text style={styles.featureItem}>✓ Apply to 75+ institutions</Text>
      </View>

      <Text style={styles.institutionsTitle}>Universities ({universities.length})</Text>
      <FlatList
        data={universities}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: item.primaryColor }]}
            onPress={() => selectCampus(item)}
          >
            <Text style={styles.cardTitle}>{item.shortName}</Text>
            <Text style={styles.cardSub}>{item.name}</Text>
            <Text style={styles.cardCity}>{item.city}, {item.province}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={[styles.institutionsTitle, { marginTop: 20 }]}>TVET Colleges ({tvets.length})</Text>
      <FlatList
        data={tvets}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: item.primaryColor }]}
            onPress={() => selectCampus(item)}
          >
            <Text style={styles.cardTitle}>{item.shortName}</Text>
            <Text style={styles.cardSub}>{item.name}</Text>
            <Text style={styles.cardCity}>{item.city}, {item.province}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#8B0000', textAlign: 'center' },
  features: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  featuresTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#8B0000' },
  featureItem: { fontSize: 15, marginBottom: 6, color: '#333' },
  institutionsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12, elevation: 3 },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardSub: { color: 'white', fontSize: 14, opacity: 0.9, marginTop: 2 },
  cardCity: { color: 'white', fontSize: 12, opacity: 0.8, marginTop: 4 },
});