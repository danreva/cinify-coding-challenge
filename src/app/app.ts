import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './features/layout/sidebar/sidebar';

/**
 * Application shell: persistent sidebar + routed content area. All dashboard
 * logic lives in the lazily-loaded `DashboardPage` route.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
