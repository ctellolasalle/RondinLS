// ====== src/app/guards/login.guard.ts ======
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const isAuthenticated = await this.authService.isAuthenticated();
    
    // Si el usuario YA está autenticado...
    if (isAuthenticated) {
      // ...lo redirigimos a la página principal (el escáner) y bloqueamos el acceso al login.
      this.router.navigate(['/scanner']);
      return false;
    }
    
    // Si el usuario NO está autenticado, le permitimos ver la página de login.
    return true;
  }
}