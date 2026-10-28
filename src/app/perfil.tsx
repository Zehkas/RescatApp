import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import BotonNav from './botonNav'

type Usuario = {
    id: string,
    nombre: string,
    usuario: string, //Varia entre vendedor y rescatista
    exp: number, //Transformar en nivel y progreso
    bolsasResc: number,
    totalAhorro: number,
    bolsasVend?: number //Solo si es vendedor
}

const perfil = () => {
    const router = useRouter()
    const [user, setUser] = useState<Usuario | null>(null)

    useEffect(() => {
        //Funcion pa sacar los datos del supabase

        //Datos fake
        const datosFake: Usuario = {
            id: '1',
            nombre: 'Vicente',
            usuario: 'vendedor',
            exp: 3630,
            bolsasResc: 15,
            totalAhorro: 45000
        }
        setUser(datosFake)
    }, [])

    const handleLogout = () => {
        //Cierra sesion de cuenta y redirige a login
        console.log('Cerrando sesión...');
        router.replace('/login')
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
                            <Text style={styles.userName}>{user.nombre}</Text>
                            <Text style={styles.userRole}>{user.usuario === 'vendedor' ? 'Vendedor/a' : 'Rescatista'}</Text>
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
                        <Text style={styles.statNumber}>{user.bolsasResc}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Total Ahorrado</Text>
                        <Text style={styles.statNumber}>${user.totalAhorro.toLocaleString()}</Text>
                    </View>
                </View>

                {user.usuario === 'vendedor' && (
                    <View style={styles.singleStatRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statTitle}>Bolsas Vendidas</Text>
                            <Text style={styles.statNumber}>{user.bolsasVend || 0}</Text>
                        </View>
                    </View>
                )}

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
        paddingBottom: 120, // Espacio extra para que el BottomNav no tape el contenido
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
        backgroundColor: '#000', // Avatar negro del diseño
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
        borderColor: '#000', // Borde negro estilo pixel art
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00C853', // Verde del diseño
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    singleStatRow: {
        alignItems: 'flex-start', // Alinea a la izquierda para replicar el diseño original
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 20,
        width: '48%', // Para que quepan dos en la misma fila
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
        color: '#00C853', // Verde destacado
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
        marginTop: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E53935', // Rojo
    }
});

export default perfil