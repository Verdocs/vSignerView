import {DOCUMENT} from '@angular/common';
import {
  Inject,
  Injectable,
  OnDestroy
} from '@angular/core';

@Injectable({providedIn: 'root'})
export class OverlayContainer implements OnDestroy {
  protected _containerElement: HTMLElement;
  protected _backdropElement: HTMLElement;

  constructor(@Inject(DOCUMENT) protected _document: any) {}

  ngOnDestroy() {
    if (this._containerElement && this._containerElement.parentNode) {
      this._containerElement.parentNode.removeChild(this._containerElement);
    }
  }

  getContainerElement(): HTMLElement {
    if (!this._containerElement) {
      this._createContainer();
    }
    return this._containerElement;
  }

  getBackdropElement(): HTMLElement {
    if (!this._containerElement) {
      this._createContainer();
    }

    return this._backdropElement;
  }

  protected _createContainer(): void {
    const container = this._document.createElement('div');
    const backdrop = this._document.createElement('div');
    
    container.classList.add('rForm-overlay-container');
    backdrop.classList.add('rForm-overlay-backdrop');
    backdrop.id = 'rForm-backdrop'

    this._document.body.appendChild(container);
    container.appendChild(backdrop);
    this._backdropElement = backdrop;
    this._containerElement = container;
  }
}
