import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon,
  IonText,
  AlertController, 
  LoadingController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, logInOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService
  ) {
    addIcons({ mailOutline, lockClosedOutline, logInOutline, shieldCheckmarkOutline });
  }

  async login() {
    if (!this.email || !this.password) {
      await this.showAlert('Error', 'Por favor completa todos los campos');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesion...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const user = await this.authService.login(this.email, this.password);
      await loading.dismiss();
      
      console.log('✅ Login exitoso:', user.nombre);
      this.router.navigate(['/scanner'], { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      await this.showAlert('Error', error.message || 'Credenciales incorrectas');
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}