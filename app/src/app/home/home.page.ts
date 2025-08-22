import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  ActionSheetController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
  cloudUploadOutline,
  alertCircleOutline,
  documentTextOutline,
  syncOutline,
  downloadOutline
} from 'ionicons/icons';
import { ScanService } from '../services/scan.service';
import { ScanRecord } from '../interfaces/scan.interface';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonSegment,
    IonSegmentButton,
    IonSearchbar
  ]
})
export class HomePage implements OnInit {
  allScans: ScanRecord[] = [];
  filteredScans: ScanRecord[] = [];
  filterType: string = 'all';
  searchTerm: string = '';

  constructor(
    private router: Router,
    private scanService: ScanService,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {
    addIcons({ 
      arrowBackOutline,
      ellipsisVerticalOutline,
      checkmarkCircleOutline,
      cloudUploadOutline,
      alertCircleOutline,
      documentTextOutline,
      syncOutline,
      downloadOutline
    });
  }

  ngOnInit() {
    this.loadScans();
  }

  loadScans() {
    this.allScans = this.scanService.getLocalScans();
    this.applyFilter();
  }

  applyFilter() {
    let filtered = [...this.allScans];

    // Filtrar por tipo
    switch (this.filterType) {
      case 'synced':
        filtered = filtered.filter(scan => scan.syncStatus === 'synced');
        break;
      case 'pending':
        filtered = filtered.filter(scan => scan.syncStatus === 'pending');
        break;
      case 'error':
        filtered = filtered.filter(scan => scan.syncStatus === 'error');
        break;
    }

    // Filtrar por busqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(scan => 
        scan.id_sitio.toString().includes(term) ||
        scan.sitio_nombre?.toLowerCase().includes(term) ||
        new Date(scan.fecha).toLocaleDateString().includes(term)
      );
    }

    this.filteredScans = filtered;
  }

  onFilterChange() {
    this.applyFilter();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value || '';
    this.applyFilter();
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Acciones',
      buttons: [
        {
          text: 'Sincronizar Pendientes',
          icon: 'sync-outline',
          handler: () => {
            this.syncPending();
          }
        },
        {
          text: 'Exportar Datos',
          icon: 'download-outline',
          handler: () => {
            this.exportData();
          }
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async syncPending() {
    const toast = await this.toastController.create({
      message: 'Sincronizando registros...',
      duration: 2000
    });
    await toast.present();
    
    await this.scanService.syncPendingScans();
    this.loadScans();
  }

  async exportData() {
    const dataStr = JSON.stringify(this.filteredScans, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `escaneos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    const toast = await this.toastController.create({
      message: 'Datos exportados correctamente',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/scanner']);
  }

  getSyncStatusText(status: string): string {
    switch (status) {
      case 'synced': return 'Sincronizado';
      case 'pending': return 'Pendiente';
      case 'error': return 'Error';
      default: return 'Desconocido';
    }
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
  
  trackByScan(index: number, scan: ScanRecord): string {
    return scan.fecha;
  }
}