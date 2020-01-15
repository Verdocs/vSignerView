import { DomPortalOutlet } from '@angular/cdk/portal';
import { DOCUMENT, Location } from '@angular/common';
import {
  ApplicationRef,
  ComponentFactoryResolver,
  Inject,
  Injectable,
  Injector,
  NgZone,
  Optional,
} from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';
import { OverlayConfig } from './overlay-config';
import { OverlayContainer } from './overlay-container';
import { OverlayRef } from './overlay-ref';
import { OverlayPositionBuilder } from './position/overlay-position-builder';

let nextUniqueId = 0;

@Injectable()
export class Overlay {
  private _appRef: ApplicationRef;

  constructor(
    private _overlayContainer: OverlayContainer,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _positionBuilder: OverlayPositionBuilder,
    private _injector: Injector,
    private _ngZone: NgZone,
    @Inject(DOCUMENT) private _document: any,
    private _directionality: Directionality,
    @Optional() private _location?: Location
  ) { }

  create(config?: OverlayConfig): OverlayRef {
    const host = this._createHostElement();
    const pane = this._createPaneElement(host);
    const portalOutlet = this._createPortalOutlet(pane);
    const overlayConfig = new OverlayConfig(config);

    overlayConfig.direction = overlayConfig.direction || this._directionality.value;

    return new OverlayRef(portalOutlet, host, pane, overlayConfig, this._ngZone, this._document, this._location);
  }

  position(): OverlayPositionBuilder {
    return this._positionBuilder;
  }

  private _createPaneElement(host: HTMLElement): HTMLElement {
    const pane = this._document.createElement('div');

    pane.id = `rForm-overlay-${nextUniqueId++}`;
    pane.classList.add('rForm-overlay-pane');
    host.appendChild(pane);

    return pane;
  }

  private _createHostElement(): HTMLElement {
    const host = this._document.createElement('div');
    this._overlayContainer.getContainerElement().appendChild(host);
    return host;
  }

  private _createPortalOutlet(pane: HTMLElement): DomPortalOutlet {
    if (!this._appRef) {
      this._appRef = this._injector.get<ApplicationRef>(ApplicationRef);
    }

    return new DomPortalOutlet(pane, this._componentFactoryResolver, this._appRef, this._injector);
  }

  showBackdrop() {
    if (this._overlayContainer.getContainerElement().className.includes('backdrop-shown')) {
      this._overlayContainer.getContainerElement().classList.replace('backdrop-hidden', 'backdrop-shown');
    } else {
      this._overlayContainer.getContainerElement().classList.add('backdrop-shown');
    }
    if (this._overlayContainer.getBackdropElement().className.includes('hidden')) {
      this._overlayContainer.getBackdropElement().classList.replace('hidden', 'shown');
    } else {
      this._overlayContainer.getBackdropElement().classList.add('shown');
    }
    this.disableScroll();
  }

  hideBackdrop() {
    this._overlayContainer.getContainerElement().classList.replace('backdrop-shown', 'backdrop-hidden');
    this._overlayContainer.getBackdropElement().classList.replace('shown', 'hidden');
    this.enableScroll();
  }

  preventDefault(e: Event) {
    e = e || window ? window.event : null;
    if (e && e.preventDefault) {
      e.preventDefault();
      e.returnValue = false;
    }
  }

  keydown(e: KeyboardEvent) {
    const keys = [32, 33, 34, 35, 36, 37, 38, 39, 40];
    for (var i = keys.length; i--;) {
      if (e.keyCode === keys[i]) {
        e.preventDefault();
        return;
      }
    }
  }

  wheel(e: MouseWheelEvent) {
    e.preventDefault();
  }

  disableScrollMobile() {
    this._document.addEventListener('touchmove', () => { this.preventDefault }, false);
  }
  enableScrollMobile() {
    this._document.removeEventListener('touchmove', () => { this.preventDefault }, false);
  }

  disableScroll() {
    if (window) {
      if (window.addEventListener) {
        window.addEventListener('DOMMouseScroll', () => { this.wheel }, false);
      }
      window.onmousewheel = this._document.onmousewheel = this.wheel;
      window.onkeydown = this._document.onkeydown = this.keydown;
    }
    this._document.documentElement.style.overflow = 'hidden';
    this._document.body.scroll = 'no';
    this.disableScrollMobile();
  }

  enableScroll() {
    if (window) {
      if (window.removeEventListener) {
        window.removeEventListener('DOMMouseScroll', () => { this.wheel }, false);
      }
      window.onmousewheel = this._document.onmousewheel = null;
      window.onkeydown = this._document.onkeydown = null;
    }
    this._document.documentElement.style.overflow = 'auto';
    this._document.body.scroll = 'yes';
    this.enableScrollMobile()
  }
}
