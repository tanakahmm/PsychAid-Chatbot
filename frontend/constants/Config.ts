import { Platform } from 'react-native';

interface EnvironmentConfig {
  apiUrl: string;
  timeout: number;
}

interface ConfigType {
  development: EnvironmentConfig;
  production: EnvironmentConfig;
}

const getLocalIpAddress = (): string => {
  // For physical iOS device or Android device
  if (!__DEV__) {
    return 'https://your-production-api.com';
  }
  
  // For iOS simulator
  if (Platform.OS === 'ios') {
    return 'http://192.168.0.169:8000';
  }
  
  // For Android emulator
  if (Platform.OS === 'android') {
    return 'http://192.168.0.169:8000';
  }
  
  return 'http://192.168.0.169:8000';
};

const Config: ConfigType = {
  development: {
    apiUrl: getLocalIpAddress(),
    timeout: 60000, // 60 seconds
  },
  production: {
    apiUrl: 'https://your-production-api.com', // Replace with your production API URL
    timeout: 30000, // 30 seconds
  },
};

export const getEnvironment = (): EnvironmentConfig => {
  const isDevelopment = __DEV__;
  const config = isDevelopment ? Config.development : Config.production;
  
  // Log configuration for debugging
  console.log('Environment:', isDevelopment ? 'development' : 'production');
  console.log('API URL:', config.apiUrl);
  console.log('Platform:', Platform.OS);
  console.log('Timeout:', config.timeout);
  
  return config;
};

export default Config; 