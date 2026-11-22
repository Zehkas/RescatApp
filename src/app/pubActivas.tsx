import { supabase } from '@/utils/supabase';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BotonNav from './botonNav';

type arrayPub = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio_normal: number;
  precio_rescate: number;
  stock: number;
  estado: string;
};

const pubActivas = () => {
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<arrayPub[]>([]);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanningId, setScanningId] = useState<string | null>(null);
  const isProcessingScan = useRef(false); // Evita múltiples escaneos simultáneos

  useEffect(() => {
    const fetchPublicaciones = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id_comercio')
          .eq('id_usuario', user.id)
          .single();

        if (userError || !userData?.id_comercio) return;

        const { data: bolsasData, error: bolsasError } = await supabase
          .from('bolsas')
          .select('id_bolsa, nombre, descripcion, categoria, precio_normal, precio_rescate, stock, estado, hora_retiro')
          .eq('id_comercio', userData.id_comercio)
          .order('hora_retiro', { ascending: true });

        if (bolsasError) throw bolsasError;

        if (bolsasData) {
          const publicacionesActivas: arrayPub[] = bolsasData.map((bolsa) => ({
            id: bolsa.id_bolsa,
            nombre: bolsa.nombre,
            descripcion: bolsa.descripcion,
            categoria: bolsa.categoria,
            precio_normal: bolsa.precio_normal,
            precio_rescate: bolsa.precio_rescate,
            stock: bolsa.stock,
            estado: bolsa.estado,
          }));
          setPublicaciones(publicacionesActivas);
        }
      } catch (error) {
        console.error('Error al cargar publicaciones:', error);
        Alert.alert('Error', 'No se pudieron cargar tus publicaciones activas');
      }
    };

    fetchPublicaciones();
  }, []);

  const handleOpenScanner = async (id: string) => {
    // Verificamos si ya tenemos permiso de cámara; si no, lo solicitamos
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitas habilitar el acceso a la cámara para escanear el código QR de la reserva.'
        );
        return;
      }
    }

    // Activamos la cámara únicamente para esta publicación
    setScanningId(id);
  };

const handleBarcodeScanned = async (idPublicacion: string, result: BarcodeScanningResult) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    setScanningId(null);

    try {
      const codigoEscaneado = result.data.trim();

      // 1. Buscar la reserva activa asociada a esta bolsa
      const { data: reservaData, error: reservaError } = await supabase
        .from('reserva')
        .select('id_reserva, id_usuario, codigo_retiro')
        .eq('id_bolsa', idPublicacion)
        .eq('estado', 'activa')
        .maybeSingle();

      if (reservaError) throw reservaError;

      // 2. Validar que el QR coincida con el codigo_retiro de la reserva
      if (!reservaData || reservaData.codigo_retiro?.trim() !== codigoEscaneado) {
        Alert.alert('QR Inválido', 'Este QR no corresponde al asociado para esta reserva');
        isProcessingScan.current = false;
        return;
      }

      // 3. Calcular ahorro y experiencia (10% del ahorro + 100 exp base)
      const bolsaActual = publicaciones.find((p) => p.id === idPublicacion);
      const precioNormal = bolsaActual?.precio_normal ?? 0;
      const precioRescate = bolsaActual?.precio_rescate ?? 0;
      const ahorroCalculado = Math.max(0, precioNormal - precioRescate);
      const expGanada = Math.round(ahorroCalculado * 0.1) + 100;

      // 4. Actualizar estado de la bolsa y la reserva a "completada"
      const { error: updateBolsaError } = await supabase
        .from('bolsas')
        .update({ estado: 'completada' })
        .eq('id_bolsa', idPublicacion);

      if (updateBolsaError) throw updateBolsaError;

      const { error: updateReservaError } = await supabase
        .from('reserva')
        .update({ estado: 'completada' })
        .eq('id_reserva', reservaData.id_reserva);

      if (updateReservaError) throw updateReservaError;

      // 5. Actualizar estadísticas y experiencia en la tabla "usuarios"
      const { data: { user: vendedorAuth }, error: authError } = await supabase.auth.getUser();
      if (authError || !vendedorAuth) throw new Error('No se pudo identificar al vendedor.');

      const idVendedor = vendedorAuth.id;
      const idRescatista = reservaData.id_usuario;

      if (idVendedor === idRescatista) {
        // Si pruebas reservando y escaneando con la misma cuenta
        const { data: mismoUsuario, error: fetchError } = await supabase
          .from('usuarios')
          .select('exp, bolsas_vendidas, bolsas_rescatadas, ahorro')
          .eq('id_usuario', idVendedor)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            exp: (mismoUsuario.exp ?? 0) + expGanada * 2,
            bolsas_vendidas: (mismoUsuario.bolsas_vendidas ?? 0) + 1,
            bolsas_rescatadas: (mismoUsuario.bolsas_rescatadas ?? 0) + 1,
            ahorro: (mismoUsuario.ahorro ?? 0) + ahorroCalculado,
          })
          .eq('id_usuario', idVendedor);

        if (updateError) throw updateError;
      } else {
        // Actualizar Vendedor (+1 bolsa vendida, +exp)
        const { data: vendedorData, error: fetchVendedorError } = await supabase
          .from('usuarios')
          .select('exp, bolsas_vendidas')
          .eq('id_usuario', idVendedor)
          .single();

        if (fetchVendedorError) throw fetchVendedorError;

        const { error: updateVendedorError } = await supabase
          .from('usuarios')
          .update({
            exp: (vendedorData.exp ?? 0) + expGanada,
            bolsas_vendidas: (vendedorData.bolsas_vendidas ?? 0) + 1,
          })
          .eq('id_usuario', idVendedor);

        if (updateVendedorError) throw updateVendedorError;

        // Actualizar Rescatista (+1 bolsa rescatada, +ahorro, +exp)
        const { data: rescatistaData, error: fetchRescatistaError } = await supabase
          .from('usuarios')
          .select('exp, bolsas_rescatadas, ahorro')
          .eq('id_usuario', idRescatista)
          .single();

        if (fetchRescatistaError) throw fetchRescatistaError;

        const { error: updateRescatistaError } = await supabase
          .from('usuarios')
          .update({
            exp: (rescatistaData.exp ?? 0) + expGanada,
            bolsas_rescatadas: (rescatistaData.bolsas_rescatadas ?? 0) + 1,
            ahorro: (rescatistaData.ahorro ?? 0) + ahorroCalculado,
          })
          .eq('id_usuario', idRescatista);

        if (updateRescatistaError) throw updateRescatistaError;
      }

      // 6. Actualizar la tarjeta en pantalla para ocultar el visor QR
      setPublicaciones((prev) =>
        prev.map((pub) =>
          pub.id === idPublicacion ? { ...pub, estado: 'completada' } : pub
        )
      );

      Alert.alert(
        '¡Entrega Completada!',
        `Reserva validada correctamente.\n+${expGanada} EXP sumados a ambos perfiles.`
      );
    } catch (error: any) {
      console.error('Error al validar QR:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar la validación del QR.');
    } finally {
      isProcessingScan.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.replace('/publicaciones')}>
          <Text style={styles.tabText}>Crear Publicación</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Ver Publicaciones</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.mainCard}>
          <Text style={styles.mainTitle}>Publicaciones Activas</Text>

          {publicaciones.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>
              No tienes publicaciones activas en este momento.
            </Text>
          ) : (
            publicaciones.map((pub) => {
              const isScanningThis = scanningId === pub.id;

              return (
                <View key={pub.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.nameContainer}>
                      <Text style={styles.itemName}>{pub.nombre}</Text>

                      <Text
                        style={[
                          styles.itemStatus,
                          pub.estado === 'reservada' && styles.statusReservada,
                          pub.estado === 'expirada' && styles.statusExpirada,
                          pub.estado === 'disponible' && { color: '#00C853' },
                        ]}
                      >
                        {pub.estado ? pub.estado.charAt(0).toUpperCase() + pub.estado.slice(1) : ''}
                      </Text>
                    </View>

                    <View style={styles.priceContainer}>
                      <Text style={styles.normalPrice}>${pub.precio_normal}</Text>
                      <Text style={styles.specialPrice}>${pub.precio_rescate}</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: '#777' }}>
                      Categoría: {pub.categoria}
                    </Text>

                    {pub.estado === 'disponible' && (
                      <Text style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                        Stock disponible: {pub.stock}
                      </Text>
                    )}
                  </View>

                  {pub.estado === 'reservada' && (
                    <View style={styles.scannerContainer}>
                      {isScanningThis ? (
                        <>
                          {/* Lector QR activo dentro de la ventana del pedido */}
                          <View style={styles.scannerBox}>
                            <CameraView
                              style={StyleSheet.absoluteFill}
                              facing="back"
                              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                              onBarcodeScanned={(result) => handleBarcodeScanned(pub.id, result)}
                            />
                            {/* Guías blancas superpuestas sobre la cámara */}
                            <View pointerEvents="none" style={[styles.corner, styles.topLeft]} />
                            <View pointerEvents="none" style={[styles.corner, styles.topRight]} />
                            <View pointerEvents="none" style={[styles.corner, styles.bottomLeft]} />
                            <View pointerEvents="none" style={[styles.corner, styles.bottomRight]} />
                          </View>

                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setScanningId(null)}
                          >
                            <Text style={styles.cancelButtonText}>Cerrar cámara</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        /* Botón/Recuadro para abrir la cámara */
                        <TouchableOpacity
                          style={{ alignItems: 'center' }}
                          onPress={() => handleOpenScanner(pub.id)}
                        >
                          <View style={styles.scannerBox}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                          </View>
                          <Text style={styles.scannerText}>Escanea el QR de la reserva</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      <BotonNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: '#000',
  },
  content: {
    padding: 20,
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  itemStatus: {
    fontSize: 12,
    marginLeft: 5,
    color: '#666',
  },
  statusReservada: {
    color: '#555',
  },
  statusExpirada: {
    color: 'red',
    fontStyle: 'italic',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  normalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  specialPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scannerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  scannerBox: {
    width: 220,
    height: 220,
    backgroundColor: '#000',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 18,
    left: 18,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 18,
    right: 18,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  cancelButton: {
    backgroundColor: '#E53935',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default pubActivas;