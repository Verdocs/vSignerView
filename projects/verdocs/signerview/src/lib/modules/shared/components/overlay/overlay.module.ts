import { PortalModule } from '@angular/cdk/portal';
import { NgModule } from '@angular/core';
import { Overlay } from './overlay';
import { OverlayPositionBuilder } from './position/overlay-position-builder';

@NgModule({
  imports: [
    PortalModule
  ],
  exports: [],
  declarations: [],
  providers: [
    Overlay,
    OverlayPositionBuilder
  ]
})
export class OverlayModule { }
