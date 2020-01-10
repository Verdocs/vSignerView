import { NgModule } from '@angular/core';
import { Routes, RouterModule, CanActivate } from '@angular/router';

import { AuthGuardService } from '../../core/services/auth-guard.service'

import { ViewsComponent } from './views.component';
import { LiveViewComponent } from './live/live-view.component';
import { EnvelopeTokenComponent } from './signer/envelope-token.component';
import { EnvelopeViewComponent } from './signer/envelope-view.component';
import { FourHundredComponent } from '../../shared/components/error-pages/400.component';

const routes: Routes = [
  {
    path: '',
    component: ViewsComponent,
    data: { lazyTitle: true },
    children: [
      {
        path: 'live',
        children: [
          {
            path: ':templateId/token/:token',
            component: LiveViewComponent,
            data: { noHeader: true }
          }
        ]
      },
      {
        path: 'prepare'
      },
      {
        path: 'sign',
        children: [
          {
            path: ':id/roleName/:roleName/invitation/:invite',
            component: EnvelopeTokenComponent,
            data: { noHeader: true, openSidenav: false, }
          },
          {
            path: ':id/role/:roleName',
            canActivate: [AuthGuardService],
            component: EnvelopeViewComponent,
            data: { noHeader: true, openSidenav: false }
          },
          {
            path: ':id/role/:roleName/:status',
            loadChildren: '../../modules/envelope-detail/envelope-detail.module#EnvelopeDetailModule',
            data: { noHeader: false, openSidenav: false }
          },
          {
            path: ':id/role/:roleName/:status/400',
            component: FourHundredComponent,
          }
        ]
      }
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewsRouteModule { }
