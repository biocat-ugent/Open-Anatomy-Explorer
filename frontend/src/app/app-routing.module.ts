import {NgModule} from '@angular/core'
import {RouterModule, Routes} from '@angular/router'
import {HomeComponent} from "./pages/home/home.component"
import {AuthGuard, REQUIRED_ROLE} from "./guards/auth-guard.service"
import {Role} from "./services/role.service"
import {NotFoundComponent} from "./pages/not-found/not-found.component"

const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: '404', component: NotFoundComponent},

  // Lazy loaded routes
  {
    path: 'explorer/:id',
    data: {[REQUIRED_ROLE]: Role.STUDENT},
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/explorer/explorer.component').then(mod => mod.ExplorerComponent)
  },
  {
    path: 'quiz/:quizInviteCode',
    data: {[REQUIRED_ROLE]: Role.STUDENT},
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/quiz-take/quiz-take.component').then(mod => mod.QuizTakeComponent)
  },
  {
    path: 'dashboard',
    data: {[REQUIRED_ROLE]: Role.TEACHER},
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    loadComponent: () => import('./pages/administration/dashboard/dashboard.component').then(mod => mod.DashboardComponent),
    children: [
      {
        path: '',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        pathMatch: 'full',
        redirectTo: 'models'
      },
      {
        path: 'models',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/model-dashboard/model-dashboard.component').then(mod => mod.ModelDashboardComponent)
      },
      {
        path: 'models/:id/edit',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/model-edit/model-edit.component').then(mod => mod.ModelEditComponent)
      },
      {
        path: 'models/create',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/model-create/model-create.component').then(mod => mod.ModelCreateComponent)
      },
      {
        path: 'models/:id/labels',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/model-labels-edit/model-labels-edit.component').then(mod => mod.ModelLabelsEditComponent)
      },
      {
        path: 'models/:id/quizzes',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/quizzes-dashboard/quizzes-dashboard.component').then(mod => mod.QuizzesDashboardComponent)
      },
      {
        path: 'models/:id/quizzes/create',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/quiz-create/quiz-create.component').then(mod => mod.QuizCreateComponent)
      },
      {
        path: 'models/:id/quizzes/:quizId/edit',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/quiz-edit/quiz-edit.component').then(mod => mod.QuizEditComponent)
      },
      {
        path: 'models/:id/quizzes/:quizId/instances',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/quiz-instance-dashboard/quiz-instance-dashboard.component').then(mod => mod.QuizInstanceDashboardComponent)
      },
      {
        path: 'models/:id/quizzes/:quizId/instances/:instanceId/submissions',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/instance-submissions-dashboard/instance-submissions-dashboard.component').then(mod => mod.InstanceSubmissionsDashboardComponent)
      },
      {
        path: 'models/:id/quizzes/:quizId/instances/:instanceId/submissions/:submissionId/details',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/submission-details/submission-details.component').then(mod => mod.SubmissionDetailsComponent)
      },
      {
        path: 'models/:id/quizzes/:quizId/instances/:instanceId/submissions/:submissionId/overlap/:questionId/:labelId',
        data: {[REQUIRED_ROLE]: Role.TEACHER},
        loadComponent: () => import('./pages/administration/submission-vertices-comparison/submission-vertices-comparison.component').then(mod => mod.SubmissionVerticesComparisonComponent)
      }
    ]
  },

  {path: '**', pathMatch: "full", component: NotFoundComponent}
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
