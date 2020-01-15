import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { OverlayModule } from '../overlay';
import { DirectivesModule } from 'app/shared/directives/directives.modules';
import { CreateEnvelopeService } from './create-envelope';
import { CreateEnvelopeContainer } from './create-envelope-container';
import { FixedDialogClose, FixedDialogExpand, FixedDialogCollapse } from './fixed-dialog-directive';
import { EventTrackerModule } from '@verdocs/event-tracker';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    OverlayModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatMenuModule,
    PortalModule,
    DirectivesModule,
    EventTrackerModule
  ],
  exports: [
    CreateEnvelopeContainer,
    FixedDialogClose,
    FixedDialogExpand,
    FixedDialogCollapse
  ],
  declarations: [
    CreateEnvelopeContainer,
    FixedDialogClose,
    FixedDialogExpand,
    FixedDialogCollapse
  ],
  providers: [
    CreateEnvelopeService
  ],
  entryComponents: [
    CreateEnvelopeContainer
  ]
})
export class FixedDialogModule {}
