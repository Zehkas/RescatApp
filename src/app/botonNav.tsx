import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [userRole, setUserRole] = useState<'vendedor' | 'rescatista' | null>(null);

  useEffect(() => {
    // Extraer rol de la base de datos
    setUserRole('vendedor'); 
  }, []);

  const isPublicarActive = pathname === '/publicaciones' || pathname === '/pubActivas';
  const isPerfilActive = pathname === '/perfil';

  const ACTIVE_COLOR = '#00C853';
  const INACTIVE_COLOR = '#555555';

  if (!userRole) return null;

  return (
    <View style={styles.navContainer}>
      
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={() => router.replace('/mapscreen')}
      >
        <MaterialCommunityIcons 
          name="map-outline" 
          size={32}
          color={INACTIVE_COLOR} 
        />
        <Text style={styles.navText}>
          Mapa
        </Text>
      </TouchableOpacity>

      {userRole === 'vendedor' && <View style={styles.divider} />}
      {userRole === 'vendedor' && (
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => router.replace('/publicaciones')}
        >
          <View style={[
            styles.circle, 
            { backgroundColor: isPublicarActive ? ACTIVE_COLOR : '#555555' }
          ]}>
            <Ionicons name="add" size={30} color="#FFF" />
          </View>
          <Text style={[styles.navText, isPublicarActive && styles.activeText]}>
            Publicar
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />

      <TouchableOpacity 
        style={styles.navButton} 
        onPress={() => router.replace('/perfil')}
      >
        <Ionicons 
          name="person-outline" 
          size={userRole === 'rescatista' && isPerfilActive ? 32 : 28} // Ligeramente más grande si es rescatista y está activo
          color={isPerfilActive ? ACTIVE_COLOR : INACTIVE_COLOR} 
        />
        <Text style={[styles.navText, isPerfilActive && styles.activeText]}>
          Perfil
        </Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 80,
    borderRadius: 40,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 14,
    color: '#555555',
    marginTop: 4,
  },
  activeText: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#D3D3D3',
  }
});