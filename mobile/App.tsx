import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { I18nManager } from 'react-native';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AgentStudioScreen from './src/screens/AgentStudioScreen';
import AboutScreen from './src/screens/AboutScreen';
import GuideScreen from './src/screens/GuideScreen';
import ModelManagerScreen from './src/screens/ModelManagerScreen';
import LocalChatScreen from './src/screens/LocalChatScreen';
import { initDatabase } from './src/database/db';
import ErrorBoundary from './src/utils/ErrorBoundary';
import { ThemeProvider } from './src/utils/ThemeContext';
const Stack = createStackNavigator();
I18nManager.forceRTL(true); I18nManager.allowRTL(true);
const App = () => {
  useEffect(() => { initDatabase().catch(err => console.error("DB Init Error:", err)); }, []);
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Chat" screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AgentStudio" component={AgentStudioScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
            <Stack.Screen name="ModelManager" component={ModelManagerScreen} />
            <Stack.Screen name="LocalChat" component={LocalChatScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
export default App;
