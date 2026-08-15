import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SymbiocreationComponent } from './symbiocreation/symbiocreation.component';
import { IdeaDetailComponent } from './idea-detail/idea-detail.component';
import { ExploreComponent } from './explore/explore.component';
import { ProfileComponent } from './profile/profile.component';
import { AuthGuard } from './guards/auth.guard';
import { CreateSymbioComponent } from './create-symbio/create-symbio.component';
import { EditSymbiocreationDetailComponent } from './edit-symbiocreation-detail/edit-symbiocreation-detail.component';
import { StatsOverviewComponent } from './stats-overview/stats-overview.component';
import { RankingUsersPublicComponent } from './ranking-users-public/ranking-users-public.component';
import { MyOnedotsComponent } from './my-onedots/my-onedots.component';
import { CreateOnedotComponent } from './create-onedot/create-onedot.component';
import { OnedotComponent } from './onedot/onedot.component';
import { FrontpageComponent } from './frontpage/frontpage.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { PublicProfileComponent } from './public-profile/public-profile.component';

const routes: Routes = [
  { path: '', component: FrontpageComponent, pathMatch: 'full' }, // frontpage pública (FrontPage → Login → Intranet)
  // El Dashboard fue reemplazado por Mi Perfil conservando las URLs originales (sin redirect ni barra lateral):
  // cada URL renderiza su componente directo, con el menú superior compartido.
  { path: 'dashboard', redirectTo: 'dashboard/my-symbios', pathMatch: 'full' },
  { path: 'dashboard/my-symbios', component: MiPerfilComponent, canActivate: [AuthGuard] }, // Mi Perfil (nuevo dashboard)
  { path: 'dashboard/my-onedots', component: MyOnedotsComponent, canActivate: [AuthGuard] },
  { path: 'dashboard/stats-overview', component: StatsOverviewComponent, canActivate: [AuthGuard] },
  { path: 'explore', component: ExploreComponent },
  { path: 'perfil/:userId', component: PublicProfileComponent }, // perfil público (sin sesión)
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
