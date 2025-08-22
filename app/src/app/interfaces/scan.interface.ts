export interface ScanRecord {
  id?: number;
  id_sitio: number;
  id_usuario: number;
  fecha: string;
  latitud?: number;
  longitud?: number;
  syncStatus: 'pending' | 'synced' | 'error';
  sitio_nombre?: string;
  usuario_nombre?: string;
}

export interface Site {
  id: number;
  lugar: string;
  qr_data?: string;
}