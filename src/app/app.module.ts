import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppMaterialModule } from './app-material.module';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { CloudinaryModule } from '@cloudinary/ng';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS, provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MomentTimezonePickerModule } from 'moment-timezone-picker';
import { LinkyModule } from 'ngx-linky';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SymbiocreationComponent } from './symbiocreation/symbiocreation.component';
import { IdeaDetailComponent } from './idea-detail/idea-detail.component';
import { GraphComponent } from './graph/graph.component';
import { ExploreComponent } from './explore/explore.component';
import { ProfileComponent } from './profile/profile.component';
import { CreateSymbioComponent } from './create-symbio/create-symbio.component';
import { NewGroupDialogComponent } from './new-group-dialog/new-group-dialog.component';
import { EditIdeaDialogComponent } from './edit-idea-dialog/edit-idea-dialog.component';
import { EditGroupNameDialogComponent } from './edit-group-name-dialog/edit-group-name-dialog.component';
import { CameraCaptureDialogComponent } from './camera-capture-dialog/camera-capture-dialog.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { SymbiocreationDetailComponent } from './symbiocreation-detail/symbiocreation-detail.component';
import { EditSymbiocreationDetailComponent } from './edit-symbiocreation-detail/edit-symbiocreation-detail.component';
import { GridSymbiosUserComponent } from './grid-symbios-user/grid-symbios-user.component';
import { ListSymbiosUserComponent } from './list-symbios-user/list-symbios-user.component';
import { IdeaSelectorDialogComponent } from './idea-selector-dialog/idea-selector-dialog.component';
import { NewIdeaConfirmationDialogComponent } from './new-idea-confirmation-dialog/new-idea-confirmation-dialog.component';
import { StatsOverviewComponent } from './stats-overview/stats-overview.component';
import { NavlistComponent } from './navlist/navlist.component';
import { MySymbiocreationsComponent } from './my-symbiocreations/my-symbiocreations.component';
import { LineChartGrowthHistoryComponent } from './line-chart-growth-history/line-chart-growth-history.component';
import { TopSymbiocreationsRankingComponent } from './top-symbiocreations-ranking/top-symbiocreations-ranking.component';
import { TopUsersRankingComponent } from './top-users-ranking/top-users-ranking.component';
import { TrendingTopicsIdeasComponent } from './trending-topics-ideas/trending-topics-ideas.component';
import { RankingUsersPublicComponent } from './ranking-users-public/ranking-users-public.component';
import { SymbiocreationsStatsComponent } from './symbiocreations-stats/symbiocreations-stats.component';
import { CreateOnedotComponent } from './create-onedot/create-onedot.component';
import { MyOnedotsComponent } from './my-onedots/my-onedots.component';
import { OnedotComponent } from './onedot/onedot.component';
import { OnedotGridComponent } from './onedot-grid/onedot-grid.component';
import { ChatgptIdeaSuggestionsComponent } from './chatgpt-idea-suggestions/chatgpt-idea-suggestions.component';
// import { MatSidenavModule } from '@angular/material/sidenav';
// import {MatGridListModule} from '@angular/material/grid-list';
// import {CdkAccordionModule} from '@angular/cdk/accordion';


@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    SymbiocreationComponent,
    IdeaDetailComponent,
    GraphComponent,
    ExploreComponent,
    ProfileComponent,
    CreateSymbioComponent,
    NewGroupDialogComponent,
    EditIdeaDialogComponent,
    EditGroupNameDialogComponent,
    CameraCaptureDialogComponent,
    ConfirmationDialogComponent,
    SymbiocreationDetailComponent,
    EditSymbiocreationDetailComponent,
    GridSymbiosUserComponent,
    ListSymbiosUserComponent,
    IdeaSelectorDialogComponent,
    NewIdeaConfirmationDialogComponent,
    StatsOverviewComponent,
    NavlistComponent,
    MySymbiocreationsComponent,
    LineChartGrowthHistoryComponent,
    TopSymbiocreationsRankingComponent,
    TopUsersRankingComponent,
    TrendingTopicsIdeasComponent,
    RankingUsersPublicComponent,
    SymbiocreationsStatsComponent,
    CreateOnedotComponent,
    MyOnedotsComponent,
    OnedotComponent,
    OnedotGridComponent,
    ChatgptIdeaSuggestionsComponent,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AppMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ClipboardModule,
    CloudinaryModule,
    MatMomentDateModule,
    MomentTimezonePickerModule,
    LinkyModule,
    TranslateModule.forRoot({
      defaultLanguage: 'es',
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new TranslateHttpLoader(http, './assets/i18n/', '.json'),
        deps: [HttpClient]
      }
    }),
    // MatSidenavModule,
    // MatGridListModule,
    // CdkAccordionModule,
  ],
  providers: [
    {provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: {strict: true, useUtc: true}}, provideMomentDateAdapter()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
