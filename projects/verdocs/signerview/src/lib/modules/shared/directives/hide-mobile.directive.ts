import { Directive, AfterContentInit, Input, ElementRef } from '@angular/core';
import { Platform } from '@angular/cdk/platform'

@Directive({
  selector: 'button[hide-mobile], [hide-mobile]'
})
export class HideMobile implements AfterContentInit {

  @Input('hide-mobile') hideMobile: any;

  constructor(
    private _elementRef: ElementRef<HTMLElement>,
    private _platform: Platform
  ) { }

  ngAfterContentInit() {
    if (this._platform.IOS || this._platform.ANDROID) {
      this._elementRef.nativeElement.style.display = 'none';
    }
  }
}
