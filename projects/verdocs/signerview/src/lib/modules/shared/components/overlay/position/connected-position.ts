import {Optional} from '@angular/core';
export type HorizontalConnectionPos = 'start' | 'center' | 'end';

export type VerticalConnectionPos = 'top' | 'center' | 'bottom';


export interface OriginConnectionPosition {
  originX: HorizontalConnectionPos;
  originY: VerticalConnectionPos;
}

export interface OverlayConnectionPosition {
  overlayX: HorizontalConnectionPos;
  overlayY: VerticalConnectionPos;
}

export class ConnectionPositionPair {
  originX: HorizontalConnectionPos;
  originY: VerticalConnectionPos;
  overlayX: HorizontalConnectionPos;
  overlayY: VerticalConnectionPos;

  constructor(
    origin: OriginConnectionPosition,
    overlay: OverlayConnectionPosition,
    public offsetX?: number,
    public offsetY?: number,
    public panelClass?: string | string[]) {

    this.originX = origin.originX;
    this.originY = origin.originY;
    this.overlayX = overlay.overlayX;
    this.overlayY = overlay.overlayY;
  }
}

export class ScrollingVisibility {
  isOriginClipped: boolean;
  isOriginOutsideView: boolean;
  isOverlayClipped: boolean;
  isOverlayOutsideView: boolean;
}

export class ConnectedOverlayPositionChange {
  constructor(
      public connectionPair: ConnectionPositionPair,
      @Optional() public scrollableViewProperties: ScrollingVisibility) {}
}

export function validateVerticalPosition(property: string, value: VerticalConnectionPos) {
  if (value !== 'top' && value !== 'bottom' && value !== 'center') {
    throw Error(`ConnectedPosition: Invalid ${property} "${value}". ` +
                `Expected "top", "bottom" or "center".`);
  }
}

export function validateHorizontalPosition(property: string, value: HorizontalConnectionPos) {
  if (value !== 'start' && value !== 'end' && value !== 'center') {
    throw Error(`ConnectedPosition: Invalid ${property} "${value}". ` +
                `Expected "start", "end" or "center".`);
  }
}