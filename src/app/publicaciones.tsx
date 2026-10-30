import { supabase } from '@/utils/supabase'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import BotonNav from './botonNav'

const publicaciones = () => {

  const router = useRouter()
  const [activeTab, setActiveTab] = useState('crear')

  const [nombrePub, setNombrePub] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('');
  const [precioNormal, setPrecioNormal] = useState('')
  const [precioRescate, setPrecioRescate] = useState('')
  const [horaRetiro, setHoraRetiro] = useState('')
  const [stock, setStock] = useState('1')

  const handleCrearPublicacion = async () => {

    if (!nombrePub || !precioNormal || !precioRescate || !horaRetiro || !stock) {
      Alert.alert('Error', 'Por favor llena los campos obligatorios');
      return;
    }

    try {
      const { data : { user }, error: authError} = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Error', 'Debes iniciar sesión para publicar');
        return;
      }

      const { data: userData, error: userError} = await supabase
        .from('usuarios')
        .select('id_comercio')
        .eq('id_usuario', user.id)
        .single();


      if (userError || !userData?.id_comercio) {
        Alert.alert('Falta información', 'Tu cuenta no está vinculada a ningún comercio.');
        return;
      }


      const { error: insertError } = await supabase
        .from('bolsas')
        .insert([
          {
            id_comercio: userData.id_comercio,
            nombre: nombrePub,
            categoria: categoria || 'General',
            descripcion: descripcion,
            precio_normal: parseFloat(precioNormal),
            precio_rescate: parseFloat(precioRescate),
            hora_retiro: horaRetiro,
            stock: parseInt(stock),
            estado: 'disponible' 
          }
        ]);

      if (insertError) throw insertError;

      Alert.alert('Éxito', 'Publicación creada correctamente');

      // Limpiar formulario
      setNombrePub('');
      setCategoria('');
      setDescripcion('');
      setPrecioNormal('');
      setPrecioRescate('');
      setHoraRetiro('');
      setStock('1');
      
      router.replace('/pubActivas');

    } catch (error) {
      console.error('Error al crear publicación:', error);
      Alert.alert('Error', 'Hubo un problema al crear la publicación');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Crear Publicación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => router.replace('/pubActivas')}>
          <Text style={styles.tabText}>Ver Publicaciones</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Crea Tu Publicación</Text>
          <TextInput
            style={styles.inputFull}
            placeholder="Nombre del Producto"
            value={nombrePub}
            onChangeText={setNombrePub} />

          <TextInput
            style={styles.inputFull}
            placeholder="Categoría (Ej: Panadería)"
            value={categoria}
            onChangeText={setCategoria} />

          <TextInput
            style={[styles.inputFull, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Descripción detallada"
            multiline
            value={descripcion}
            onChangeText={setDescripcion} />

          <View style={styles.rowWrapper}>
            <TextInput
              style={styles.inputHalf}
              placeholder="Precio Normal"
              keyboardType="numeric"
              value={precioNormal}
              onChangeText={setPrecioNormal} />
            <TextInput
              style={styles.inputHalf}
              placeholder="Precio Rescate"
              keyboardType="numeric"
              value={precioRescate}
              onChangeText={setPrecioRescate} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Cantidad / Stock:</Text>
            <TextInput
              style={[styles.inputHalf, { flex: 1, marginLeft: 10 }]}
              placeholder="Ej: 3"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Hora de Retiro:</Text>
            <TextInput
              style={[styles.inputHalf, { flex: 1, marginLeft: 10 }]}
              placeholder="HH:MM"
              value={horaRetiro}
              onChangeText={setHoraRetiro} />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleCrearPublicacion}>
            <Text style={styles.submitButtonText}>Publicar</Text>
          </TouchableOpacity>
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
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputFull: {
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rowWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputHalf: {
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
    padding: 12,
    width: '48%',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#00C853',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default publicaciones