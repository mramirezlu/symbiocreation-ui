import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SymbiocreationComponent } from './symbiocreation/symbiocreation.component';
import { IdeaDetailComponent } from './idea-detail/idea-detail.component';
import { ExploreComponent } from './explore/explore.component';
import { ProfileComponent } from './profile/profile.component';
import { AuthGuard } from './guards/auth.guard';
import { CreateSymbioComponent } from './create-symbio/create-symbio.component';
import { EditSymbiocreationDetailComponent } from './edit-symbiocreation-detail/edit-symbiocreation-detail.component';
import { StatsOverviewComponent } from './stats-overview/stats-overview.component';
import { MySymbiocreationsComponent } from './my-symbiocreations/my-symbiocreations.component';
import { RankingUsersPublicComponent } from './ranking-users-public/ranking-users-public.component';
import { MyOnedotsComponent } from './my-onedots/my-onedots.component';
import { CreateOnedotComponent } from './create-onedot/create-onedot.component';
import { OnedotComponent } from './onedot/onedot.component';
import { FrontpageComponent } from './frontpage/frontpage.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';

const routes: Routes = [
  { path: '', component: FrontpageComponent, pathMatch: 'full' }, // frontpage pública (FrontPage → Login → Intranet)
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], 
    children: [
      { path: '', redirectTo: 'my-symbios', pathMatch: 'full' },
      { path: 'my-symbios', component: MySymbiocreationsComponent },
      { path: 'my-onedots', component: MyOnedotsComponent },
      { path: 'stats-overview', component: StatsOverviewComponent },
    ]
  },
  { path: 'explore', component: ExploreComponent },
  { path: 'mi-perfil', component: MiPerfilComponent, canActivate: [AuthGuard] }, // vista personalizada (requiere sesión)
  { path: 'ranking', component: RankingUsersPublicComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'symbiocreation/:id', component: SymbiocreationComponent, 
    children: [
      { path: 'idea/:idNode', component: IdeaDetailComponent }
    ] 
  },
  { path: 'onedot/:id', component: OnedotComponent },
  { path: 'create', component: CreateSymbioComponent, canActivate: [AuthGuard] },
  { path: 'edit/:id', component: EditSymbiocreationDetailComponent },
  { path: 'create-onedot', component: CreateOnedotComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { initialNavigation: 'disabled' })], // disable initialNavigation for Auth0 to work
  exports: [RouterModule]
})
export class AppRoutingModule { }
