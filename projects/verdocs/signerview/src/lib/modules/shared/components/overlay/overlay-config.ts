import { PositionStrategy } from './position/position-strategy';
import { Direction, Directionality } from '@angular/cdk/bidi';

export class OverlayConfig {
  positionStrategy?: PositionStrategy;
  panelClass?: string | string[] = '';
  role?: 'single' | 'multi' = 'single';
  hasBackdrop?: boolean;
  backdropClass?: string = 'rForm-overlay-backdrop';
  width?: number | string;
  height?: number | string;
  minWidth: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  direction?: Direction | Directionality;
  disposeOnNavigation?: boolean = false;

  constructor(config?: OverlayConfig) {
    if (config) {
      const configKeys = Object.keys(config) as Array<keyof OverlayConfig>;
      for (const key of configKeys) {
        if (config[key] !== undefined && key !== 'hasBackdrop' && key !== 'disposeOnNavigation') {
          this[key] = config[key] as any;
        } else if (key === 'hasBackdrop' || key === 'disposeOnNavigation') {
          this[key] = config[key] as boolean;
        }
      }
    }
  }
}
