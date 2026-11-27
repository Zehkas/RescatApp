import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarPermisosNotificaciones(): Promise<boolean> {
  try {
    // Se aísla la creación del canal para que, si Expo Go la rechaza,
    // el flujo continúe y solicite los permisos normalmente.
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Alertas Rescatapp',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00C853',
        });
      } catch {
        // Expo Go usa su canal por defecto automáticamente
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error al solicitar permisos de notificación:', error);
    return false;
  }
}

export async function mostrarNotificacionLocal(titulo: string, cuerpo: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Error al mostrar notificación local:', error);
  }
}

export function iniciarNotificacionesBolsas() {
  if (activeChannel) return; // Evita crear suscripciones duplicadas

  activeChannel = supabase
    .channel('notificaciones-nuevas-bolsas')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bolsas',
      },
      async (payload) => {
        const nuevaBolsa = payload.new;
        if (!nuevaBolsa || nuevaBolsa.estado !== 'disponible') return;

        let nombreLocal = 'Un negocio cercano';
        if (nuevaBolsa.id_comercio) {
          const { data: comercio } = await supabase
            .from('comercio')
            .select('nombre_local')
            .eq('id_comercio', nuevaBolsa.id_comercio)
            .maybeSingle();

          if (comercio?.nombre_local) {
            nombreLocal = comercio.nombre_local;
          }
        }

        const categoriaTexto = nuevaBolsa.categoria
          ? nuevaBolsa.categoria.toLowerCase()
          : 'bolsa sorpresa';

        await mostrarNotificacionLocal(
          'RescatAPP',
          `${nombreLocal} ha subido ${nuevaBolsa.nombre} (${categoriaTexto}). Revísalo en RescatAPP.`
        );
      }
    )
    .subscribe();
}

export function detenerNotificacionesBolsas() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}