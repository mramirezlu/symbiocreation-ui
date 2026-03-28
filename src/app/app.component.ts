import { Component, ChangeDetectorRef, AfterViewChecked, OnInit } from '@angular/core';
import { User } from './models/symbioTypes';
import { AuthService } from './services/auth.service';
import { SharedService } from './services/shared.service';

import { concatMap } from 'rxjs/operators';
import { UserService } from './services/user.service';
import { EMPTY } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewChecked, OnInit {

  title: string = 'Simbiocreación';
  toggleVisible: boolean = false;
  isMenuMobileOpen: boolean = false;
  currentLang: string = 'es';

  constructor(
    public auth: AuthService,
    public sharedService: SharedService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    public translate: TranslateService
  ) {
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');

    const savedLang = localStorage.getItem('lang');
    if (savedLang && ['es', 'en'].includes(savedLang)) {
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.translate.use('es');
    }
  }

  switchLanguage(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  ngOnInit(): void {
    this.auth.isAuthenticated$
      .pipe(
        concatMap((isAuthenticated: boolean) => {
          console.log("user is authenticated: " + isAuthenticated);
          return isAuthenticated ? this.auth.userProfile$ : EMPTY;
        }),
        concatMap(userProfile => userProfile ? this.userService.getUserByEmail(userProfile.email) : EMPTY),
        concatMap((appUser: User) => appUser ? this.userService.recomputeScoreAndUpdate(appUser.id) : EMPTY),
      ).subscribe((appUser: User) => {
        if (appUser) {
          console.log("Logged in user: " + JSON.stringify(appUser));
          console.log(`Score of user ${appUser.id} was recomputed`);

          this.sharedService.nextAppUser(appUser);
        }
      });
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  toggleMenu() {
    
  }

  openSidenav(){
    
  }

  OpenGroupsSidenav() {
    this.isMenuMobileOpen = !this.isMenuMobileOpen;
  }

  closeSidebarGroupsBtn() {
    this.isMenuMobileOpen = false;
  }
}
