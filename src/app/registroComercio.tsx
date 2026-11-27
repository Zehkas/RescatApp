import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapaOSM, { Coordenada } from '../components/MapaOSM';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

type Coordenadas = {
  latitude: number;
  longitude: number;
};

const RegistroComercio = () => {
  const router = useRouter();
  const [region, setRegion] = useState<Coordenada>({
    latitude: -35.4264,
    longitude: -71.6554,
  });
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenada | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  // Datos de cuenta
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Datos del local
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const obtenerUbicacionActual = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'No pudimos acceder a tu ubicación. Puedes buscar tu local manualmente en el mapa.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setRegion(coords);
        setUbicacionUsuario(coords);
      } catch (error) {
        console.warn('No se pudo obtener la ubicación:', error);
      }
    };

    obtenerUbicacionActual();
  }, []);

  const handleMapPress = (coordenada: Coordenada) => {
    setUbicacion(coordenada);
  };

  const marcadoresLocal = useMemo(
    () =>
      ubicacion
        ? [{ id: 'local', ...ubicacion, titulo: nombreLocal || 'Tu local', color: '#00C853' }]
        : [],
    [ubicacion, nombreLocal]
  );

  const handleRegistrarComercio = async () => {
    if (!email || !password || !confirmPassword || !nombreLocal || !ubicacion) {
      Alert.alert('Error', 'Completa todos los campos y marca la ubicación de tu local en el mapa.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: nombreLocal.trim(),
            is_vendedor: true,
            id_comercio: null,
            exp: 0,
            bolsas_rescatadas: 0,
            ahorro: 0,
            bolsas_vendidas: 0,
          },
        },
      });

      if (authError || !authData.user) {
        throw authError || new Error('No se pudo crear la cuenta.');
      }


      const { data: comercioData, error: comercioError } = await supabase
        .from('comercio')
        .insert([
          {
            nombre_local: nombreLocal.trim(),
            direccion: direccion.trim() || 'Sin dirección',
            latitud: ubicacion.latitude,
            longitud: ubicacion.longitude,
          },
        ])
        .select('id_comercio')
        .single();

      if (comercioError || !comercioData) {
        throw comercioError || new Error('No se pudo registrar el comercio.');
      }

      // Vincular el id_comercio al usuario recién creado
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ id_comercio: comercioData.id_comercio })
        .eq('id_usuario', authData.user.id);

      if (updateError) throw updateError;

      Alert.alert('Éxito', 'Local y cuenta de vendedor registrados correctamente');
      router.replace('/mapscreen')
    } catch (error: any) {
      console.error('Error al registrar comercio:', error);
      Alert.alert('Error', error.message || 'Hubo un problema al registrar el local');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <View style={styles.logoPlaceholder}>
              <Ionicons name="basket" size={40} color="#FF7043" />
            </View>
            <Text style={styles.appName}>RescatApp</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Registra tu Local</Text>

            <View style={styles.inputRow}>
              <Ionicons name="storefront" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre del Local"
                value={nombreLocal}
                onChangeText={setNombreLocal}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="mail" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Correo"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar Contraseña"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            

            <View style={styles.inputRow}>
              <Ionicons name="location" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Dirección (Opcional)"
                value={direccion}
                onChangeText={setDireccion}
              />
            </View>


            {/* Mapa para seleccionar ubicación */}

            <Text style={styles.mapLabel}>En el mapa ubica tu local</Text>
            <View style={styles.mapContainer}>
              <MapaOSM
                style={styles.map}
                centro={region}
                zoom={16}
                ubicacionUsuario={ubicacionUsuario}
                marcadores={marcadoresLocal}
                onPress={handleMapPress}
              />

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="expand" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            {ubicacion && (
              <Text style={styles.coordsText}>
                Ubicación: {ubicacion.latitude.toFixed(5)}, {ubicacion.longitude.toFixed(5)}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.mainButton, loading && { opacity: 0.6 }]}
              onPress={handleRegistrarComercio}
              disabled={loading}
            >
              <Text style={styles.mainButtonText}>
                {loading ? 'Registrando...' : 'Registrar Local'}
              </Text>
            </TouchableOpacity>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.toggleLink}> Inicia Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderText}>Toca el mapa para marcar tu local</Text>
          </View>

          <MapaOSM
            style={styles.fullMap}
            centro={region}
            zoom={16}
            ubicacionUsuario={ubicacionUsuario}
            marcadores={marcadoresLocal}
            onPress={handleMapPress}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.confirmMapButton, !ubicacion && { backgroundColor: '#9E9E9E' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.mainButtonText}>
                {ubicacion ? 'Confirmar Ubicación' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFE0B2',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    padding: 15,
    borderRadius: 25,
    fontSize: 16,
  },
  mapLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 10,
  },
  mapContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  coordsText: {
    fontSize: 12,
    color: '#00C853',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  mainButton: {
    backgroundColor: '#00C853',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  toggleText: {
    fontSize: 14,
    color: '#333',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0056b3',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    position: 'relative',
  },
  fullMap: {
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeaderText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 35,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  confirmMapButton: {
    backgroundColor: '#00C853',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default RegistroComercio;