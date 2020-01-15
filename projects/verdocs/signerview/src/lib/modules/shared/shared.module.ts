import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomMaterialModule } from '../../custom-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { DirectivesModule } from './directives/directives.modules';
import { TemplateOptionsService } from './components/template-options/template-options.service';
import { EnvelopeInviteComponent } from './dialogs/envelope-invite/envelope-invite.component';
import { LiveViewDialog } from './dialogs/live-view-dialog/live-view.dialog';
import { PreviewLinkDialog } from './dialogs/preview-link/preview-link.dialog';
import { TemplateOptionsComponent } from './components/template-options/template-options.component';
import { TemplateDeleteDialogComponent } from './dialogs/template-delete-dialog/template-delete.dialog';
import { DelegatedStatusDialogComponent } from './dialogs/delegated-dialog/status.dialog';
import { FourOhOneDialog } from './dialogs/error-dialogs/four-oh-one.dialog';
import { EnvelopeField } from '../../fields/envelope-field.component';
import { ProgressLoaderComponent } from './components/loader/loader.component';
import { EventTrackerModule } from '@verdocs/event-tracker';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CustomMaterialModule,
    FlexLayoutModule,
    DirectivesModule,
    EventTrackerModule
  ],
  declarations: [
    EnvelopeInviteComponent,
    LiveViewDialog,
    PreviewLinkDialog,
    TemplateDeleteDialogComponent,
    TemplateOptionsComponent,
    DelegatedStatusDialogComponent,
    EnvelopeField,
    FourOhOneDialog,
    ProgressLoaderComponent
  ],
  entryComponents: [
    EnvelopeInviteComponent,
    LiveViewDialog,
    PreviewLinkDialog,
    TemplateDeleteDialogComponent,
    DelegatedStatusDialogComponent,
    FourOhOneDialog
  ],
  providers: [
    TemplateOptionsService
  ],
  exports: [
    EnvelopeInviteComponent,
    TemplateOptionsComponent,
    EnvelopeField,
    PreviewLinkDialog,
    FourOhOneDialog,
    ProgressLoaderComponent
  ]
})
export class SharedModule { }
