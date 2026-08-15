import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { User } from '../models/symbioTypes';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    apiUrl: string = environment.resApiUrl;
    headers = new HttpHeaders().set('Content-Type', 'application/json');

    constructor(private http: HttpClient) { }

    // create
    createUser(data: User): Observable<User> {
        let API_URL = `${this.apiUrl}/users`;
        return this.http.post<User>(API_URL, data)
            .pipe(
                catchError(this.error)
            );
    }

    // read
    getUser(idUser: string): Observable<User> {
        let API_URL = `${this.apiUrl}/users/${idUser}`;
        return this.http.get<User>(API_URL);
    }

    getUserByEmail(email: string): Observable<User> {
        let API_URL = `${this.apiUrl}/users/getByEmail/${email}`;
        return this.http.get<User>(API_URL);
    }

    // Perfil público: solo nombres + foto + puntaje (el backend no expone el email).
    getUserPublic(idUser: string): Observable<User> {
        let API_URL = `${this.apiUrl}/users/${idUser}/public`;
        return this.http.get<User>(API_URL);
    }

    // update
    updateUser(data: User): Observable<User> {
        let API_URL = `${this.apiUrl}/users`;
        return this.http.put<User>(API_URL, data, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // recompute and update score of a user
    recomputeScoreAndUpdate(idUser: string): Observable<User> {
        let API_URL = `${this.apiUrl}/users/${idUser}/recompute-score-and-update`;
        return this.http.patch<User>(API_URL, {}, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // Handle Errors 
    error(error: HttpErrorResponse) {
        let errorMessage = '';
        if (error.error instanceof ErrorEvent) {
            errorMessage = error.error.message;
        } else {
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }
        console.log(errorMessage);
        return throwError(errorMessage);
    }

}