import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HeaderService } from './services/header.service';

@Component({
  selector: 'app-view-component',
  templateUrl: './views.component.html'
})
export class ViewsComponent implements OnInit, OnDestroy {
  constructor(
    private headerService: HeaderService,
    @Inject(DOCUMENT) private document: any
  ) {}

  ngOnInit() {
    this.headerService.modeSubject.next('view');
    this.document.body.classList.add('views-page');
  }

  ngOnDestroy() {
    if (this.document.body.classList.contains('views-page')) {
      this.document.body.classList.remove('views-page');
    }
  }
}
