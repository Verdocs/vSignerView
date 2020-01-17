import { NgModule } from '@angular/core';import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomMaterialModule } from '../../../custom-material.module';

import { SubscriptionGuardDirective } from './subscription-guard.directive';
import { HideMobile } from './hide-mobile.directive';
import { TrackScrollDirective } from './track-scroll.directive';
import { InViewDirective } from './in-view.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CustomMaterialModule
  ],
  declarations: [
    SubscriptionGuardDirective,
    HideMobile,
    TrackScrollDirective,
    InViewDirective
  ],
  exports: [
    SubscriptionGuardDirective,
    HideMobile,
    TrackScrollDirective,
    InViewDirective
  ]
})
export class DirectivesModule {}
