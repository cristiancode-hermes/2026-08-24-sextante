import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

/**
 * Auth routes MUST be declared BEFORE the shell (`path: ''`) whose children
 * end with `path: '**'`.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'cupulas',
        loadComponent: () =>
          import('./pages/instruments-catalogue.page').then((m) => m.InstrumentsCatalogueComponent),
      },
      {
        path: 'cupulas/:id',
        loadComponent: () =>
          import('./pages/instrument-detail.page').then((m) => m.InstrumentDetailComponent),
      },
      {
        path: 'cupulas/:id/resena',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/review-form.page').then((m) => m.ReviewFormComponent),
      },
      {
        path: 'objetos',
        loadComponent: () =>
          import('./pages/objects-catalogue.page').then((m) => m.ObjectsCatalogueComponent),
      },
      {
        path: 'checkout/:slotId',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutComponent),
      },
      {
        path: 'reservas/:id/confirmacion',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/confirmation.page').then((m) => m.ConfirmationComponent),
      },
      {
        path: 'mis-noches',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/my-bookings.page').then((m) => m.MyBookingsComponent),
      },
      {
        path: 'mis-noches/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/booking-detail.page').then((m) => m.BookingDetailComponent),
      },
      {
        path: 'cuenta',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/account.page').then((m) => m.AccountComponent),
      },
      {
        path: 'staff',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/staff-dashboard.page').then((m) => m.StaffDashboardComponent),
      },
      {
        path: 'staff/cupulas',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/instrument-admin.page').then((m) => m.InstrumentAdminComponent),
      },
      {
        path: 'staff/franjas',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/slot-admin.page').then((m) => m.SlotAdminComponent),
      },
      {
        path: 'staff/cielo',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/sky-admin.page').then((m) => m.SkyAdminComponent),
      },
      {
        path: 'staff/objetos',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () =>
          import('./pages/object-admin.page').then((m) => m.ObjectAdminComponent),
      },
      {
        path: 'staff/check-in',
        canActivate: [authGuard, roleGuard(['staff', 'admin'])],
        loadComponent: () => import('./pages/check-in.page').then((m) => m.CheckInComponent),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
