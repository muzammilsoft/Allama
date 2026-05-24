import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  colors: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemScheme || 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await AsyncStorage.getItem('app_theme');
    if (savedTheme) {
      setTheme(savedTheme as Theme);
    } else {
      setTheme(systemScheme || 'light');
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#ffffff',
    surface: isDark ? '#1e1e1e' : '#f9f9f9',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#aaaaaa' : '#666666',
    border: isDark ? '#333333' : '#eeeeee',
    primary: isDark ? '#ffffff' : '#000000',
    primaryContrast: isDark ? '#000000' : '#ffffff',
    error: '#FF3B30',
    success: '#34C759',
    bubbleUser: isDark ? '#2c2c2e' : '#f0f0f0',
    bubbleAssistant: isDark ? '#1c1c1e' : '#ffffff',
    inputBg: isDark ? '#2c2c2e' : '#f0f0f0',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
