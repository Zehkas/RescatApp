import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Título de la aplicación */}
        <Text style={styles.title}>Rescatapp</Text>
        
        {/* Eslogan basado en la problemática del proyecto */}
        <Text style={styles.slogan}>
          Rescates Locales, Grandes Ahorros
        </Text>
        
        {/* Botón de navegación */}
        <TouchableOpacity 
          style={styles.button}
          // Usamos replace o push dependiendo de si quieres que puedan volver a esta pantalla
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Ir al login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00C853', // Verde principal utilizado en el diseño
    marginBottom: 10,
    textAlign: 'center',
  },
  slogan: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#00C853',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30, // Bordes redondeados consistentes con los mockups
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});