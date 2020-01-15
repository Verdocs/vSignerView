import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SharedModule } from '../shared/shared.module';
import { ProfilesModule } from '@verdocs/profiles';
import { NotificationsModule } from '@verdocs/notifications';
import { CustomMaterialModule } from '../../custom-material.module';

import { RealsterComponent } from './rangular.component';

@NgModule({
  declarations: [
    RealsterComponent
  ],
  imports: [
    CommonModule,
    CustomMaterialModule,
    FlexLayoutModule,
    SharedModule,
    NotificationsModule,
    ProfilesModule
  ],
  exports: [
    RealsterComponent
  ]
})
export class RAngularModule { }
