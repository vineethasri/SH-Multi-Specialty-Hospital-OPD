import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { StatusBadgeComponent } from './shared/components/status-badge/status-badge.component';

describe('SH Hospital OPD App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, StatusBadgeComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();
  });

  it('should create the root App component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should resolve role default routes accurately', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.getDefaultRouteForRole('Admin')).toBe('/admin/dashboard');
    expect(auth.getDefaultRouteForRole('Receptionist')).toBe('/reception/dashboard');
    expect(auth.getDefaultRouteForRole('Doctor')).toBe('/doctor/dashboard');
    expect(auth.getDefaultRouteForRole('Patient')).toBe('/patient/dashboard');
  });

  it('should format camelCase visit statuses in StatusBadgeComponent', () => {
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', 'ReadyForCheckout');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim()).toBe('Ready For Checkout');
    expect(el.querySelector('.variant-teal')).toBeTruthy();
  });
});
