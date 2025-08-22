// ====== src/app/app.routes.ts (MODIFICADO) ======
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard'; // <-- 1. IMPORTA EL NUEVO GUARD

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard] // Protegido por AuthGuard
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [LoginGuard] // <-- 2. APLICA EL NUEVO GUARD AQUÍ
  },
  {
    path: 'scanner',
    loadComponent: () => import('./pages/scanner/scanner.page').then(m => m.ScannerPage),
    canActivate: [AuthGuard] // Protegido por AuthGuard
  }
];