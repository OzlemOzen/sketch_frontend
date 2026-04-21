import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SensorMonitorComponent } from './features/sensors/sensor-monitor/sensor-monitor.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'sensor-monitor',
    component: SensorMonitorComponent
  },
  {
  path: 'sensor-data-analysis',
  loadComponent: () =>
    import('./features/sensors/sensor-data-analysis/sensor-data-analysis.component')
      .then((m) => m.SensorDataAnalysisComponent)
}
];