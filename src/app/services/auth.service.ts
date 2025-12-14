import { Injectable } from '@angular/core';
import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import { from, of, Observable, BehaviorSubject, combineLatest, throwError } from 'rxjs';
import { tap, catchError, concatMap, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { UserService } from './user.service';
import { User } from '../models/symbioTypes';
import { SharedService } from './shared.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Create an observable of Auth0 instance of client
  auth0Client$ = (from(
    createAuth0Client({
      domain: environment.auth0.domain,
      client_id: environment.auth0.clientId,
      redirect_uri: `${window.location.origin}`
    })
  ) as Observable<Auth0Client>).pipe(
    shareReplay(1), // Every subscription receives the same shared value
    catchError(err => throwError(err))
  );

  // Define observables for SDK methods that return promises by default
  // For each Auth0 SDK method, first ensure the client instance is ready
  // concatMap: Using the client instance, call SDK method; SDK returns a promise
  // from: Convert that resulting promise into an observable
  isAuthenticated$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) => from(client.isAuthenticated())),
    tap(res => this.loggedIn = res)
  );

  handleRedirectCallback$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) => from(client.handleRedirectCallback()))
  );

  // Create subject and public observable of user profile data
  private userProfileSubject$ = new BehaviorSubject<any>(null);
  userProfile$ = this.userProfileSubject$.asObservable();

  // Create a local property for login status
  loggedIn: boolean = null;

  constructor(
    private router: Router,
    private location: Location,
    private userService: UserService,
    private sharedService: SharedService) {
    // On initial load, check authentication state with authorization server
    // Set up local auth streams if user is already authenticated
    this.localAuthSetup();
    // Handle redirect from Auth0 login
    this.handleAuthCallback();
  }

  // When calling, options can be passed if desired
  // https://auth0.github.io/auth0-spa-js/classes/auth0client.html#getuser
  getUser$(options?): Observable<any> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) => from(client.getUser(options))),
      tap(user => this.userProfileSubject$.next(user))
    );
  }

  // The localAuthSetup() method uses the auth0-spa-js SDK to check if the user is still logged in with the authorization server after a refresh or reload.
  private localAuthSetup() {
    // This should only be called on app initialization
    // Set up local authentication streams
    const checkAuth$ = this.isAuthenticated$.pipe(
      concatMap((loggedIn: boolean) => {
        if (loggedIn) {
          // If authenticated, get user and set in app
          // NOTE: you could pass options here if needed
          return this.getUser$();
        }
        // If not authenticated, return stream that emits 'false'
        return of(loggedIn);
      })
    );
    checkAuth$.subscribe(() => {
      // Navigate to current path or default route after auth check
      // This handles the case when initialNavigation is disabled
      const path = this.location.path();
      if (path && !path.includes('code=')) {
        this.router.navigateByUrl(path);
      } else if (!path) {
        this.router.navigateByUrl('/');
      }
    });
  }

  login(redirectPath: string = '/') {
    // A desired redirect path can be passed to login method
    // (e.g., from a route guard)
    // Ensure Auth0 client instance exists
    this.auth0Client$.subscribe((client: Auth0Client) => {
      // Call method to log in
      client.loginWithRedirect({
        redirect_uri: `${window.location.origin}`,
        appState: { target: redirectPath }
      });
    });
  }

  private handleAuthCallback() {
    // Call when app reloads after user logs in with Auth0
    const params = window.location.search;
    //console.log('params: ', params);

    if (params.includes('code=') && params.includes('state=')) {
      let usr;
      let targetRoute: string; // Path to redirect to after login is processed

      const authComplete$ = this.handleRedirectCallback$.pipe(
        // Have client, now call method to handle auth callback redirect
        tap(cbRes => {
          // Get and set target redirect route from callback results
          //console.log('redirect object: ', cbRes.appState);
          targetRoute = cbRes.appState && cbRes.appState.target ? cbRes.appState.target : '/';
        }),
        concatMap(() => {
          // Redirect callback complete; get user and login status
          return combineLatest([
            this.getUser$(),
            this.isAuthenticated$
          ]);
        }),
        concatMap(([user, loggedIn]) => {
          usr = user;
          return this.userService.getUserByEmail(user.email);
        })
      );

      authComplete$.subscribe(u => { // is null if user is new
        // update/create user
        if (!u) { // if no object returned
          console.log('new user!');

          // create new user
          let newUser: User = {name: usr.name, firstName: usr.given_name, lastName: usr.family_name,
                                email: usr.email, pictureUrl: usr.picture, role: 'USER'};

          this.userService.createUser(newUser).subscribe(createdUser => {
            this.sharedService.nextAppUser(createdUser);
            this.router.navigate([targetRoute]);
          });
        } else {
          console.log('returning user!');

          if (usr.name) u.name = usr.name;
          if (usr.given_name) u.firstName = usr.given_name;
          if (usr.family_name) u.lastName = usr.family_name;
          if (usr.picture) u.pictureUrl = usr.picture;

          this.userService.updateUser(u).subscribe(updatedUser => {
            // console.log(updatedUser);
            this.sharedService.nextAppUser(updatedUser);
            this.router.navigate([targetRoute]);
          });
        }
      });

      // Subscribe to authentication completion observable
      // Response will be an array of user and login status
      /*authComplete$.subscribe(([user, loggedIn]) => {
        // Redirect to target route after callback processing
        this.router.navigate([targetRoute]);
      }); */
    } else {
      //console.log('location: ', this.location.path());
      const path = this.location.path();
      this.router.navigateByUrl(path || '/');
    }
  }

  logout() {
    // Ensure Auth0 client instance exists
    this.auth0Client$.subscribe((client: Auth0Client) => {
      // Call method to log out
      client.logout({
        client_id: environment.auth0.clientId,
        returnTo: `${window.location.origin}`
      });
    });
  }

}
