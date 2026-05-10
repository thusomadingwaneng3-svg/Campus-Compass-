import AsyncStorage from '@react-native-async-storage/async-storage';

export const isPro = async (): Promise<boolean> => {
  const pro = await AsyncStorage.getItem('isPro');
  return pro === 'true';
};

export const setPro = async (): Promise<void> => {
  await AsyncStorage.setItem('isPro', 'true');
};