import { Routes } from '@angular/router';
import { PopupComponent } from './popup/popup.component';
import { SidepanelComponent } from './sidepanel/sidepanel.component';

export const appRoutes: Routes = [
  { path: 'popup', component: PopupComponent },
  { path: 'sidepanel', component: SidepanelComponent },
  { path: '', redirectTo: 'popup', pathMatch: 'full' }
];
