import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="add-review" 
          options={{ 
            title: 'Add Review',
            presentation: 'modal',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="edit-review" 
          options={{ 
            title: 'Edit Review',
            presentation: 'modal',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="restaurant-reviews" 
          options={{ 
            title: 'Restaurant Reviews',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="my-reviews" 
          options={{ 
            title: 'My Reviews',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}