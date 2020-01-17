import { NgZone } from '@angular/core';
import { Location } from '@angular/common';
import { Portal, PortalOutlet } from '@angular/cdk/portal';
import { coerceCssPixelValue, coerceArray } from '@angular/cdk/coercion';
import { Direction, Directionality } from '@angular/cdk/bidi';
import { Observable, Subject, merge, SubscriptionLike, Subscription, Observer } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { OverlayReference } from './overlay-reference';
import { PositionStrategy } from './position/position-strategy';
import { OverlayConfig } from './overlay-config';

export type ImmutableObject<T> = {
  readonly [P in keyof T]: T[P];
};

export class OverlayRef implements PortalOutlet, OverlayReference {
  private _backdropElement: HTMLElement | null = null;
  private _positionStrategy: PositionStrategy | undefined;
  private _attachments = new Subject<void>();
  private _detachments = new Subject<void>();
  private _locationChanges: SubscriptionLike = Subscription.EMPTY;
  private _previousHostParent: HTMLElement;

  constructor(
    private _portalOutlet: PortalOutlet,
    private _host: HTMLElement,
    private _pane: HTMLElement,
    private _config: ImmutableObject<OverlayConfig>,
    private _ngZone: NgZone,
    private _document: Document,
    private _location?: Location
  ) {
    this._positionStrategy = _config.positionStrategy;
  }

  get overlayElement(): HTMLElement {
    return this._pane;
  }

  get backdropElement(): HTMLElement | null {
    return this._backdropElement;
  }

  get hostElement(): HTMLElement {
    return this._host;
  }

  attach(portal: Portal<any>): any {
    let attachResult = this._portalOutlet.attach(portal);

    if (this._positionStrategy) {
      this._positionStrategy.attach(this);
    }

    if (!this._host.parentElement && this._previousHostParent) {
      this._previousHostParent.appendChild(this._host);
    }

    this._updateElementSize();

    this._ngZone.onStable
      .asObservable()
      .pipe(take(1))
      .subscribe(() => {
        if (this.hasAttached()) {
          this.updatePosition();
        }
      });

    this._updateStackingOrder();
    this._updateElementSize();
    // review this part for backdrop
    if (this._config.role === 'multi') {
      if (this._config.hasBackdrop) {
        // this.attachBackdrop();
      }
    } else {
      // this.attachBackdrop();
    }


    if (this._config.panelClass) {
      this._toggleClasses(this._pane, this._config.panelClass, true);
    }

    this._attachments.next();

    if (this._config.disposeOnNavigation && this._location) {
      this._locationChanges = this._location.subscribe(() => this.dispose());
    }

    return attachResult;
  }

  detach(): any {
    if (!this.hasAttached()) {
      return;
    }

    this.detachBackdrop();

    if (this._positionStrategy && this._positionStrategy.detach) {
      this._positionStrategy.detach();
    }

    const detachmentResult = this._portalOutlet.detach();

    this._detachments.next();

    this._detachContentWhenStable();

    this._locationChanges.unsubscribe();

    return detachmentResult;
  }

  dispose(): void {
    const isAttached = this.hasAttached();

    this._locationChanges.unsubscribe();
    this.detachBackdrop();
    this._portalOutlet.dispose();
    this._attachments.complete();

    if (this._host && this._host.parentNode) {
      this._host.parentNode.removeChild(this._host);
      this._host = null!;
    }

    this._previousHostParent = this._pane = null!;

    if (isAttached) {
      this._detachments.next();
    }

    this._detachments.complete();
  }

  hasAttached(): boolean {
    return this._portalOutlet.hasAttached();
  }

  attachments(): Observable<void> {
    return this._attachments.asObservable();
  }

  detachments(): Observable<void> {
    return this._detachments.asObservable();
  }

  getConfig(): OverlayConfig {
    return this._config;
  }

  updatePosition(): void {
    if (this._positionStrategy) {
      this._positionStrategy.apply();
    }
  }

  updatePositionStrategy(strategy: PositionStrategy): void {
    if (strategy === this._positionStrategy) {
      return;
    }

    if (this._positionStrategy) {
      this._positionStrategy.dispose();
    }

    this._positionStrategy = strategy;

    if (this.hasAttached()) {
      strategy.attach(this);
      this.updatePosition();
    }
  }

  setDirection(dir: Direction | Directionality): void {
    this._config = { ...this._config, direction: dir };
    this._updateElementDirection();
  }

  addPanelClass(classes: string | string[]): void {
    if (this._pane) {
      this._toggleClasses(this._pane, classes, true);
    }
  }

  removePanelClass(classes: string | string[]): void {
    if (this._pane) {
      this._toggleClasses(this._pane, classes, false);
    }
  }

  getDirection(): Direction {
    const direction = this._config.direction;

    if (!direction) {
      return 'ltr';
    }

    return typeof direction === 'string' ? direction : direction.value;
  }

  updateSize(sizeConfig: any): void {
    this._config = { ...this._config, ...sizeConfig };
    this._updateElementSize();
  }

  private _updateElementDirection() {
    this._host.setAttribute('dir', this.getDirection());
  }

  private _updateElementSize() {
    const style = this._pane.style;

    style.width = coerceCssPixelValue(this._config.width);
    style.height = coerceCssPixelValue(this._config.height);
    style.minWidth = coerceCssPixelValue(this._config.minWidth);
    style.minHeight = coerceCssPixelValue(this._config.minHeight);
    style.maxWidth = coerceCssPixelValue(this._config.maxWidth);
    style.maxHeight = coerceCssPixelValue(this._config.maxHeight);
  }

  attachBackdrop() {
    const showingClass = 'shown';

    if (this._document) {
      const backdrop = this._document.getElementById('rForm-backdrop');
      if (!!backdrop) {
        this._backdropElement = backdrop;
      } else {
        this._backdropElement = this._document.createElement('div');
        this._backdropElement.classList.add('rForm-overlay-backdrop');
      }
    } else {
      this._backdropElement = this._document.createElement('div');
      this._backdropElement.classList.add('rForm-overlay-backdrop');
    }


    // Insert the backdrop before the pane in the DOM order,
    // in order to handle stacked overlays properly.
    this._host.parentElement!.insertBefore(this._backdropElement, this._host);

    // Add class to fade-in the backdrop after one frame.
    if (typeof requestAnimationFrame !== 'undefined') {
      this._ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
          if (this._backdropElement) {
            this._backdropElement.classList.add(showingClass);
          }
        });
      });
    } else {
      this._backdropElement.classList.add(showingClass);
    }
  }

  private _updateStackingOrder() {
    if (this._host.nextSibling) {
      this._host.parentNode!.appendChild(this._host);
    }
  }

  detachBackdrop(): void {
    let backdropToDetach = this._backdropElement;

    if (!backdropToDetach) {
      return;
    }

    let timeoutId: NodeJS.Timer;
    let finishDetach = () => {

      if (backdropToDetach && backdropToDetach.parentNode) {
        backdropToDetach.parentNode.removeChild(backdropToDetach);
      }

      if (this._backdropElement == backdropToDetach) {
        this._backdropElement = null;
      }

      if (this._config.backdropClass) {
        this._toggleClasses(backdropToDetach!, this._config.backdropClass, false);
      }

      clearTimeout(timeoutId);
    };

    backdropToDetach.classList.remove('shown');

    this._ngZone.runOutsideAngular(() => {
      backdropToDetach!.addEventListener('transitionend', finishDetach);
    });

    backdropToDetach.style.pointerEvents = 'none';

    timeoutId = this._ngZone.runOutsideAngular(() => setTimeout(finishDetach, 500));
  }

  private _toggleClasses(element: HTMLElement, cssClasses: string | string[], isAdd: boolean) {
    const classList = element.classList;

    coerceArray(cssClasses).forEach(cssClass => {
      isAdd ? classList.add(cssClass) : classList.remove(cssClass);
    });
  }

  private _detachContentWhenStable() {
    this._ngZone.runOutsideAngular(() => {
      const subscription = this._ngZone.onStable
        .asObservable()
        .pipe(takeUntil(merge(this._attachments, this._detachments)))
        .subscribe(() => {
          if (!this._pane || !this._host || this._pane.children.length === 0) {
            if (this._pane && this._config.panelClass) {
              this._toggleClasses(this._pane, this._config.panelClass, false);
            }

            if (this._host && this._host.parentElement) {
              this._previousHostParent = this._host.parentElement;
              this._previousHostParent.removeChild(this._host);
            }

            subscription.unsubscribe();
          }
        });
    });
  }
}

export interface OverlaySizeConfig {
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}
