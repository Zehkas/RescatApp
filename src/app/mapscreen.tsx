import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const MapScreen = () => {
    const router = useRouter();
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg("Permission to access location was denied");
                return;
            }
            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        })();
    }, []);
    if (!location) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#00BFA5" />
                <Text style={{ marginTop: 10 }}>Obteniendo ubicación...</Text>
            </View>
        );
    }
    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={() => router.replace('/perfil')} style={styles.floatingButton}>
                <Ionicons name="person" size={24} color="#555" />
            </TouchableOpacity>
            <MapView
                style={styles.map}
                initialRegion={location}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {/* Markers */}
            </MapView>

            <View style={styles.carouselContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={rescatesDisponibles}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.nombre}</Text>
                            <Text style={styles.cardItem}>{item.producto}</Text>
                            <Text style={styles.cardType}>{item.tipo}</Text>
                            <View style={styles.priceRow}>
                                <View>
                                    <Text style={styles.oldPrice}>{item.precioNormal}</Text>
                                    <Text style={styles.newPrice}>{item.precioRescate}</Text>
                                </View>
                                <Text style={styles.distance}>{item.distancia}</Text>
                            </View>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

const rescatesDisponibles = [
    {
        id: '1',
        nombre: 'Anago Izakaya',
        producto: 'Onigiri Pollo',
        tipo: 'Entrada',
        precioNormal: '$4000',
        precioRescate: '$2000',
        distancia: '23.2 m',
        coordenadas: { latitude: -35.5960, longitude: -71.7330 }
    },
    {
        id: '2',
        nombre: 'Como en Peru',
        producto: 'Tallarines',
        tipo: 'Plato Fondo',
        precioNormal: '$8990',
        precioRescate: '$3490',
        distancia: '45.0 m',
        coordenadas: { latitude: -35.5970, longitude: -71.7310 }
    }
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    floatingButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        backgroundColor: 'white',
        width: 50,
        height: 50,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconText: {
        fontSize: 24,
    },
    carouselContainer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        marginHorizontal: 5,
        width: 150, //Ancho tarjetas
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardItem: {
        fontSize: 14,
        marginTop: 5,
    },
    cardType: {
        fontSize: 14,
        color: 'gray',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 15,
    },
    oldPrice: {
        textDecorationLine: 'line-through',
        color: 'gray',
        fontSize: 12,
    },
    newPrice: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#00bf19',
    },
    distance: {
        color: 'gray',
        fontSize: 12,
    },
});
export default MapScreen;