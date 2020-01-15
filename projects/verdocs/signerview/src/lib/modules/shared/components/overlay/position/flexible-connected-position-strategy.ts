import { PositionStrategy } from './position-strategy';
import { ElementRef } from '@angular/core';
import { ViewportRuler, CdkScrollable, ViewportScrollPosition } from '@angular/cdk/scrolling';
import {
  ConnectedOverlayPositionChange,
  ConnectionPositionPair,
  ScrollingVisibility,
  validateHorizontalPosition,
  validateVerticalPosition,
} from './connected-position';
import { Observable, Subscription, Subject, Observer } from 'rxjs';
import { OverlayReference } from '../overlay-reference';
import { isElementScrolledOutsideView, isElementClippedByScrolling } from './scroll-clip';
import { coerceCssPixelValue, coerceArray } from '@angular/cdk/coercion';
import { Platform } from '@angular/cdk/platform';
import { OverlayContainer } from '../overlay-container';

const boundingBoxClass = 'cdk-overlay-connected-position-bounding-box';

export type FlexibleConnectedPositionStrategyOrigin = ElementRef | HTMLElement | Point;

export class FlexibleConnectedPositionStrategy implements PositionStrategy {
  private _overlayRef: OverlayReference;
  private _isInitialRender: boolean;
  private _lastBoundingBoxSize = { width: 0, height: 0 };
  private _isPushed = false;
  private _canPush = true;
  private _growAfterOpen = false;
  private _hasFlexibleDimensions = true;
  private _positionLocked = false;
  private _originRect: ClientRect;
  private _overlayRect: ClientRect;
  private _viewportRect: ClientRect;
  private _viewportMargin = 0;
  private scrollables: CdkScrollable[] = [];
  _preferredPositions: ConnectionPositionPair[] = [];
  private _origin: FlexibleConnectedPositionStrategyOrigin;
  private _pane: HTMLElement;
  private _isDisposed: boolean;
  private _boundingBox: HTMLElement | null;
  private _lastPosition: ConnectedPosition | null;
  private _positionChanges = new Subject<ConnectedOverlayPositionChange>();
  private _resizeSubscription = Subscription.EMPTY;
  private _offsetX = 0;
  private _offsetY = 0;
  private _transformOriginSelector: string;
  private _positionChangeSubscriptions = 0;
  private _appliedPanelClasses: string[] = [];
  private _previousPushAmount: { x: number, y: number } | null;
  positionChanges: Observable<ConnectedOverlayPositionChange> =
    new Observable((observer: Observer<ConnectedOverlayPositionChange>) => {
      const subscription = this._positionChanges.subscribe(observer);
      this._positionChangeSubscriptions++;

      return () => {
        subscription.unsubscribe();
        this._positionChangeSubscriptions--;
      };
    });

  get positions() {
    return this._preferredPositions;
  }

  constructor(
    connectedTo: FlexibleConnectedPositionStrategyOrigin, private _viewportRuler: ViewportRuler,
    private _document: Document, private _platform: Platform,
    private _overlayContainer: OverlayContainer) {
    this.setOrigin(connectedTo);
  }

  attach(overlayRef: OverlayReference): void {
    if (this._overlayRef && overlayRef !== this._overlayRef) {
      throw Error('This position strategy is already attached to an overlay');
    }

    this._validatePositions();

    overlayRef.hostElement.classList.add(boundingBoxClass);

    this._overlayRef = overlayRef;
    this._boundingBox = overlayRef.hostElement;
    this._pane = overlayRef.overlayElement;
    this._isDisposed = false;
    this._isInitialRender = true;
    this._lastPosition = null;
    this._resizeSubscription.unsubscribe();
    this._resizeSubscription = this._viewportRuler.change().subscribe(() => {
      this._isInitialRender = true;
      this.apply();
    });
  }

  apply(): void {
    if (this._isDisposed || !this._platform.isBrowser) {
      return;
    }

    if (!this._isInitialRender && this._positionLocked && this._lastPosition) {
      this.reapplyLastPosition();
      return;
    }

    this._clearPanelClasses();
    this._resetOverlayElementStyles();
    this._resetBoundingBoxStyles();

    this._viewportRect = this._getNarrowedViewportRect();
    this._originRect = this._getOriginRect();
    this._overlayRect = this._pane.getBoundingClientRect();

    const originRect = this._originRect;
    const overlayRect = this._overlayRect;
    const viewportRect = this._viewportRect;

    const flexibleFits: FlexibleFit[] = [];

    let fallback: FallbackPosition | undefined;

    for (let pos of this._preferredPositions) {
      let originPoint = this._getOriginPoint(originRect, pos);
      let overlayPoint = this._getOverlayPoint(originPoint, overlayRect, pos);
      let overlayFit = this._getOverlayFit(overlayPoint, overlayRect, viewportRect, pos);

      if (overlayFit.isCompletelyWithinViewport) {
        this._isPushed = false;
        this._applyPosition(pos, originPoint);
        return;
      }

      if (this._canFitWithFlexibleDimensions(overlayFit, overlayPoint, viewportRect)) {
        flexibleFits.push({
          position: pos,
          origin: originPoint,
          overlayRect,
          boundingBoxRect: this._calculateBoundingBoxRect(originPoint, pos)
        });

        continue;
      }

      if (!fallback || fallback.overlayFit.visibleArea < overlayFit.visibleArea) {
        fallback = { overlayFit, overlayPoint, originPoint, position: pos, overlayRect };
      }
    }

    if (flexibleFits.length) {
      let bestFit: FlexibleFit | null = null;
      let bestScore = -1;
      for (const fit of flexibleFits) {
        const score =
          fit.boundingBoxRect.width * fit.boundingBoxRect.height * (fit.position.weight || 1);
        if (score > bestScore) {
          bestScore = score;
          bestFit = fit;
        }
      }

      this._isPushed = false;
      this._applyPosition(bestFit!.position, bestFit!.origin);
      return;
    }

    if (this._canPush) {
      this._isPushed = true;
      this._applyPosition(fallback!.position, fallback!.originPoint);
      return;
    }

    this._applyPosition(fallback!.position, fallback!.originPoint);
  }

  detach(): void {
    this._clearPanelClasses();
    this._lastPosition = null;
    this._previousPushAmount = null;
    this._resizeSubscription.unsubscribe();
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (this._boundingBox) {
      extendStyles(this._boundingBox.style, {
        top: '',
        left: '',
        right: '',
        bottom: '',
        height: '',
        width: '',
        alignItems: '',
        justifyContent: '',
      } as CSSStyleDeclaration);
    }

    if (this._pane) {
      this._resetOverlayElementStyles();
    }

    if (this._overlayRef) {
      this._overlayRef.hostElement.classList.remove(boundingBoxClass);
    }

    this.detach();
    this._positionChanges.complete();
    this._overlayRef = this._boundingBox = null!;
    this._isDisposed = true;
  }

  reapplyLastPosition(): void {
    if (!this._isDisposed && (!this._platform || this._platform.isBrowser)) {
      this._originRect = this._getOriginRect();
      this._overlayRect = this._pane.getBoundingClientRect();
      this._viewportRect = this._getNarrowedViewportRect();

      const lastPosition = this._lastPosition || this._preferredPositions[0];
      const originPoint = this._getOriginPoint(this._originRect, lastPosition);

      this._applyPosition(lastPosition, originPoint);
    }
  }

  withScrollableContainers(scrollables: CdkScrollable[]): this {
    this.scrollables = scrollables;
    return this;
  }

  withPositions(positions: ConnectedPosition[]): this {
    this._preferredPositions = positions;

    if (positions.indexOf(this._lastPosition!) === -1) {
      this._lastPosition = null;
    }

    this._validatePositions();

    return this;
  }

  withViewportMargin(margin: number): this {
    this._viewportMargin = margin;
    return this;
  }

  withFlexibleDimensions(flexibleDimensions = true): this {
    this._hasFlexibleDimensions = flexibleDimensions;
    return this;
  }

  withGrowAfterOpen(growAfterOpen = true): this {
    this._growAfterOpen = growAfterOpen;
    return this;
  }

  withPush(canPush = true): this {
    this._canPush = canPush;
    return this;
  }

  withLockedPosition(isLocked = true): this {
    this._positionLocked = isLocked;
    return this;
  }

  setOrigin(origin: FlexibleConnectedPositionStrategyOrigin): this {
    this._origin = origin;
    return this;
  }

  withDefaultOffsetX(offset: number): this {
    this._offsetX = offset;
    return this;
  }

  withDefaultOffsetY(offset: number): this {
    this._offsetY = offset;
    return this;
  }

  withTransformOriginOn(selector: string): this {
    this._transformOriginSelector = selector;
    return this;
  }

  private _getOriginPoint(originRect: ClientRect, pos: ConnectedPosition): Point {
    let x: number;
    if (pos.originX == 'center') {
      x = originRect.left + (originRect.width / 2);
    } else {
      const startX = this._isRtl() ? originRect.right : originRect.left;
      const endX = this._isRtl() ? originRect.left : originRect.right;
      x = pos.originX == 'start' ? startX : endX;
    }

    let y: number;
    if (pos.originY == 'center') {
      y = originRect.top + (originRect.height / 2);
    } else {
      y = pos.originY == 'top' ? originRect.top : originRect.bottom;
    }

    return { x, y };
  }


  private _getOverlayPoint(
    originPoint: Point,
    overlayRect: ClientRect,
    pos: ConnectedPosition): Point {

    let overlayStartX: number;
    if (pos.overlayX == 'center') {
      overlayStartX = -overlayRect.width / 2;
    } else if (pos.overlayX === 'start') {
      overlayStartX = this._isRtl() ? -overlayRect.width : 0;
    } else {
      overlayStartX = this._isRtl() ? 0 : -overlayRect.width;
    }

    let overlayStartY: number;
    if (pos.overlayY == 'center') {
      overlayStartY = -overlayRect.height / 2;
    } else {
      overlayStartY = pos.overlayY == 'top' ? 0 : -overlayRect.height;
    }

    // The (x, y) coordinates of the overlay.
    return {
      x: originPoint.x + overlayStartX,
      y: originPoint.y + overlayStartY,
    };
  }

  /** Gets how well an overlay at the given point will fit within the viewport. */
  private _getOverlayFit(point: Point, overlay: ClientRect, viewport: ClientRect,
    position: ConnectedPosition): OverlayFit {

    let { x, y } = point;
    let offsetX = this._getOffset(position, 'x');
    let offsetY = this._getOffset(position, 'y');

    // Account for the offsets since they could push the overlay out of the viewport.
    if (offsetX) {
      x += offsetX;
    }

    if (offsetY) {
      y += offsetY;
    }

    // How much the overlay would overflow at this position, on each side.
    let leftOverflow = 0 - x;
    let rightOverflow = (x + overlay.width) - viewport.width;
    let topOverflow = 0 - y;
    let bottomOverflow = (y + overlay.height) - viewport.height;

    // Visible parts of the element on each axis.
    let visibleWidth = this._subtractOverflows(overlay.width, leftOverflow, rightOverflow);
    let visibleHeight = this._subtractOverflows(overlay.height, topOverflow, bottomOverflow);
    let visibleArea = visibleWidth * visibleHeight;

    return {
      visibleArea,
      isCompletelyWithinViewport: (overlay.width * overlay.height) === visibleArea,
      fitsInViewportVertically: visibleHeight === overlay.height,
      fitsInViewportHorizontally: visibleWidth == overlay.width,
    };
  }

  private _canFitWithFlexibleDimensions(fit: OverlayFit, point: Point, viewport: ClientRect) {
    if (this._hasFlexibleDimensions) {
      const availableHeight = viewport.bottom - point.y;
      const availableWidth = viewport.right - point.x;
      const minHeight = this._overlayRef.getConfig().minHeight;
      const minWidth = this._overlayRef.getConfig().minWidth;

      const verticalFit = fit.fitsInViewportVertically ||
        (minHeight != null && minHeight <= availableHeight);
      const horizontalFit = fit.fitsInViewportHorizontally ||
        (minWidth != null && minWidth <= availableWidth);

      return verticalFit && horizontalFit;
    }
  }

  /**
   * Gets the point at which the overlay can be "pushed" on-screen. If the overlay is larger than
   * the viewport, the top-left corner will be pushed on-screen (with overflow occuring on the
   * right and bottom).
   *
   * @param start Starting point from which the overlay is pushed.
   * @param overlay Dimensions of the overlay.
   * @param scrollPosition Current viewport scroll position.
   * @returns The point at which to position the overlay after pushing. This is effectively a new
   *     originPoint.
   */
  private _pushOverlayOnScreen(start: Point,
    overlay: ClientRect,
    scrollPosition: ViewportScrollPosition): Point {
    // If the position is locked and we've pushed the overlay already, reuse the previous push
    // amount, rather than pushing it again. If we were to continue pushing, the element would
    // remain in the viewport, which goes against the expectations when position locking is enabled.
    if (this._previousPushAmount && this._positionLocked) {
      return {
        x: start.x + this._previousPushAmount.x,
        y: start.y + this._previousPushAmount.y
      };
    }

    const viewport = this._viewportRect;

    // Determine how much the overlay goes outside the viewport on each
    // side, which we'll use to decide which direction to push it.
    const overflowRight = Math.max(start.x + overlay.width - viewport.right, 0);
    const overflowBottom = Math.max(start.y + overlay.height - viewport.bottom, 0);
    const overflowTop = Math.max(viewport.top - scrollPosition.top - start.y, 0);
    const overflowLeft = Math.max(viewport.left - scrollPosition.left - start.x, 0);

    // Amount by which to push the overlay in each axis such that it remains on-screen.
    let pushX = 0;
    let pushY = 0;

    // If the overlay fits completely within the bounds of the viewport, push it from whichever
    // direction is goes off-screen. Otherwise, push the top-left corner such that its in the
    // viewport and allow for the trailing end of the overlay to go out of bounds.
    if (overlay.width <= viewport.width) {
      pushX = overflowLeft || -overflowRight;
    } else {
      pushX = start.x < this._viewportMargin ? (viewport.left - scrollPosition.left) - start.x : 0;
    }

    if (overlay.height <= viewport.height) {
      pushY = overflowTop || -overflowBottom;
    } else {
      pushY = start.y < this._viewportMargin ? (viewport.top - scrollPosition.top) - start.y : 0;
    }

    this._previousPushAmount = { x: pushX, y: pushY };

    return {
      x: start.x + pushX,
      y: start.y + pushY,
    };
  }

  /**
   * Applies a computed position to the overlay and emits a position change.
   * @param position The position preference
   * @param originPoint The point on the origin element where the overlay is connected.
   */
  private _applyPosition(position: ConnectedPosition, originPoint: Point) {
    this._setTransformOrigin(position);
    this._setOverlayElementStyles(originPoint, position);
    this._setBoundingBoxStyles(originPoint, position);

    if (position.panelClass) {
      this._addPanelClasses(position.panelClass);
    }

    // Save the last connected position in case the position needs to be re-calculated.
    this._lastPosition = position;

    // Notify that the position has been changed along with its change properties.
    // We only emit if we've got any subscriptions, because the scroll visibility
    // calculcations can be somewhat expensive.
    if (this._positionChangeSubscriptions > 0) {
      const scrollableViewProperties = this._getScrollVisibility();
      const changeEvent = new ConnectedOverlayPositionChange(position, scrollableViewProperties);
      this._positionChanges.next(changeEvent);
    }

    this._isInitialRender = false;
  }

  /** Sets the transform origin based on the configured selector and the passed-in position.  */
  private _setTransformOrigin(position: ConnectedPosition) {
    if (!this._transformOriginSelector) {
      return;
    }

    const elements: NodeListOf<HTMLElement> =
      this._boundingBox!.querySelectorAll(this._transformOriginSelector);
    let xOrigin: 'left' | 'right' | 'center';
    let yOrigin: 'top' | 'bottom' | 'center' = position.overlayY;

    if (position.overlayX === 'center') {
      xOrigin = 'center';
    } else if (this._isRtl()) {
      xOrigin = position.overlayX === 'start' ? 'right' : 'left';
    } else {
      xOrigin = position.overlayX === 'start' ? 'left' : 'right';
    }

    for (let i = 0; i < elements.length; i++) {
      elements[i].style.transformOrigin = `${xOrigin} ${yOrigin}`;
    }
  }

  /**
   * Gets the position and size of the overlay's sizing container.
   *
   * This method does no measuring and applies no styles so that we can cheaply compute the
   * bounds for all positions and choose the best fit based on these results.
   */
  private _calculateBoundingBoxRect(origin: Point, position: ConnectedPosition): BoundingBoxRect {
    const viewport = this._viewportRect;
    const isRtl = this._isRtl();
    let height: number, top: number, bottom: number;

    if (position.overlayY === 'top') {
      // Overlay is opening "downward" and thus is bound by the bottom viewport edge.
      top = origin.y;
      height = viewport.height - top + this._viewportMargin;
    } else if (position.overlayY === 'bottom') {
      // Overlay is opening "upward" and thus is bound by the top viewport edge. We need to add
      // the viewport margin back in, because the viewport rect is narrowed down to remove the
      // margin, whereas the `origin` position is calculated based on its `ClientRect`.
      bottom = viewport.height - origin.y + this._viewportMargin * 2;
      height = viewport.height - bottom + this._viewportMargin;
    } else {
      // If neither top nor bottom, it means that the overlay is vertically centered on the
      // origin point. Note that we want the position relative to the viewport, rather than
      // the page, which is why we don't use something like `viewport.bottom - origin.y` and
      // `origin.y - viewport.top`.
      const smallestDistanceToViewportEdge =
        Math.min(viewport.bottom - origin.y + viewport.top, origin.y);

      const previousHeight = this._lastBoundingBoxSize.height;

      height = smallestDistanceToViewportEdge * 2;
      top = origin.y - smallestDistanceToViewportEdge;

      if (height > previousHeight && !this._isInitialRender && !this._growAfterOpen) {
        top = origin.y - (previousHeight / 2);
      }
    }

    // The overlay is opening 'right-ward' (the content flows to the right).
    const isBoundedByRightViewportEdge =
      (position.overlayX === 'start' && !isRtl) ||
      (position.overlayX === 'end' && isRtl);

    // The overlay is opening 'left-ward' (the content flows to the left).
    const isBoundedByLeftViewportEdge =
      (position.overlayX === 'end' && !isRtl) ||
      (position.overlayX === 'start' && isRtl);

    let width: number, left: number, right: number;

    if (isBoundedByLeftViewportEdge) {
      right = viewport.right - origin.x + this._viewportMargin;
      width = origin.x - viewport.left;
    } else if (isBoundedByRightViewportEdge) {
      left = origin.x;
      width = viewport.right - origin.x;
    } else {
      // If neither start nor end, it means that the overlay is horizontally centered on the
      // origin point. Note that we want the position relative to the viewport, rather than
      // the page, which is why we don't use something like `viewport.right - origin.x` and
      // `origin.x - viewport.left`.
      const smallestDistanceToViewportEdge =
        Math.min(viewport.right - origin.x + viewport.left, origin.x);
      const previousWidth = this._lastBoundingBoxSize.width;

      width = smallestDistanceToViewportEdge * 2;
      left = origin.x - smallestDistanceToViewportEdge;

      if (width > previousWidth && !this._isInitialRender && !this._growAfterOpen) {
        left = origin.x - (previousWidth / 2);
      }
    }

    return { top: top!, left: left!, bottom: bottom!, right: right!, width, height };
  }

  /**
   * Sets the position and size of the overlay's sizing wrapper. The wrapper is positioned on the
   * origin's connection point and stetches to the bounds of the viewport.
   *
   * @param origin The point on the origin element where the overlay is connected.
   * @param position The position preference
   */
  private _setBoundingBoxStyles(origin: Point, position: ConnectedPosition): void {
    const boundingBoxRect = this._calculateBoundingBoxRect(origin, position);

    // It's weird if the overlay *grows* while scrolling, so we take the last size into account
    // when applying a new size.
    if (!this._isInitialRender && !this._growAfterOpen) {
      boundingBoxRect.height = Math.min(boundingBoxRect.height, this._lastBoundingBoxSize.height);
      boundingBoxRect.width = Math.min(boundingBoxRect.width, this._lastBoundingBoxSize.width);
    }

    const styles = {} as CSSStyleDeclaration;

    if (this._hasExactPosition()) {
      styles.top = styles.left = '0';
      styles.bottom = styles.right = '';
      styles.width = styles.height = '100%';
    } else {
      const maxHeight = this._overlayRef.getConfig().maxHeight;
      const maxWidth = this._overlayRef.getConfig().maxWidth;

      styles.height = coerceCssPixelValue(boundingBoxRect.height);
      styles.top = coerceCssPixelValue(boundingBoxRect.top);
      styles.bottom = coerceCssPixelValue(boundingBoxRect.bottom);
      styles.width = coerceCssPixelValue(boundingBoxRect.width);
      styles.left = coerceCssPixelValue(boundingBoxRect.left);
      styles.right = coerceCssPixelValue(boundingBoxRect.right);

      // Push the pane content towards the proper direction.
      if (position.overlayX === 'center') {
        styles.alignItems = 'center';
      } else {
        styles.alignItems = position.overlayX === 'end' ? 'flex-end' : 'flex-start';
      }

      if (position.overlayY === 'center') {
        styles.justifyContent = 'center';
      } else {
        styles.justifyContent = position.overlayY === 'bottom' ? 'flex-end' : 'flex-start';
      }

      if (maxHeight) {
        styles.maxHeight = coerceCssPixelValue(maxHeight);
      }

      if (maxWidth) {
        styles.maxWidth = coerceCssPixelValue(maxWidth);
      }
    }

    this._lastBoundingBoxSize = boundingBoxRect;

    extendStyles(this._boundingBox!.style, styles);
  }

  /** Resets the styles for the bounding box so that a new positioning can be computed. */
  private _resetBoundingBoxStyles() {
    extendStyles(this._boundingBox!.style, {
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      height: '',
      width: '',
      alignItems: '',
      justifyContent: '',
    } as CSSStyleDeclaration);
  }

  /** Resets the styles for the overlay pane so that a new positioning can be computed. */
  private _resetOverlayElementStyles() {
    extendStyles(this._pane.style, {
      top: '',
      left: '',
      bottom: '',
      right: '',
      position: '',
      transform: '',
    } as CSSStyleDeclaration);
  }

  /** Sets positioning styles to the overlay element. */
  private _setOverlayElementStyles(originPoint: Point, position: ConnectedPosition): void {
    const styles = {} as CSSStyleDeclaration;

    if (this._hasExactPosition()) {
      const scrollPosition = this._viewportRuler.getViewportScrollPosition();
      extendStyles(styles, this._getExactOverlayY(position, originPoint, scrollPosition));
      extendStyles(styles, this._getExactOverlayX(position, originPoint, scrollPosition));
    } else {
      styles.position = 'static';
    }

    // Use a transform to apply the offsets. We do this because the `center` positions rely on
    // being in the normal flex flow and setting a `top` / `left` at all will completely throw
    // off the position. We also can't use margins, because they won't have an effect in some
    // cases where the element doesn't have anything to "push off of". Finally, this works
    // better both with flexible and non-flexible positioning.
    let transformString = '';
    let offsetX = this._getOffset(position, 'x');
    let offsetY = this._getOffset(position, 'y');

    if (offsetX) {
      transformString += `translateX(${offsetX}px) `;
    }

    if (offsetY) {
      transformString += `translateY(${offsetY}px)`;
    }

    styles.transform = transformString.trim();

    // If a maxWidth or maxHeight is specified on the overlay, we remove them. We do this because
    // we need these values to both be set to "100%" for the automatic flexible sizing to work.
    // The maxHeight and maxWidth are set on the boundingBox in order to enforce the constraint.
    if (this._hasFlexibleDimensions && this._overlayRef.getConfig().maxHeight) {
      styles.maxHeight = '';
    }

    if (this._hasFlexibleDimensions && this._overlayRef.getConfig().maxWidth) {
      styles.maxWidth = '';
    }

    extendStyles(this._pane.style, styles);
  }

  /** Gets the exact top/bottom for the overlay when not using flexible sizing or when pushing. */
  private _getExactOverlayY(position: ConnectedPosition,
    originPoint: Point,
    scrollPosition: ViewportScrollPosition) {
    // Reset any existing styles. This is necessary in case the
    // preferred position has changed since the last `apply`.
    let styles = { top: null, bottom: null } as CSSStyleDeclaration;
    let overlayPoint = this._getOverlayPoint(originPoint, this._overlayRect, position);

    if (this._isPushed) {
      overlayPoint = this._pushOverlayOnScreen(overlayPoint, this._overlayRect, scrollPosition);
    }

    let virtualKeyboardOffset =
      this._overlayContainer.getContainerElement().getBoundingClientRect().top;

    // Normally this would be zero, however when the overlay is attached to an input (e.g. in an
    // autocomplete), mobile browsers will shift everything in order to put the input in the middle
    // of the screen and to make space for the virtual keyboard. We need to account for this offset,
    // otherwise our positioning will be thrown off.
    overlayPoint.y -= virtualKeyboardOffset;

    // We want to set either `top` or `bottom` based on whether the overlay wants to appear
    // above or below the origin and the direction in which the element will expand.
    if (position.overlayY === 'bottom') {
      // When using `bottom`, we adjust the y position such that it is the distance
      // from the bottom of the viewport rather than the top.
      const documentHeight = this._document.documentElement!.clientHeight;
      styles.bottom = `${documentHeight - (overlayPoint.y + this._overlayRect.height)}px`;
    } else {
      styles.top = coerceCssPixelValue(overlayPoint.y);
    }

    return styles;
  }

  /** Gets the exact left/right for the overlay when not using flexible sizing or when pushing. */
  private _getExactOverlayX(position: ConnectedPosition,
    originPoint: Point,
    scrollPosition: ViewportScrollPosition) {
    // Reset any existing styles. This is necessary in case the preferred position has
    // changed since the last `apply`.
    let styles = { left: null, right: null } as CSSStyleDeclaration;
    let overlayPoint = this._getOverlayPoint(originPoint, this._overlayRect, position);

    if (this._isPushed) {
      overlayPoint = this._pushOverlayOnScreen(overlayPoint, this._overlayRect, scrollPosition);
    }

    // We want to set either `left` or `right` based on whether the overlay wants to appear "before"
    // or "after" the origin, which determines the direction in which the element will expand.
    // For the horizontal axis, the meaning of "before" and "after" change based on whether the
    // page is in RTL or LTR.
    let horizontalStyleProperty: 'left' | 'right';

    if (this._isRtl()) {
      horizontalStyleProperty = position.overlayX === 'end' ? 'left' : 'right';
    } else {
      horizontalStyleProperty = position.overlayX === 'end' ? 'right' : 'left';
    }

    // When we're setting `right`, we adjust the x position such that it is the distance
    // from the right edge of the viewport rather than the left edge.
    if (horizontalStyleProperty === 'right') {
      const documentWidth = this._document.documentElement!.clientWidth;
      styles.right = `${documentWidth - (overlayPoint.x + this._overlayRect.width)}px`;
    } else {
      styles.left = coerceCssPixelValue(overlayPoint.x);
    }

    return styles;
  }

  /**
   * Gets the view properties of the trigger and overlay, including whether they are clipped
   * or completely outside the view of any of the strategy's scrollables.
   */
  private _getScrollVisibility(): ScrollingVisibility {
    // Note: needs fresh rects since the position could've changed.
    const originBounds = this._getOriginRect();
    const overlayBounds = this._pane.getBoundingClientRect();

    // TODO(jelbourn): instead of needing all of the client rects for these scrolling containers
    // every time, we should be able to use the scrollTop of the containers if the size of those
    // containers hasn't changed.
    const scrollContainerBounds = this.scrollables.map(scrollable => {
      return scrollable.getElementRef().nativeElement.getBoundingClientRect();
    });

    return {
      isOriginClipped: isElementClippedByScrolling(originBounds, scrollContainerBounds),
      isOriginOutsideView: isElementScrolledOutsideView(originBounds, scrollContainerBounds),
      isOverlayClipped: isElementClippedByScrolling(overlayBounds, scrollContainerBounds),
      isOverlayOutsideView: isElementScrolledOutsideView(overlayBounds, scrollContainerBounds),
    };
  }

  /** Subtracts the amount that an element is overflowing on an axis from it's length. */
  private _subtractOverflows(length: number, ...overflows: number[]): number {
    return overflows.reduce((currentValue: number, currentOverflow: number) => {
      return currentValue - Math.max(currentOverflow, 0);
    }, length);
  }

  /** Narrows the given viewport rect by the current _viewportMargin. */
  private _getNarrowedViewportRect(): ClientRect {
    // We recalculate the viewport rect here ourselves, rather than using the ViewportRuler,
    // because we want to use the `clientWidth` and `clientHeight` as the base. The difference
    // being that the client properties don't include the scrollbar, as opposed to `innerWidth`
    // and `innerHeight` that do. This is necessary, because the overlay container uses
    // 100% `width` and `height` which don't include the scrollbar either.
    const width = this._document.documentElement!.clientWidth;
    const height = this._document.documentElement!.clientHeight;
    const scrollPosition = this._viewportRuler.getViewportScrollPosition();

    return {
      top: scrollPosition.top + this._viewportMargin,
      left: scrollPosition.left + this._viewportMargin,
      right: scrollPosition.left + width - this._viewportMargin,
      bottom: scrollPosition.top + height - this._viewportMargin,
      width: width - (2 * this._viewportMargin),
      height: height - (2 * this._viewportMargin),
    };
  }

  /** Whether the we're dealing with an RTL context */
  private _isRtl() {
    return this._overlayRef.getDirection() === 'rtl';
  }

  /** Determines whether the overlay uses exact or flexible positioning. */
  private _hasExactPosition() {
    return !this._hasFlexibleDimensions || this._isPushed;
  }

  /** Retrieves the offset of a position along the x or y axis. */
  private _getOffset(position: ConnectedPosition, axis: 'x' | 'y') {
    if (axis === 'x') {
      // We don't do something like `position['offset' + axis]` in
      // order to avoid breking minifiers that rename properties.
      return position.offsetX == null ? this._offsetX : position.offsetX;
    }

    return position.offsetY == null ? this._offsetY : position.offsetY;
  }

  /** Validates that the current position match the expected values. */
  private _validatePositions(): void {
    if (!this._preferredPositions.length) {
      throw Error('FlexibleConnectedPositionStrategy: At least one position is required.');
    }

    // TODO(crisbeto): remove these once Angular's template type
    // checking is advanced enough to catch these cases.
    this._preferredPositions.forEach(pair => {
      validateHorizontalPosition('originX', pair.originX);
      validateVerticalPosition('originY', pair.originY);
      validateHorizontalPosition('overlayX', pair.overlayX);
      validateVerticalPosition('overlayY', pair.overlayY);
    });
  }

  /** Adds a single CSS class or an array of classes on the overlay panel. */
  private _addPanelClasses(cssClasses: string | string[]) {
    if (this._pane) {
      coerceArray(cssClasses).forEach(cssClass => {
        if (cssClass !== '' && this._appliedPanelClasses.indexOf(cssClass) === -1) {
          this._appliedPanelClasses.push(cssClass);
          this._pane.classList.add(cssClass);
        }
      });
    }
  }

  /** Clears the classes that the position strategy has applied from the overlay panel. */
  private _clearPanelClasses() {
    if (this._pane) {
      this._appliedPanelClasses.forEach(cssClass => {
        this._pane.classList.remove(cssClass);
      });
      this._appliedPanelClasses = [];
    }
  }

  /** Returns the ClientRect of the current origin. */
  private _getOriginRect(): ClientRect {
    const origin = this._origin;

    if (origin instanceof ElementRef) {
      return origin.nativeElement.getBoundingClientRect();
    }

    if (origin instanceof HTMLElement) {
      return origin.getBoundingClientRect();
    }

    // If the origin is a point, return a client rect as if it was a 0x0 element at the point.
    return {
      top: origin.y,
      bottom: origin.y,
      left: origin.x,
      right: origin.x,
      height: 0,
      width: 0
    };
  }
}

/** A simple (x, y) coordinate. */
interface Point {
  x: number;
  y: number;
}

/** Record of measurements for how an overlay (at a given position) fits into the viewport. */
interface OverlayFit {
  /** Whether the overlay fits completely in the viewport. */
  isCompletelyWithinViewport: boolean;

  /** Whether the overlay fits in the viewport on the y-axis. */
  fitsInViewportVertically: boolean;

  /** Whether the overlay fits in the viewport on the x-axis. */
  fitsInViewportHorizontally: boolean;

  /** The total visible area (in px^2) of the overlay inside the viewport. */
  visibleArea: number;
}

/** Record of the measurments determining whether an overlay will fit in a specific position. */
interface FallbackPosition {
  position: ConnectedPosition;
  originPoint: Point;
  overlayPoint: Point;
  overlayFit: OverlayFit;
  overlayRect: ClientRect;
}

/** Position and size of the overlay sizing wrapper for a specific position. */
interface BoundingBoxRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  height: number;
  width: number;
}

/** Record of measures determining how well a given position will fit with flexible dimensions. */
interface FlexibleFit {
  position: ConnectedPosition;
  origin: Point;
  overlayRect: ClientRect;
  boundingBoxRect: BoundingBoxRect;
}

/** A connected position as specified by the user. */
export interface ConnectedPosition {
  originX: 'start' | 'center' | 'end';
  originY: 'top' | 'center' | 'bottom';

  overlayX: 'start' | 'center' | 'end';
  overlayY: 'top' | 'center' | 'bottom';

  weight?: number;
  offsetX?: number;
  offsetY?: number;
  panelClass?: string | string[];
}

/** Shallow-extends a stylesheet object with another stylesheet object. */
function extendStyles(dest: CSSStyleDeclaration, source: CSSStyleDeclaration): CSSStyleDeclaration {
  for (let key in source) {
    if (source.hasOwnProperty(key)) {
      dest[key] = source[key];
    }
  }

  return dest;
}
