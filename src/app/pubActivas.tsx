import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BotonNav from './botonNav';

type arrayPub = { //modificar segun datos en BDD
  id: string,
  nombre: string,
  precioNormal: number,
  precioRescate: number,
  estado: string
};

const pubActivas = () => {

  const router = useRouter()
  const [publicaciones, setPublicaciones] = useState<arrayPub[]>([])

  useEffect(() => {//Extraer las publicaciones activas de la base de datos
    // Simulación de datos obtenidos de la base de datos
    const publicacionesActivas = [
      { id: '1', nombre: 'Muffins Frambuesa', precioNormal: 2500, precioRescate: 1500, estado: 'esperando reserva' },
      { id: '2', nombre: 'Kilo Pan', precioNormal: 1390, precioRescate: 1000, estado: 'expirada' },
      { id: '3', nombre: 'Tartaleta', precioNormal: 8990, precioRescate: 6990, estado: 'expirada' }
    ];
    setPublicaciones(publicacionesActivas);
  }, [])

  const handleScanQR = (id: string) => {
    // Lógica para escanear el código QR y actualizar el estado de la publicación
    console.log('Escaneando código QR...');
  }

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

      <ScrollView style={styles.content}>
        <View style={styles.mainCard}>
          <Text style={styles.mainTitle}>Publicaciones Activas</Text>
          {publicaciones.map((pub) => (
            <View key={pub.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.nameContainer}>
                  <Text style={styles.itemName}>{pub.nombre}</Text>
                  <Text style={[
                    styles.itemStatus,
                    pub.estado === 'reservada' && styles.statusReservada,
                    pub.estado === 'expirada' && styles.statusExpirada
                  ]}>{pub.estado === 'esperando reserva' ? '' : pub.estado.charAt(0).toUpperCase() + pub.estado.slice(1)}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.normalPrice}>${pub.precioNormal}</Text>
                  <Text style={styles.specialPrice}>${pub.precioRescate}</Text>
                </View>
              </View>
              {pub.estado === 'reservada' && (
                <TouchableOpacity style={styles.scannerContainer} onPress={() => handleScanQR(pub.id)}>
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
          ))}
        </View>
      </ScrollView>
      <BotonNav />
    </SafeAreaView>
  )
}

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
    // Sombra sutil para cada ítem similar a la imagen
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
    color: '#666', // Por defecto gris para "esperando reserva" si decidieras mostrarlo
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
    width: 200,
    height: 200,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  // Bordes blancos simulando las esquinas del lector QR
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 20,
    right: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  }
});

export default pubActivas