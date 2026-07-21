import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Symbiocreation, User } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { AuthService } from '../services/auth.service';
import { concatMap } from 'rxjs/operators';
import { UserService } from '../services/user.service';

import { MatDialog } from '@angular/material/dialog';
import { SharedService } from '../services/shared.service';
import { AnalyticsService } from '../services/analytics.service';
import { NotificationService } from '../services/notification.service';

@Component({
    selector: 'app-my-symbiocreations',
    templateUrl: './my-symbiocreations.component.html',
    styleUrls: ['./my-symbiocreations.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MySymbiocreationsComponent implements OnInit {

  // user stats
  score: number;
  totalSymbiocreations: number;
  totalIdeas: number;
  totalGroupsAsAmbassador: number;

  symbiocreations: Symbiocreation[];
  isModeratorList: boolean[];

  isGridViewOn: boolean;
  totalCount: number;

  constructor(
    private symbioService: SymbiocreationService,
    private userService: UserService,
    private analyticsService: AnalyticsService,
    private auth: AuthService,
    public sharedService: SharedService,
    public dialog: MatDialog,
    private notification: NotificationService
    ) {
    // this.symbiocreations = [];
    this.isModeratorList = [];
  }

  ngOnInit(): void {
    this.sharedService.nextIsLoading(true);
    let fetchedUser: User = null;

    this.auth.userProfile$.pipe(
      concatMap(user => this.userService.getUserByEmail(user.email)),
      concatMap(appUser => {
        fetchedUser = appUser;
        this.isGridViewOn = appUser.isGridViewOn;
        // return this.symbioService.countSymbiocreationsByUser(u.id);
        return this.analyticsService.getCountsSummaryUser(appUser.id);
      }),
      concatMap(countsMap => {
        this.totalCount = countsMap.symbiocreations;

        this.score = countsMap.score;
        this.totalSymbiocreations = countsMap.symbiocreations;
        this.totalIdeas = countsMap.ideas;
        this.totalGroupsAsAmbassador = countsMap.groupsAsAmbassador;

        return this.symbioService.getMySymbiocreations(fetchedUser.id, 0); // first page
      }),
    ).subscribe({
      next: symbios => {
        this.symbiocreations = symbios;
        // order has to be done in frontend bc of rx backend ?????
        this.symbiocreations.sort((a, b) => a.lastModified > b.lastModified ? -1 : (a.lastModified < b.lastModified ? 1 : 0));
        this.isModeratorList = this.createIsModeratorList(fetchedUser);
        this.sharedService.nextIsLoading(false);
      },
      error: err => {
        // Corta el spinner global y avisa; el error crudo queda en Network/consola para depurar.
        console.error('MySymbiocreations load error', err);
        this.sharedService.nextIsLoading(false);
        this.notification.showError('COMMON.ERROR_GENERIC');
      },
    });
  }

  createIsModeratorList(user: User): boolean[] {
    let isModeratorList = [];
    for (let i = 0; i < this.symbiocreations.length; i++) {
      isModeratorList.push(false);
    }

    let i = 0;
    for (let s of this.symbiocreations) {
      for (let p of s.participants) {
        if (p.user.email === user.email) {
          if (p.isModerator) isModeratorList[i] = true;
          break;
        }
      }
      i++;
    }
    return isModeratorList;
  }

  toggleViewMode() {
    this.isGridViewOn = !this.isGridViewOn;

    this.auth.userProfile$.pipe(
      concatMap(usrProfile => this.userService.getUserByEmail(usrProfile.email)),
      concatMap(user => {
        user.isGridViewOn = this.isGridViewOn;
        return this.userService.updateUser(user);
      })
    ).subscribe();
  }

  onPageFired(event) {
    this.sharedService.nextIsLoading(true);

    let fetchedUser: User = null;

    this.auth.userProfile$.pipe(
      concatMap(usrProfile => this.userService.getUserByEmail(usrProfile.email)),
      concatMap(user => {
        fetchedUser = user;
        return this.symbioService.getMySymbiocreations(user.id, event.pageIndex);
      }),
    ).subscribe(
      symbios => {
        this.symbiocreations = symbios;
        this.symbiocreations.sort((a, b) => a.lastModified > b.lastModified ? -1 : (a.lastModified < b.lastModified ? 1 : 0));
        this.isModeratorList = this.createIsModeratorList(fetchedUser);
        this.sharedService.nextIsLoading(false);
      }
    );
  }
}