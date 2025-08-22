export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'administrador' | 'usuario';
}

export interface LoginResponse {
  token: string;
  user: User;
}