import { Slot } from 'expo-router'
import { View } from 'react-native'

const RootLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      <Slot/>
    </View>
  )
}

export default RootLayout