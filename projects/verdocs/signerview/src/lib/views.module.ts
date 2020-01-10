import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VerdocsRequestInterceptor, VerdocsResponseInterceptor, VerdocsErrorInterceptor } from '@verdocs/tokens';
import { CustomMaterialModule } from '../../custom-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { ViewsRouteModule } from './views-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { RAngularModule } from '../../core/components/header/rangular/rangular.module';
import { DirectivesModule } from '../../shared/directives/directives.modules';
import { FileUploadModule } from 'app/shared/components/file-upload/file-upload.component.module';

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
import { PaymentDialogComponent } from './dialogs/payments/payment.dialog';
import { ErrorDialogComponent } from './dialogs/error-dialog/error-dialog.component';
import { EnvelopeFieldsLiteModule } from '../../shared/components/envelope-fields/envelope-fields-lite.module';
import { EventTrackerModule } from '@verdocs/event-tracker';

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
    PaymentDialogComponent,
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
    PaymentDialogComponent,
    EnvelopeDelegateComponent
  ]
})
export class ViewsModule { }
