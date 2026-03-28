import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { Symbiocreation, Participant, Comment, User, IdeaAI } from '../models/symbioTypes';
import { Node } from '../models/forceGraphTypes';

@Injectable({
    providedIn: 'root',
})
export class SymbiocreationService {

    apiUrl: string = environment.resApiUrl;
    headers = new HttpHeaders().set('Content-Type', 'application/json');

    constructor(
        private http: HttpClient
    ) { }

    // create
    createSymbiocreation(data: Symbiocreation): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations`;
        return this.http.post<Symbiocreation>(API_URL, data)
            .pipe(
                catchError(this.error)
            );
    }

    // find
    getSymbiocreation(id: string): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${id}`;
        return this.http.get<Symbiocreation>(API_URL);
    }

    // find mine
    // TODO: shouldn't include any userId 
    getMySymbiocreations(userId: string, page: number): Observable<Symbiocreation[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/getMine/${userId}/${page}`;
        return this.http.get<Symbiocreation[]>(API_URL);
    }

    // find all public symbiocreations
    getAllPublicSymbiocreations(page: number, name?: string): Observable<Symbiocreation[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/getAllPublic/${page}`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<Symbiocreation[]>(API_URL);
    }

    // find all upcoming symbiocreations
    getUpcomingPublicSymbiocreations(page: number, name?: string): Observable<Symbiocreation[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/getUpcomingPublic/${page}`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<Symbiocreation[]>(API_URL);
    }

    // find all past symbiocreations
    getPastPublicSymbiocreations(page: number, name?: string): Observable<Symbiocreation[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/getPastPublic/${page}`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<Symbiocreation[]>(API_URL);
    }

    countSymbiocreationsByUser(userId: string): Observable<number> {
        let API_URL = `${this.apiUrl}/symbiocreations/countByUser/${userId}`;
        return this.http.get<number>(API_URL);
    }

    countPublicSymbiocreations(name?: string): Observable<number> {
        let API_URL = `${this.apiUrl}/symbiocreations/countPublic`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<number>(API_URL);
    }

    countPastPublicSymbiocreations(name?: string): Observable<number> {
        let API_URL = `${this.apiUrl}/symbiocreations/countPastPublic`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<number>(API_URL);
    }

    countUpcomingPublicSymbiocreations(name?: string): Observable<number> {
        let API_URL = `${this.apiUrl}/symbiocreations/countUpcomingPublic`;
        if (name) {
            API_URL += `?name=${encodeURIComponent(name)}`;
        }
        return this.http.get<number>(API_URL);
    }

    // update
    /*updateSymbiocreation(data: Symbiocreation): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations`;
        return this.http.put<Symbiocreation>(API_URL, data, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }*/

    // update name
    updateSymbiocreationName(data: Symbiocreation): Observable<void> {
        let API_URL = `${this.apiUrl}/symbiocreations/${data.id}/updateName`;
        return this.http.put<void>(API_URL, data, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // update info
    updateSymbiocreationInfo(data: Symbiocreation): Observable<void> {
        let API_URL = `${this.apiUrl}/symbiocreations/${data.id}/updateInfo`;
        return this.http.put<void>(API_URL, data, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // delete
    deleteSymbiocreation(id: string): Observable<void> {
        let API_URL = `${this.apiUrl}/symbiocreations/${id}`;
        return this.http.delete<void>(API_URL)
            .pipe(
                catchError(this.error)
            );
    }

    // change idea of node
    updateNodeIdea(symbioId: string, newNode: Node): Observable<Node> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/updateNodeIdea`;
        return this.http.put<Node>(API_URL, newNode, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // change name of node
    updateNodeName(symbioId: string, newNode: Node): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/updateNodeName`;
        return this.http.put<Symbiocreation>(API_URL, newNode, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // find node by id
    getNodeById(symbioId: string, nodeId: string): Observable<Node> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/getNode/${nodeId}`;
        return this.http.get<Node>(API_URL);
    }

    // get all nodes associated to a user id
    getNodesByUserId(symbioId: string, userId: string): Observable<Node[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/getNodesByUserId/${userId}`;
        return this.http.get<Node[]>(API_URL);
    }

    // create a new comment of an idea
    createCommentOfIdea(symbioId: string, nodeId: string, comment: Comment): Observable<Comment> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/createCommentOfIdea/${nodeId}`;
        return this.http.put<Comment>(API_URL, comment, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    createParticipant(symbioId: string, p: Participant): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/createParticipant`;
        return this.http.post<Symbiocreation>(API_URL, p)
            .pipe(
                catchError(this.error)
            );
    }

    createUserNode(symbioId: string, user: User): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/createUserNode`;
        let nodeName = '';
        if (user.name) nodeName = user.name;
        if (user.firstName && user.lastName) nodeName = user.firstName + ' ' + user.lastName;
        
        const node: Node = {u_id: user.id, role: 'participant', name: nodeName}; // nodeId is set in backend
        
        return this.http.post<Symbiocreation>(API_URL, node)
            .pipe(
                catchError(this.error)
            );
    }

    /*
    createGroupNode(symbioId: string, n: Node): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/createGroupNode`;
        return this.http.post<Symbiocreation>(API_URL, n)
            .pipe(
                catchError(this.error)
            );
    }
    */

    // nextLevelNode has name 
    createNextLevelGroup(symbioId: string, childNodeId: string, nextLevelNode: Node): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/createNextLevelGroup/${childNodeId}`;
        return this.http.post<Symbiocreation>(API_URL, nextLevelNode)
            .pipe(
                catchError(this.error)
            );
    }

    setParentNode(symbioId: string, childId: string, parentId: string): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/setParentNode/${childId}/${parentId}`;
        return this.http.get<Symbiocreation>(API_URL)
            .pipe(
                catchError(this.error)
            );
    }

    deleteNode(symbioId: string, nodeId: string): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/deleteNode/${nodeId}`;
        return this.http.delete<Symbiocreation>(API_URL)
            .pipe(
                catchError(this.error)
            );
    }

    // set participant as moderator
    setParticipantAsModerator(symbioId: string, participant: Participant): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/setParticipantAsModerator`;
        return this.http.put<Symbiocreation>(API_URL, participant, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // node has id and new role
    updateUserNodeRole(symbioId: string, node: Node): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/updateUserNodeRole`;
        return this.http.put<Symbiocreation>(API_URL, node, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    // participant has the new value for isModerator
    updateParticipantIsModerator(symbioId: string, participant: Participant): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/setParticipantIsModerator`;
        return this.http.put<Symbiocreation>(API_URL, participant, {headers: this.headers})
            .pipe(
                catchError(this.error)
            );
    }

    deleteParticipant(symbioId: string, u_id: string): Observable<Symbiocreation> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/deleteParticipant/${u_id}`;
        return this.http.delete<Symbiocreation>(API_URL)
            .pipe(
                catchError(this.error)
            );
    }

    getIdeasForSymbioFromLlm(symbioId: string): Observable<IdeaAI[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/getIdeasFromAI`;
        return this.http.get<IdeaAI[]>(API_URL);
    }

    getIdeasForGroupFromLlm(symbioId: string, nodeId: string): Observable<IdeaAI[]> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/getIdeasFromAI/${nodeId}`;
        return this.http.get<IdeaAI[]>(API_URL);
    }

    getImageForIdeaFromLlm(title: string, description: string): Observable<Blob> {
        let API_URL = `${this.apiUrl}/symbiocreations/getImageFromAI`;

        return this.http.post(API_URL, { title: title, description: description }, { responseType: "blob", headers: {'Accept': 'image/png'} })
            .pipe(
                catchError(this.error)
            );
    }

    downloadParticipantsData(symbioId: string): Observable<Blob> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/export-participants-data`;
        return this.http.get(API_URL, { responseType: "blob", headers: {'Accept': 'text/csv'} }) 
                .pipe(
                    catchError(this.error)
                );
    }

    downloadAllData(symbioId: string): Observable<Blob> {
        let API_URL = `${this.apiUrl}/symbiocreations/${symbioId}/export-all-data`;
        return this.http.get(API_URL, {responseType: "blob", headers: {'Accept': 'text/csv'}})
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