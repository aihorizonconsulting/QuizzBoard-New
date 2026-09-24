import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { authGuard, noAuthGuard, adminGuard, creatorGuard, learnerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public Routes with unified Header and Footer
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/public/landing/landing.component').then(m => m.LandingComponent)
      },
      {
        path: 'tarifs',
        loadComponent: () => import('./pages/public/pricing/pricing.component').then(m => m.PricingComponent)
      },
      {
        path: 'decouvrir',
        loadComponent: () => import('./pages/public/explore/explore.component').then(m => m.ExploreComponent)
      },
      {
        path: 'explore',
        redirectTo: 'decouvrir',
        pathMatch: 'full'
      },
      {
        path: 'connexion',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/public/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'login',
        redirectTo: 'connexion',
        pathMatch: 'full'
      },
      {
        path: 'inscription',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/public/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: 'signup',
        redirectTo: 'inscription',
        pathMatch: 'full'
      },
      {
        path: 'quiz/join',
        redirectTo: '',
        pathMatch: 'full'
      },
      {
        path: 'invitation/:token',
        loadComponent: () => import('./pages/public/invitation/invitation-accept.component').then(m => m.InvitationAcceptComponent)
      },
      {
        path: 'mot-de-passe-oublie',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/public/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reinitialisation-mot-de-passe',
        loadComponent: () => import('./pages/public/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      }
    ]
  },

  // Legacy quiz/play route now redirected (quizzes are played inside QuizModalPlayer pop-up)
  {
    path: 'quiz/play/:id',
    redirectTo: ''
  },

  // Redirect live/host to stay inside AppLayoutComponent (with Sidebar & Topbar)
  {
    path: 'live/host/:id',
    redirectTo: 'app/live/host/:id'
  },
  {
    path: 'live/host',
    redirectTo: 'app/live/host'
  },

  // Authenticated App Workspace (Navy Sidebar + Header) - Protected by authGuard
  {
    path: 'app',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/user-profile.component').then(m => m.UserProfileComponent)
      },
      // Creator Space - Protected by creatorGuard
      {
        path: 'dashboard',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'quizzes',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/quiz-list/quiz-list.component').then(m => m.QuizListComponent)
      },
      {
        path: 'courses',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/course-list/course-list.component').then(m => m.CourseListComponent)
      },
      {
        path: 'courses/:id',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/course-detail/course-detail.component').then(m => m.CourseDetailComponent)
      },
      {
        path: 'live',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/live-manage/live-manage.component').then(m => m.LiveManageComponent)
      },
      {
        path: 'classes',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/class-manage/class-manage.component').then(m => m.ClassManageComponent)
      },
      {
        path: 'promotions',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/promotions/promotions.component').then(m => m.PromotionsComponent)
      },
      {
        path: 'quizzes/create',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/quiz-create/quiz-create.component').then(m => m.QuizCreateComponent)
      },
      {
        path: 'quizzes/edit/:id',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/quiz-create/quiz-create.component').then(m => m.QuizCreateComponent)
      },
      {
        path: 'live/host/:id',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/live-host/live-host.component').then(m => m.LiveHostComponent)
      },
      {
        path: 'live/host',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/live-host/live-host.component').then(m => m.LiveHostComponent)
      },
      {
        path: 'communities',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/community-manage/community-manage.component').then(m => m.CommunityManageComponent)
      },
      {
        path: 'subscription',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/subscription/subscription.component').then(m => m.CreatorSubscriptionComponent)
      },
      {
        path: 'subscription/callback',
        canActivate: [creatorGuard],
        loadComponent: () => import('./pages/creator/subscription/payment-callback.component').then(m => m.PaymentCallbackComponent)
      },

      // Learner Space - Protected by learnerGuard
      {
        path: 'learner/dashboard',
        canActivate: [learnerGuard],
        loadComponent: () => import('./pages/learner/dashboard/learner-dashboard.component').then(m => m.LearnerDashboardComponent)
      },
      {
        path: 'learner/classes',
        canActivate: [learnerGuard],
        loadComponent: () => import('./pages/learner/classes/learner-classes.component').then(m => m.LearnerClassesComponent)
      },
      {
        path: 'learner/certificates',
        canActivate: [learnerGuard],
        loadComponent: () => import('./pages/learner/certificates/certificates.component').then(m => m.CertificatesComponent)
      },
      {
        path: 'learner/communities',
        canActivate: [learnerGuard],
        loadComponent: () => import('./pages/learner/communities/learner-communities.component').then(m => m.LearnerCommunitiesComponent)
      },

      // Explorer des Quiz Publics dans l'espace App (accessible à tous les authentifiés)
      {
        path: 'explore',
        loadComponent: () => import('./pages/public/explore/explore.component').then(m => m.ExploreComponent)
      },
      {
        path: 'decouvrir',
        loadComponent: () => import('./pages/public/explore/explore.component').then(m => m.ExploreComponent)
      }
    ]
  },

  // SuperAdmin Space - Protected by adminGuard
  {
    path: 'admin',
    component: AppLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'content',
        loadComponent: () => import('./pages/admin/admin-content/admin-content.component').then(m => m.AdminContentComponent)
      },
      {
        path: 'finances',
        loadComponent: () => import('./pages/admin/admin-finances/admin-finances.component').then(m => m.AdminFinancesComponent)
      },
      {
        path: 'system',
        loadComponent: () => import('./pages/admin/admin-system/admin-system.component').then(m => m.AdminSystemComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/admin/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent)
      }
    ]
  },

  // Fallback
  {
    path: '**',
    redirectTo: ''
  }
];
