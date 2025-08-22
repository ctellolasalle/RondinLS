import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private platform: Platform) {}

  async ngOnInit() {
    await this.platform.ready();
    await this.initializeApp();
  }

  async initializeApp() {
    try {
      if (this.platform.is('capacitor')) {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#667eea' });
        await SplashScreen.hide();
      }
      console.log('✅ App inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando app:', error);
    }
  }
}