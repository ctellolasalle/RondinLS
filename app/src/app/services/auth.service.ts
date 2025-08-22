import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { User, LoginResponse } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  async loadStoredUser() {
    try {
      const userData = await this.storage.get('currentUser');
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
        email,
        password
      }).toPromise();

      if (!response) {
        throw new Error('No response from server');
      }

      this.currentUser = response.user;
      
      await this.storage.set('authToken', response.token);
      await this.storage.set('currentUser', JSON.stringify(response.user));

      return response.user;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.error?.error || 'Credenciales incorrectas');
    }
  }

  async logout() {
    this.currentUser = null;
    await this.storage.remove('authToken');
    await this.storage.remove('currentUser');
    this.router.navigate(['/login']);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.storage.get('authToken');
    return !!token;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async getToken(): Promise<string | null> {
    return await this.storage.get('authToken');
  }
}