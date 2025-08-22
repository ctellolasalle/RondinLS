import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lasalle.rondin',
  appName: 'Control de Rondas',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BarcodeScanner: {
      androidScanningLibrary: "zxing"
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#667eea",
      showSpinner: false
    }
  }
};