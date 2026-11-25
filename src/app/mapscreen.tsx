import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

type RescateDisponible = {
    id: string;
    rawId: string | number;
    nombreLocal: string;
    direccion: string;
    producto: string;
    categoria: string;
    precioNormal: number;
    precioRescate: number;
    distancia: string;
    coordenadas: {
        latitude: number;
        longitude: number;
    } | null;
};

type ReservaActiva = {
    item: RescateDisponible;
    codigoRetiro: string;
    fechaReserva: string;
};

const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const metros = R * c;

    return metros < 1000
        ? `${metros.toFixed(1)} m`
        : `${(metros / 1000).toFixed(1)} km`;
};

const OPCIONES_RADIO = [
    { label: 'Todos', valor: null },
    { label: '1 km', valor: 1000 },
    { label: '3 km', valor: 3000 },
    { label: '5 km', valor: 5000 },
];

const textoAMetros = (texto: string): number => {
    const valor = parseFloat(texto);
    if (isNaN(valor)) return Infinity;
    return texto.includes('km') ? valor * 1000 : valor;
};

const MapScreen = () => {
    const router = useRouter();
    const mapRef = useRef<MapView | null>(null);

    const [location, setLocation] = useState<Region | null>(null);
    const [rescates, setRescates] = useState<RescateDisponible[]>([]);
    const [loadingBolsas, setLoadingBolsas] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [reservando, setReservando] = useState(false);
    const [reservaActiva, setReservaActiva] = useState<ReservaActiva | null>(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);

    const [tiempoRestante, setTiempoRestante] = useState('15:00');

    const [radioFiltro, setRadioFiltro] = useState<number | null>(null);

    const rescatesFiltrados = rescates
        .filter((item) => {
            if (radioFiltro === null) return true;
            return textoAMetros(item.distancia) <= radioFiltro;
        })
        .sort((a, b) => textoAMetros(a.distancia) - textoAMetros(b.distancia));

    useEffect(() => {
        if (!qrModalVisible || !reservaActiva?.fechaReserva) return;

        const actualizarTiempo = () => {
            const limite = new Date(reservaActiva.fechaReserva).getTime() + 15 * 60 * 1000;
            const diferencia = limite - Date.now();

            if (diferencia <= 0) {
                setTiempoRestante('Reserva expirada');
                return;
            }

            const minutos = Math.floor(diferencia / 60000);
            const segundos = Math.floor((diferencia % 60000) / 1000);
            setTiempoRestante(`${minutos}:${segundos.toString().padStart(2, '0')} min`);
        };

        actualizarTiempo();
        const intervalo = setInterval(actualizarTiempo, 1000);

        return () => clearInterval(intervalo);
    }, [qrModalVisible, reservaActiva]);

    const fetchBolsasDisponibles = async (userLat?: number, userLon?: number) => {
        try {
            const { data, error } = await supabase
                .from('bolsas')
                .select(`
                    id_bolsa,
                    nombre,
                    categoria,
                    precio_normal,
                    precio_rescate,
                    estado,
                    comercio (
                        id_comercio,
                        nombre_local,
                        direccion,
                        latitud,
                        longitud
                    )
                `)
                .eq('estado', 'disponible');

            if (error) throw error;

            if (data) {
                const formateadas: RescateDisponible[] = data.map((bolsa: any) => {
                    const comercio = Array.isArray(bolsa.comercio) ? bolsa.comercio[0] : bolsa.comercio;
                    const lat = comercio?.latitud != null ? Number(comercio.latitud) : null;
                    const lon = comercio?.longitud != null ? Number(comercio.longitud) : null;

                    let distanciaTexto = '-- m';
                    if (userLat !== undefined && userLon !== undefined && lat !== null && lon !== null) {
                        distanciaTexto = calcularDistancia(userLat, userLon, lat, lon);
                    }

                    return {
                        id: String(bolsa.id_bolsa),
                        rawId: bolsa.id_bolsa,
                        nombreLocal: comercio?.nombre_local ?? 'Comercio local',
                        direccion: comercio?.direccion ?? 'Dirección no especificada',
                        producto: bolsa.nombre,
                        categoria: bolsa.categoria,
                        precioNormal: bolsa.precio_normal,
                        precioRescate: bolsa.precio_rescate,
                        distancia: distanciaTexto,
                        coordenadas: lat !== null && lon !== null ? { latitude: lat, longitude: lon } : null,
                    };
                });

                setRescates(formateadas);
            }
        } catch (error) {
            console.error('Error al cargar bolsas:', error);
            Alert.alert('Error', 'No se pudieron cargar las bolsas disponibles.');
        } finally {
            setLoadingBolsas(false);
        }
    };

    const fetchReservaActiva = async (userLat?: number, userLon?: number) => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) return;

            const { data, error } = await supabase
                .from('reserva')
                .select(`
                    id_reserva,
                    codigo_retiro,
                    estado,
                    fecha_reserva,
                    bolsas (
                        id_bolsa,
                        nombre,
                        categoria,
                        precio_normal,
                        precio_rescate,
                        comercio (
                            nombre_local,
                            direccion,
                            latitud,
                            longitud
                        )
                    )
                `)
                .eq('id_usuario', user.id)
                .eq('estado', 'activa')
                .order('fecha_reserva', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data && data.bolsas) {
                const bolsa: any = Array.isArray(data.bolsas) ? data.bolsas[0] : data.bolsas;
                const comercio: any = Array.isArray(bolsa.comercio) ? bolsa.comercio[0] : bolsa.comercio;
                const lat = comercio?.latitud != null ? Number(comercio.latitud) : null;
                const lon = comercio?.longitud != null ? Number(comercio.longitud) : null;
                const limite = new Date(data.fecha_reserva).getTime() + 15 * 60 * 1000;
                if (Date.now() >= limite) return;

                let distanciaTexto = '-- m';
                if (userLat !== undefined && userLon !== undefined && lat !== null && lon !== null) {
                    distanciaTexto = calcularDistancia(userLat, userLon, lat, lon);
                }

                setReservaActiva({
                    codigoRetiro: data.codigo_retiro,
                    fechaReserva: data.fecha_reserva,
                    item: {
                        id: String(bolsa.id_bolsa),
                        rawId: bolsa.id_bolsa,
                        nombreLocal: comercio?.nombre_local ?? 'Comercio local',
                        direccion: comercio?.direccion ?? 'Dirección no especificada',
                        producto: bolsa.nombre,
                        categoria: bolsa.categoria,
                        precioNormal: bolsa.precio_normal,
                        precioRescate: bolsa.precio_rescate,
                        distancia: distanciaTexto,
                        coordenadas: lat !== null && lon !== null ? { latitude: lat, longitude: lon } : null,
                    },
                });
            }
        } catch (error) {
            console.error('Error al recuperar reserva activa:', error);
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                await Promise.all([
                    fetchBolsasDisponibles(),
                    fetchReservaActiva(),
                ]);
                return;
            }

            let currentLocation = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLocation.coords;

            setLocation({
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });

            await Promise.all([
                fetchBolsasDisponibles(latitude, longitude),
                fetchReservaActiva(latitude, longitude),
            ]);
        })();
    }, []);

    const handleSelectCard = (item: RescateDisponible) => {
        const isAlreadySelected = selectedId === item.id;
        setSelectedId(isAlreadySelected ? null : item.id);

        if (!isAlreadySelected && item.coordenadas && mapRef.current) {
            mapRef.current.animateToRegion(
                {
                    latitude: item.coordenadas.latitude,
                    longitude: item.coordenadas.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                },
                500
            );
        }
    };

    const generarClaveProducto = (item: RescateDisponible): string => {
        const formatoSegmento = (texto: string) =>
            texto
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
                .replace(/[^a-zA-Z0-9]/g, '')    // Elimina espacios y caracteres especiales
                .toUpperCase()
                .slice(0, 4);

        const nombreCode = formatoSegmento(item.producto);
        const categoriaCode = formatoSegmento(item.categoria);
        const idCode = item.id.replace(/-/g, '').toUpperCase().slice(0, 4);

        return `RES-${nombreCode}-${categoriaCode}-${idCode}`;
    };

    const handleReservar = async (item: RescateDisponible) => {
        if (reservando) return;
        setReservando(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                Alert.alert('Sesión requerida', 'Debes iniciar sesión para reservar una bolsa.');
                setReservando(false);
                return;
            }

            const codigoRetiro = generarClaveProducto(item);

            const fechaReserva = new Date().toISOString();

            // 1. Insertar registro en la tabla "reserva"
            const { error: reservaError } = await supabase
                .from('reserva')
                .insert([
                    {
                        id_bolsa: item.rawId,
                        id_usuario: user.id,
                        codigo_retiro: codigoRetiro,
                        estado: 'activa',
                        fecha_reserva: fechaReserva,
                    },
                ]);

            if (reservaError) throw reservaError;

            // 2. Actualizar el estado de la bolsa a "reservada"
            const { error: bolsaError } = await supabase
                .from('bolsas')
                .update({ estado: 'reservada' })
                .eq('id_bolsa', item.rawId);

            if (bolsaError) throw bolsaError;

            // 3. Mostrar tarjeta con QR y quitar la bolsa reservada del carrusel disponible
            setReservaActiva({ item, codigoRetiro, fechaReserva });
            setQrModalVisible(true);
            setSelectedId(null);
            setRescates((prev) => prev.filter((b) => b.id !== item.id));
        } catch (error: any) {
            console.error('Error al reservar:', error);
            Alert.alert('Error al reservar', error.message || 'No se pudo completar la reserva.');
        } finally {
            setReservando(false);
        }
    };

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

            {reservaActiva && (
                <TouchableOpacity
                    onPress={() => setQrModalVisible(true)}
                    style={styles.activeQrPill}
                >
                    <Ionicons name="qr-code" size={20} color="#FFF" />
                    <Text style={styles.activeQrPillText}>Ver QR de retiro</Text>
                </TouchableOpacity>
            )}


            {/* Barra de filtros por cercanía */}
            <View style={styles.filterContainer}>
                {OPCIONES_RADIO.map((opcion) => {
                    const activo = radioFiltro === opcion.valor;
                    return (
                        <TouchableOpacity
                            key={opcion.label}
                            style={[styles.filterPill, activo && styles.filterPillActive]}
                            onPress={() => {
                                setRadioFiltro(opcion.valor);
                                setSelectedId(null);
                            }}
                        >
                            <Text style={[styles.filterText, activo && styles.filterTextActive]}>
                                {opcion.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={location}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {rescatesFiltrados.map((item) =>
                    item.coordenadas ? (
                        <Marker
                            key={item.id}
                            coordinate={item.coordenadas}
                            title={item.nombreLocal}
                            description={`${item.producto} - $${item.precioRescate}`}
                            pinColor={selectedId === item.id ? '#00bf19' : 'red'}
                        />
                    ) : null
                )}
            </MapView>

            {/* Carrusel inferior de bolsas disponibles */}
            <View style={styles.carouselContainer}>
                {loadingBolsas ? (
                    <View style={styles.emptyCard}>
                        <ActivityIndicator size="small" color="#00bf19" />
                        <Text style={{ marginLeft: 10, color: 'gray' }}>Buscando rescates...</Text>
                    </View>
                ) : rescatesFiltrados.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={{ color: 'gray' }}>No hay bolsas disponibles en este momento.</Text>
                    </View>
                ) : (
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={rescatesFiltrados}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'flex-end' }}
                        renderItem={({ item }) => {
                            const isExpanded = selectedId === item.id;

                            return (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => handleSelectCard(item)}
                                    style={[styles.card, isExpanded && styles.cardExpanded]}
                                >
                                    <Text style={styles.cardTitle} numberOfLines={1}>
                                        {item.nombreLocal}
                                    </Text>
                                    <Text style={styles.cardItem} numberOfLines={1}>
                                        {item.producto}
                                    </Text>
                                    <Text style={styles.cardType}>{item.categoria}</Text>

                                    <View style={styles.priceRow}>
                                        <View>
                                            <Text style={styles.oldPrice}>${item.precioNormal}</Text>
                                            <Text style={styles.newPrice}>${item.precioRescate}</Text>
                                        </View>
                                        <Text style={styles.distance}>{item.distancia}</Text>
                                    </View>

                                    {/* Contenido extra al expandir la tarjeta */}
                                    {isExpanded && (
                                        <View style={styles.expandedSection}>
                                            <Text style={styles.addressText} numberOfLines={2}>
                                                📍 {item.direccion}
                                            </Text>

                                            <TouchableOpacity
                                                style={styles.reserveButton}
                                                onPress={() => handleReservar(item)}
                                                disabled={reservando}
                                            >
                                                {reservando ? (
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                ) : (
                                                    <Text style={styles.reserveButtonText}>Reservar</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>

            {/* Tarjeta Superpuesta de Reserva con Código QR */}
            <Modal
                visible={qrModalVisible && reservaActiva !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setQrModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {reservaActiva && (
                        <View style={styles.qrCard}>
                            <TouchableOpacity
                                style={styles.closeQrButton}
                                onPress={() => setQrModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color="#555" />
                            </TouchableOpacity>

                            <View style={styles.qrHeader}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.qrLocalTitle}>{reservaActiva.item.nombreLocal}</Text>
                                    <Text style={styles.qrProductText}>{reservaActiva.item.producto}</Text>
                                    <Text style={styles.qrCategoryText}>{reservaActiva.item.categoria}</Text>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.qrNewPrice}>${reservaActiva.item.precioRescate}</Text>
                                    <Text style={styles.qrOldPrice}>${reservaActiva.item.precioNormal}</Text>
                                </View>
                            </View>

                            <View style={styles.qrCodeWrapper}>
                                <QRCode
                                    value={reservaActiva.codigoRetiro}
                                    size={190}
                                    color="#000000"
                                    backgroundColor="#FFFFFF"
                                />
                                <Text style={styles.qrKeyText}>{reservaActiva.codigoRetiro}</Text>
                            </View>

                            <View style={styles.qrFooter}>
                                <View>
                                    <Text style={styles.reservedLabel}>Reservado</Text>
                                    <Text style={styles.pickupTimeText}>
                                        Tiempo restante para recoger:{'\n'}{tiempoRestante}
                                    </Text>
                                </View>
                                <Text style={styles.qrDistance}>{reservaActiva.item.distancia}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
};

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
    activeQrPill: {
        position: 'absolute',
        top: 50,
        left: 80,
        zIndex: 10,
        backgroundColor: '#00bf19',
        height: 50,
        paddingHorizontal: 16,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    activeQrPillText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    carouselContainer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        marginHorizontal: 6,
        width: 170,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    cardExpanded: {
        width: 220,
        borderWidth: 1.5,
        borderColor: '#00bf19',
        elevation: 8,
    },
    emptyCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        marginHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
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
    expandedSection: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    addressText: {
        fontSize: 12,
        color: '#555',
        marginBottom: 10,
    },
    reserveButton: {
        backgroundColor: '#00bf19',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    reserveButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Estilos de la tarjeta QR superpuesta
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    qrCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        padding: 24,
        width: '100%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        position: 'relative',
    },
    closeQrButton: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 10,
        padding: 4,
    },
    qrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 8,
    },
    qrLocalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    qrProductText: {
        fontSize: 15,
        color: '#333',
        marginTop: 4,
    },
    qrCategoryText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    qrNewPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00bf19',
    },
    qrOldPrice: {
        fontSize: 13,
        color: 'gray',
        textDecorationLine: 'line-through',
    },
    qrCodeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 28,
    },
    qrKeyText: {
        marginTop: 10,
        fontSize: 12,
        color: '#777',
        letterSpacing: 1,
    },
    qrFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    reservedLabel: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    pickupTimeText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
    qrDistance: {
        fontSize: 13,
        color: '#555',
    },
    filterContainer: {
        position: 'absolute',
        top: 112,
        left: 20,
        right: 20,
        zIndex: 10,
        flexDirection: 'row',
        gap: 8,
    },
    filterPill: {
        backgroundColor: 'white',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    filterPillActive: {
        backgroundColor: '#00bf19',
    },
    filterText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#555',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
});

export default MapScreen;