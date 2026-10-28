import { Ionicons } from '@expo/vector-icons'
import Checkbox from 'expo-checkbox'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../utils/supabase'

const login = () => {

  const router = useRouter()
  const [login, setLogin] = useState(true)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isVendedor, setIsVendedor] = useState(false)

  const handleLogin = async () => {
    if (login) {
      // Lógica de inicio de sesión
      console.log('Iniciando sesión con:', { email, password });
      router.replace('/mapscreen')
    } else {
      // Lógica de registro
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }
      try {
        const { data: existingUser, error: searchError } = await supabase
          .from('usuario')
          .select('email')
          .eq('email', email)

        if (searchError) throw searchError;
        if (existingUser && existingUser.length > 0) {
          Alert.alert('Error', 'El correo ya está registrado');
          return;
        }

        const { error: insertError } = await supabase
          .from('usuario')
          .insert([
            {
              username: username,
              email: email,
              password: password, //hashear?
              isVendedor: isVendedor,
              exp: 0,
              bolsasRescatadas: 0,
              ahorro: 0,
              bolsasVendidas: isVendedor ? 0 : null
            }
          ]);
        if (insertError) throw insertError;
        Alert.alert('Éxito', 'Usuario registrado correctamente');
        setLogin(true);
      } catch (error) { Alert.alert('Error', 'Hubo un problema al registrar el usuario'); }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <View style={styles.logoPlaceholder}>
              <Ionicons name="basket" size={40} color="#FF7043" />
            </View>
            <Text style={styles.appName}>RescatApp</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{login ? 'Iniciar Sesión' : 'Crea tu Cuenta'}</Text>
            {!login && (
              <View style={styles.inputRow}>
                <Ionicons name="person" size={24} color="#757575" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername} />
              </View>
            )}
            <View style={styles.inputRow}>
              <Ionicons name="mail" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Correo"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail} />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed" size={24} color="#757575" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword} />
            </View>

            {!login && (
              <>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed" size={24} color="#757575" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar Contraseña"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword} />
                </View>

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    style={styles.checkbox}
                    value={isVendedor}
                    onValueChange={setIsVendedor}
                    color={isVendedor ? '#00C853' : undefined}
                  />
                  <Text style={styles.checkboxLabel}>¿Eres un Vendedor?</Text>
                </View>
              </>

            )}

            <TouchableOpacity style={styles.mainButton} onPress={handleLogin}>
              <Text style={styles.mainButtonText}>{login ? 'Iniciar Sesión' : 'Registrarse'}</Text>
            </TouchableOpacity>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>{login ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</Text>
              <TouchableOpacity onPress={() => setLogin(!login)}>
                <Text style={styles.toggleLink}>{login ? ' Regístrate' : ' Inicia Sesión'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fondo blanco total de las imágenes
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
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFE0B2', // Color similar a la bolsa de papel
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
    marginBottom: 30,
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
    backgroundColor: '#E0E0E0', // Gris claro del diseño
    padding: 15,
    borderRadius: 25, // Bordes muy redondeados
    fontSize: 16,
  },
  mainButton: {
    backgroundColor: '#00C853', // Verde intenso
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
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
    color: '#0056b3', // Azul del enlace
    textDecorationLine: 'underline',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 43, // Para alinearlo con los campos de texto esquivando el espacio del ícono
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
});

export default login