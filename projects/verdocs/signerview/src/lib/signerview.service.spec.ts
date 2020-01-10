import { TestBed } from '@angular/core/testing';

import { SignerviewService } from './signerview.service';

describe('SignerviewService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SignerviewService = TestBed.get(SignerviewService);
    expect(service).toBeTruthy();
  });
});
