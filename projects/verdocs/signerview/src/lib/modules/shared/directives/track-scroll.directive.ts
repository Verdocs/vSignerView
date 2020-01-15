import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[track-scroll]'
})

export class TrackScrollDirective {
  @Output('track-scroll') track = new EventEmitter;
  @HostListener('window:scroll', ['$event']) onScroll() {
    this.handleScroll(event);
  }
  @HostListener('window:mousewheel', ['$event']) onScrollChrome() {
    this.handleScroll(event);
  }
  @HostListener('DOMMouseScroll', ['$event']) onScrollFirefox(event: any) {
    this.handleScroll(event);
  }

  @HostListener('onmousewheel', ['$event']) onScrollIE(event: any) {
    this.handleScroll(event);
  }

  handleScroll(event) {
    this.track.emit(event);
  }
}
