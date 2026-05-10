import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Using require instead of import to avoid BOM/syntax crashes
const campusData = require('./data/campuses.json');

export const CampusContext = createContext();

export const CampusProvider = ({ children }) => {
  const [activeCampus, setActiveCampus] = useState(campusData[0]); // Default VUT
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampus();
  }, []);

  const loadCampus = async () => {
    try {
      const campusId = await AsyncStorage.getItem('selectedCampus');
      if (campusId!== null) {
        const found = campusData.find(c => c.id === campusId);
        if (found) setActiveCampus(found);
      }
    } catch (e) {
      console.log('Failed to load campus, using default:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCampus = async (campusId) => {
    try {
      const found = campusData.find(c => c.id === campusId);
      if (found) {
        setActiveCampus(found);
        await AsyncStorage.setItem('selectedCampus', campusId);
      }
    } catch (e) {
      console.log('Failed to save campus:', e);
    }
  };

  return (
    <CampusContext.Provider value={{ activeCampus, selectCampus, isLoading, allCampuses: campusData }}>
      {children}
    </CampusContext.Provider>
  );
};