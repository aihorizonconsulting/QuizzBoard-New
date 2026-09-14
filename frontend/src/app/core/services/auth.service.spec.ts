import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, AuthResponse } from './auth.service';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 'user-1',
    email: 'amadou.diallo@quizzboard.com',
    prenom: 'Amadou',
    nom: 'Diallo',
    role: 'CREATOR',
    subscriptionTier: 'FREE',
    xpPoints: 120,
    level: 2,
    streakDays: 3,
    followersCount: 5,
    followingCount: 2,
    createdAt: '2026-01-01'
  };

  const mockResponse: AuthResponse = {
    token: 'jwt-token-12345',
    user: mockUser
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should authenticate user and store token on login', () => {
    service.login('amadou.diallo@quizzboard.com', 'password123').subscribe(res => {
      expect(res.token).toBe('jwt-token-12345');
      expect(res.user.email).toBe('amadou.diallo@quizzboard.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isCreator()).toBe(true);
    expect(service.isLearner()).toBe(false);
    expect(service.isAdmin()).toBe(false);
    expect(service.dashboardUrl()).toBe('/app/dashboard');
    expect(service.getToken()).toBe('jwt-token-12345');
  });

  it('should handle learner login and computed signals', () => {
    const learnerUser: User = {
      ...mockUser,
      id: 'learner-1',
      role: 'LEARNER'
    };
    service.setSession('learner-token', learnerUser);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isLearner()).toBe(true);
    expect(service.isCreator()).toBe(false);
    expect(service.dashboardUrl()).toBe('/app/learner/dashboard');
  });

  it('should handle admin login and computed signals', () => {
    const adminUser: User = {
      ...mockUser,
      id: 'admin-1',
      role: 'ADMIN'
    };
    service.setSession('admin-token', adminUser);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.dashboardUrl()).toBe('/admin/dashboard');
  });

  it('should clear session and storage on logout', () => {
    service.setSession('some-token', mockUser);
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
  });
});
