import { Directive, Output, Input, OnChanges, EventEmitter, ElementRef } from '@angular/core';
import { isInView } from 'app/core/functions/builder-page';

@Directive({
  selector: '[inView]'
})
export class InViewDirective implements OnChanges{
  @Output() inView = new EventEmitter<any>();
  @Input() scrollTop: number;
  @Input() pageIndex: number;
  @Input() pdfPages: any[]

  constructor(
    private elementRef: ElementRef
  ) { }

  ngOnChanges() {
    if (typeof this.scrollTop !== 'undefined' && typeof this.pageIndex !== 'undefined') {
      const page_number = this.pageIndex + 1;
      const pageTop = this.elementRef.nativeElement.offsetTop;
      const pageHeight = this.elementRef.nativeElement.offsetHeight;
      this.inView.emit({
        page_number: page_number,
        in_view: isInView(this.scrollTop, pageTop, pageHeight)
      });
    } else {
      this.inView.emit({
        page_number: null,
        in_view: null
      })
    }
  }

  
}
