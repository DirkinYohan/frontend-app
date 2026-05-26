import { Routes } from '@angular/router';

import { guestGuard, authGuard, roleGuard } from './core/guards';
import { HomeRedirect } from './home-redirect/home-redirect';
import { Login } from './login/login';
import { Register } from './register/register';
import { Admin } from './admin/admin';
import { AdminOperadores } from './admin/operadores/operadores';
import { Operador } from './operador/operador';
import { AdminProductos } from './admin/productos/productos';
import { AdminCategorias } from './admin/categorias/categorias';
import { OperadorVentas } from './operador/ventas/ventas';
import { AdminVentas } from './admin/ventas/ventas';
import { AdminReportes } from './admin/reportes/reportes';
import { OperadorPerfil } from './operador/perfil/perfil';
import { OperadorProductos } from './operador/productos/productos';
import { OperadorHistorial } from './operador/historial/historial';
import { OperadorVentaDetalle } from './operador/venta-detalle/venta-detalle';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeRedirect },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },

  { path: 'admin', component: Admin, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },
  { path: 'admin/operadores', component: AdminOperadores, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },
  { path: 'admin/productos', component: AdminProductos, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },
  { path: 'admin/categorias', component: AdminCategorias, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },
  { path: 'admin/ventas', component: AdminVentas, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },
  { path: 'admin/reportes', component: AdminReportes, canActivate: [authGuard, roleGuard('ADMINISTRADOR')] },

  { path: 'operador', component: Operador, canActivate: [authGuard, roleGuard('OPERADOR')] },
  { path: 'operador/ventas', component: OperadorVentas, canActivate: [authGuard, roleGuard('OPERADOR')] },
  { path: 'operador/perfil', component: OperadorPerfil, canActivate: [authGuard, roleGuard('OPERADOR')] },
  { path: 'operador/productos', component: OperadorProductos, canActivate: [authGuard, roleGuard('OPERADOR')] },
  { path: 'operador/historial', component: OperadorHistorial, canActivate: [authGuard, roleGuard('OPERADOR')] },
  { path: 'operador/historial/:id', component: OperadorVentaDetalle, canActivate: [authGuard, roleGuard('OPERADOR')] },

  { path: '**', redirectTo: '' }
];
