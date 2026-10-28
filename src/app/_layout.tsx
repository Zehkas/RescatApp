import CartContextProvider from '@/store/coffeeContext'
import { Slot } from 'expo-router'
import { View } from 'react-native'

const RootLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      <CartContextProvider>
        <Slot />
      </CartContextProvider>
    </View>
  )
}

export default RootLayout