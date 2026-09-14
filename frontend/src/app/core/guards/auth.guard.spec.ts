import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard, noAuthGuard, adminGuard, creatorGuard, learnerGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';
import { User } from '../models/user.model';

describe('Route Guards', () => {
  let mockAuthService: any;
  let router: Router;

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/app/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      currentUser: signal<User | null>(null),
      isAuthenticated: () => false,
      getToken: () => null,
      isAdmin: () => false,
      isCreator: () => false,
      isLearner: () => false,
      dashboardUrl: () => '/app/dashboard'
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('should redirect unauthenticated user to /connexion with returnUrl', () => {
      mockAuthService.isAuthenticated = () => false;
      mockAuthService.getToken = () => null;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toContain('/connexion');
      expect(urlTree.queryParams.returnUrl).toBe('/app/dashboard');
    });

    it('should allow access if user is authenticated', () => {
      mockAuthService.isAuthenticated = () => true;

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should allow access if user has token', () => {
      mockAuthService.isAuthenticated = () => false;
      mockAuthService.getToken = () => 'valid-token';

      const result = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });
  });

  describe('noAuthGuard', () => {
    it('should allow unauthenticated visitor to visit login/signup', () => {
      mockAuthService.isAuthenticated = () => false;
      mockAuthService.getToken = () => null;

      const result = TestBed.runInInjectionContext(() => noAuthGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should redirect authenticated user to dashboard', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.dashboardUrl = () => '/app/dashboard';

      const result = TestBed.runInInjectionContext(() => noAuthGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toBe('/app/dashboard');
    });
  });

  describe('adminGuard', () => {
    it('should redirect unauthenticated user to /connexion', () => {
      mockAuthService.isAuthenticated = () => false;
      mockAuthService.getToken = () => null;

      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toContain('/connexion');
    });

    it('should allow admin user to access admin space', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isAdmin = () => true;

      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should redirect non-admin user to their dashboard', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isAdmin = () => false;
      mockAuthService.dashboardUrl = () => '/app/dashboard';

      const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toBe('/app/dashboard');
    });
  });

  describe('creatorGuard', () => {
    it('should allow creator user', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isCreator = () => true;

      const result = TestBed.runInInjectionContext(() => creatorGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should allow admin user into creator routes', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isAdmin = () => true;

      const result = TestBed.runInInjectionContext(() => creatorGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should redirect learner trying to access creator routes', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isCreator = () => false;
      mockAuthService.isAdmin = () => false;

      const result = TestBed.runInInjectionContext(() => creatorGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toBe('/app/learner/dashboard');
    });
  });

  describe('learnerGuard', () => {
    it('should allow learner user', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isLearner = () => true;

      const result = TestBed.runInInjectionContext(() => learnerGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should allow admin user into learner routes', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isAdmin = () => true;

      const result = TestBed.runInInjectionContext(() => learnerGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });

    it('should redirect creator trying to access learner routes', () => {
      mockAuthService.isAuthenticated = () => true;
      mockAuthService.isLearner = () => false;
      mockAuthService.isAdmin = () => false;

      const result = TestBed.runInInjectionContext(() => learnerGuard(dummyRoute, dummyState));
      expect(result).not.toBe(true);
      const urlTree = result as any;
      expect(urlTree.toString()).toBe('/app/dashboard');
    });
  });
});
