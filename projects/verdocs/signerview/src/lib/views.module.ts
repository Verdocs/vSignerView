import { NgModule, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VerdocsRequestInterceptor, VerdocsResponseInterceptor, VerdocsErrorInterceptor } from '@verdocs/tokens';
import { CustomMaterialModule } from './custom-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ViewsRouteModule } from './views-routing.module';
import { SharedModule } from './modules/shared/shared.module';
import { RAngularModule } from './modules/rangular/rangular.module';
import { DirectivesModule } from './modules/shared/directives/directives.modules';
import { FileUploadModule } from './modules/shared/components/file-upload/file-upload.component.module';

import { PdfViewerModule } from '@verdocs/pdf-viewer';

import { ViewsComponent } from './views.component';
import { LiveViewComponent } from './live/live-view.component'
import { ClaimDialogComponent } from './dialogs/claim/envelope-profile-claim.dialog';
import { SwitchProfileDialogComponent } from './dialogs/switchProfile/envelope-switch-profile.dialog';
import { PrepareInviteDialog } from './dialogs/prepare/prepare-view.dialog';
import { EnvelopeSignerHeaderComponent } from './signer-header/envelope-signer-header.component';
import { EnvelopeTokenComponent } from './signer/envelope-token.component';
import { EnvelopeViewComponent } from './signer/envelope-view.component';
import { EnvelopeDelegateComponent } from './dialogs/delegate/envelope-delegate.component';
import { DeclineEnvelopeDialogComponent } from './dialogs/decline/envelope-decline.dialog';
import { EnvelopeSignatureDialogComponent } from './dialogs/signature/envelope-signature.dialog';
import { AttachmentsComponent } from './dialogs/attachments/attachments.component';
import { AttachmentsDialogComponent } from './dialogs/attachments/attachments.dialog';
import { PaymentDialog } from './dialogs/payments/payment.dialog';
import { ErrorDialogComponent } from './dialogs/error-dialog/error-dialog.component';
import { EnvelopeFieldsLiteModule } from './modules/shared/components/envelope-fields/envelope-fields-lite.module';
import { EventTrackerModule } from '@verdocs/event-tracker';

export interface IPlans {
  'level-1': string;
  'level-2': string;
  'level-3': string;
}
export interface IViewConfig {
  type: 'webComponent' | 'ngComponent';
  rForm_backend_url: string;
  rForm_frontend_url: string;
  rAccount_frontend_url: string;
  rAccount_backend_url: string;
  rSecure_frontend_url: string;
  rSecure_backend_url: string;
  rPayment_backend_url: string;
  rNotification_backend_url: string;
  stripe_publishable_key: string;
  rForm_cookie_name: string;
  plans: IPlans
}

export const viewConfiguration = new InjectionToken<IViewConfig>('IViewConfig')

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HttpClientModule,
    HttpClientXsrfModule,
    ReactiveFormsModule,
    CustomMaterialModule,
    FlexLayoutModule,
    PdfViewerModule,
    EnvelopeFieldsLiteModule,
    ViewsRouteModule,
    SharedModule,
    RAngularModule,
    DirectivesModule,
    FileUploadModule,
    EventTrackerModule
  ],
  declarations: [
    EnvelopeViewComponent,
    EnvelopeDelegateComponent,
    EnvelopeTokenComponent,
    EnvelopeSignerHeaderComponent,
    ClaimDialogComponent,
    SwitchProfileDialogComponent,
    ViewsComponent,
    LiveViewComponent,
    AttachmentsComponent,
    PrepareInviteDialog,
    DeclineEnvelopeDialogComponent,
    EnvelopeSignatureDialogComponent,
    AttachmentsDialogComponent,
    PaymentDialog,
    ErrorDialogComponent
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: VerdocsRequestInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: VerdocsResponseInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: VerdocsErrorInterceptor,
      multi: true
    }
  ],
  exports: [
    EnvelopeSignerHeaderComponent,
    LiveViewComponent,
  ],
  entryComponents: [
    ClaimDialogComponent,
    SwitchProfileDialogComponent,
    PrepareInviteDialog,
    DeclineEnvelopeDialogComponent,
    EnvelopeSignatureDialogComponent,
    AttachmentsDialogComponent,
    PaymentDialog,
    EnvelopeDelegateComponent
  ]
})
export class ViewsModule {
  static initViewModule(config: IViewConfig) {
    return {
      ngModule: ViewsModule,
      providers: [
        {
          provide: viewConfiguration,
          useValue: config
        }
      ]
    };
  };
}
