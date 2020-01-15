import {OverlayReference} from '../overlay-reference';

export interface PositionStrategy {
  attach(overlayRef: OverlayReference): void;
  apply(): void;
  detach?(): void;
  dispose(): void;
}