import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonButtons,
  AlertController,
  ToastController,
  Platform
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  qrCodeOutline, 
  personCircleOutline, 
  checkmarkCircleOutline, 
  cloudUploadOutline, 
  alertCircleOutline,
  timeOutline,
  syncOutline,
  logOutOutline,
  stopOutline
} from 'ionicons/icons';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AuthService } from '../../services/auth.service';
import { ScanService } from '../../services/scan.service';
import { User } from '../../interfaces/user.interface';
import { ScanRecord } from '../../interfaces/scan.interface';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonButtons
  ]
})
export class ScannerPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isScanning: boolean = false;
  pendingScans: number = 0;
  syncedScans: number = 0;
  recentScans: ScanRecord[] = [];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private platform: Platform,
    private authService: AuthService,
    private scanService: ScanService
  ) {
    addIcons({ 
      qrCodeOutline, 
      personCircleOutline, 
      checkmarkCircleOutline, 
      cloudUploadOutline, 
      alertCircleOutline,
      timeOutline,
      syncOutline,
      logOutOutline,
      stopOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.loadScanData();
    
    setInterval(() => {
      this.loadScanData();
    }, 5000);
  }

  ngOnDestroy() {
    this.stopScanning();
  }

  loadUserData() {
    this.currentUser = this.authService.getCurrentUser();
  }

  loadScanData() {
    this.recentScans = this.scanService.getLocalScans().slice(0, 10);
    this.pendingScans = this.scanService.getPendingScansCount();
    this.syncedScans = this.scanService.getSyncedScansCount();
  }

  async startScan() {
    try {
      // 1. Verifica el estado actual del permiso SIN volver a pedirlo
      const status = await BarcodeScanner.checkPermissions();

      // 2. Si el permiso fue denegado explícitamente, guía al usuario a la configuración
      if (status.camera === 'denied') {
        await this.showPermissionAlert();
        return;
      }

      // 3. Si no tenemos permiso, lo solicitamos
      if (status.camera !== 'granted') {
        const permissionResult = await BarcodeScanner.requestPermissions();
        // Si después de solicitarlo, no nos lo dan, salimos de la función
        if (permissionResult.camera !== 'granted') {
          return;
        }
      }

      // --- Si llegamos aquí, es porque tenemos permiso ---
      document.querySelector('body')?.classList.add('scanner-active');
      this.isScanning = true;

      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      if (result.barcodes.length > 0) {
        await this.processScan(result.barcodes[0].rawValue);
      }

    } catch (error: any) {
      console.error('Error en el escaneo:', error);
      if (!error.message?.includes('cancelled')) {
        await this.showAlert('Error', 'No se pudo iniciar el escáner.');
      }
    } finally {
      this.stopScanning();
    }
  }

  // === AGREGA ESTA NUEVA FUNCIÓN ===
  async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permiso Denegado',
      message: 'Para escanear códigos QR, necesitas activar el permiso de la cámara en la configuración de la aplicación.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Abrir Configuración',
          handler: () => {
            // ✅ El nombre correcto del método es openSettings()
            BarcodeScanner.openSettings();
          },
        },
      ],
    });
    await alert.present();
  }

  stopScanning() {
    // Con ML Kit, la cámara se detiene automáticamente después de `scan()`.
    // Esta función ahora solo limpia la UI y el estado.
    this.isScanning = false;
    document.querySelector('body')?.classList.remove('scanner-active');
  }

  async processScan(qrContent: string) {
    try {
      const siteId = parseInt(qrContent.trim());
      
      if (isNaN(siteId) || siteId <= 0) {
        await this.showAlert('Codigo QR invalido', 'El codigo escaneado no es valido para este sistema');
        return;
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      
      try {
        const position = await Geolocation.getCurrentPosition({
          timeout: 10000,
          enableHighAccuracy: true
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        console.log('No se pudo obtener ubicacion:', error);
      }

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      const fechaLocal = 
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        ` ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const scanRecord: ScanRecord = {
        id_sitio: siteId,
        id_usuario: this.currentUser!.id,
        fecha: fechaLocal, // <-- SE USA LA FECHA LOCAL
        latitud: latitude,
        longitud: longitude,
        syncStatus: 'pending'
      };

      await this.scanService.saveLocalScan(scanRecord);
      
      this.loadScanData();
      
      await this.showSuccessToast(`✅ Sitio ${siteId} registrado correctamente`);
      
      if (this.platform.is('capacitor')) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
      
    } catch (error) {
      console.error('Error procesando escaneo:', error);
      await this.showAlert('Error', 'Error al procesar el codigo QR');
    }
  }

  async viewHistory() {
    this.router.navigate(['/home']);
  }

  async syncNow() {
    const loading = await this.toastController.create({
      message: 'Sincronizando...',
      duration: 2000
    });
    await loading.present();
    
    await this.scanService.syncPendingScans();
    this.loadScanData();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesion',
      message: 'Estas seguro que quieres cerrar sesion?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Si, cerrar sesion',
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }

  getSyncStatusIcon(status: string): string {
    switch (status) {
      case 'synced': return 'checkmark-circle-outline';
      case 'pending': return 'cloud-upload-outline';
      case 'error': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  }

  getSyncStatusColor(status: string): string {
    switch (status) {
      case 'synced': return 'success';
      case 'pending': return 'warning';
      case 'error': return 'danger';
      default: return 'medium';
    }
  }
}