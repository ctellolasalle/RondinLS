import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { Network } from '@capacitor/network';
import { ScanRecord, Site } from '../interfaces/scan.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScanService {
  private apiUrl = environment.apiUrl;
  private localScans: ScanRecord[] = [];

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private auth: AuthService
  ) {
    this.loadLocalScans();
    this.initNetworkListener();
  }

  async loadLocalScans() {
    try {
      const scansData = await this.storage.get('localScans');
      this.localScans = scansData ? JSON.parse(scansData) : [];
    } catch (error) {
      console.error('Error loading local scans:', error);
      this.localScans = [];
    }
  }

  async saveLocalScan(scan: ScanRecord) {
    scan.syncStatus = 'pending';
    this.localScans.unshift(scan);
    
    this.localScans = this.localScans.slice(0, 50);
    
    await this.storage.set('localScans', JSON.stringify(this.localScans));
    
    await this.syncPendingScans();
  }

  async syncPendingScans() {
    const status = await Network.getStatus();
    if (!status.connected) return;

    const pendingScans = this.localScans.filter(scan => scan.syncStatus === 'pending');
    const token = await this.auth.getToken();
    
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    for (const scan of pendingScans) {
      try {
        await this.http.post(`${this.apiUrl}/scans`, {
          id_sitio: scan.id_sitio,
          id_usuario: scan.id_usuario,
          fecha: scan.fecha,
          latitud: scan.latitud,
          longitud: scan.longitud
        }, { headers }).toPromise();
        
        scan.syncStatus = 'synced';
      } catch (error) {
        console.error('Error sincronizando scan:', error);
        scan.syncStatus = 'error';
      }
    }

    await this.storage.set('localScans', JSON.stringify(this.localScans));
  }

  async initNetworkListener() {
    Network.addListener('networkStatusChange', async (status) => {
      if (status.connected) {
        console.log('🌐 Conexion restaurada, sincronizando...');
        await this.syncPendingScans();
      }
    });
  }

  getLocalScans(): ScanRecord[] {
    return this.localScans;
  }

  getPendingScansCount(): number {
    return this.localScans.filter(scan => scan.syncStatus === 'pending').length;
  }

  getSyncedScansCount(): number {
    return this.localScans.filter(scan => scan.syncStatus === 'synced').length;
  }

  async getSites(): Promise<Site[]> {
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    try {
      const response = await this.http.get<Site[]>(`${this.apiUrl}/sites`, { headers }).toPromise();
      return response || [];
    } catch (error) {
      console.error('Error getting sites:', error);
      return [];
    }
  }
}