import {
    detenerNotificacionesBolsas,
    iniciarNotificacionesBolsas,
    registrarPermisosNotificaciones,
} from '@/utils/notifications'
import { supabase } from '@/utils/supabase'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import BotonNav from './botonNav'

type Usuario = {
    id_usuario: string,
    username: string,
    is_vendedor: boolean,
    exp: number, //Transformar en nivel y progreso
    bolsas_rescatadas: number,
    ahorro: number,
    bolsas_vendidas: number //Solo si es vendedor
}

const perfil = () => {
    const router = useRouter()
    const [user, setUser] = useState<Usuario | null>(null)
    const [notificacionesActivas, setNotificacionesActivas] = useState(false)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (authUser) {
                    const { data: userData } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('id_usuario', authUser.id)
                        .single();

                    if (userData) {
                        setUser(userData);
                    }
                }
            } catch (error) {
                Alert.alert('Error', 'Error al cargar los datos del usuario');
            }
        };

        const cargarEstadoNotificaciones = async () => {
            const guardado = await AsyncStorage.getItem('notificaciones_activas');
            const { status } = await Notifications.getPermissionsAsync();
            setNotificacionesActivas(guardado === 'true' && status === 'granted');
        };

        fetchUserData();
        cargarEstadoNotificaciones();
    }, []);

    const handleToggleNotificaciones = async (nuevoValor: boolean) => {
        if (nuevoValor) {
            const permisoConcedido = await registrarPermisosNotificaciones();
            if (!permisoConcedido) {
                Alert.alert(
                    'Permiso denegado',
                    'Para recibir alertas de nuevas bolsas, habilita las notificaciones en los ajustes de tu teléfono.'
                );
                setNotificacionesActivas(false);
                await AsyncStorage.setItem('notificaciones_activas', 'false');
                return;
            }

            setNotificacionesActivas(true);
            await AsyncStorage.setItem('notificaciones_activas', 'true');
            iniciarNotificacionesBolsas();
        } else {
            setNotificacionesActivas(false);
            await AsyncStorage.setItem('notificaciones_activas', 'false');
            detenerNotificacionesBolsas();
        }
    };

    const handleLogout = async () => {
        detenerNotificacionesBolsas();
        const { error } = await supabase.auth.signOut();

        if (error) {
            Alert.alert('Error', 'Error al cerrar sesión');
        } else {
            router.replace('/login');
        }
    }

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 50 }}>Cargando perfil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollContent}>
                <View style={styles.headerCard}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={50} color="#FFFFFF" />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.username}</Text>
                            <Text style={styles.userRole}>{user.is_vendedor ? 'Vendedor/a' : 'Rescatista'}</Text>
                            <View style={styles.progressContainer}>
                                <Text style={styles.levelText}>Nivel: {Math.floor(user.exp / 1000)}</Text>
                                <View style={styles.progressBarBackground}>
                                    <View style={[styles.progressBarFill, { width: `${(user.exp % 1000) / 10}%` }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Bolsas Rescatadas</Text>
                        <Text style={styles.statNumber}>{user.bolsas_rescatadas}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Total Ahorrado</Text>
                        <Text style={styles.statNumber}>${user.ahorro.toLocaleString()}</Text>
                    </View>
                </View>

                {user.is_vendedor && (
                    <View style={styles.singleStatRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statTitle}>Bolsas Vendidas</Text>
                            <Text style={styles.statNumber}>{user.bolsas_vendidas || 0}</Text>
                        </View>
                    </View>
                )}

                {/* Interruptor opcional de notificaciones */}
                <View style={styles.optionCard}>
                    <View style={styles.optionLeft}>
                        <Ionicons name="notifications-outline" size={24} color="#00C853" style={{ marginRight: 10 }} />
                        <Text style={styles.optionText}>Notificaciones</Text>
                    </View>
                    <Switch
                        value={notificacionesActivas}
                        onValueChange={handleToggleNotificaciones}
                        trackColor={{ false: '#D1D1D6', true: '#81E6A9' }}
                        thumbColor={notificacionesActivas ? '#00C853' : '#F4F3F4'}
                    />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    <Ionicons name="log-out-outline" size={24} color="#E53935" />
                </TouchableOpacity>
            </ScrollView>
            <BotonNav />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    userRole: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    progressContainer: {
        marginTop: 5,
    },
    levelText: {
        fontSize: 12,
        color: '#333',
        marginBottom: 5,
        textAlign: 'right',
    },
    progressBarBackground: {
        height: 15,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#000',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00C853',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    singleStatRow: {
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 20,
        width: '48%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 10,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00C853',
    },
    optionCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 10,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 12,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E53935',
    }
});

export default perfil