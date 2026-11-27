import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  detenerNotificacionesBolsas,
  iniciarNotificacionesBolsas,
} from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    const cargarPreferenciaNotificaciones = async () => {
      const activas = await AsyncStorage.getItem('notificaciones_activas');
      if (activas === 'true') {
        iniciarNotificacionesBolsas();
      }
    };

    cargarPreferenciaNotificaciones();

    return () => {
      detenerNotificacionesBolsas();
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}