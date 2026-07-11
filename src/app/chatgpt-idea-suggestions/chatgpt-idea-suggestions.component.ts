import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { Idea, IdeaAI } from '../models/symbioTypes';
import { Node } from '../models/forceGraphTypes';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { EditIdeaDialogComponent } from '../edit-idea-dialog/edit-idea-dialog.component';

@Component({
    selector: 'app-chatgpt-idea-suggestions',
    templateUrl: './chatgpt-idea-suggestions.component.html',
    styleUrl: './chatgpt-idea-suggestions.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ChatgptIdeaSuggestionsComponent implements OnInit {

  @Input() symbiocreationId: string;
  @Input() node: Node;

  @Output() changedIdea = new EventEmitter<Idea>();

  isLoadingLlmResponse: boolean = true;
  ideasSuggested: IdeaAI[];          // ideas reales, accionables
  noticeMessage: IdeaAI | null = null; // aviso no accionable (p. ej. "se necesitan más ideas")
  loadError: boolean = false;        // la llamada a la IA falló
  lastSource: 'suggestions' | 'inspiration' = 'suggestions'; // qué recargar al "Generar nuevas ideas"

  constructor(
    public auth: AuthService,
    private symbioService: SymbiocreationService,
    public dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadSuggestions();
  }

  // Sugerencias basadas en las ideas del nodo/grupo actual.
  loadSuggestions(): void {
    this.lastSource = 'suggestions';
    this.run(this.node.children
      ? this.symbioService.getIdeasForGroupFromLlm(this.symbiocreationId, this.node.id)
      : this.symbioService.getIdeasForSymbioFromLlm(this.symbiocreationId));
  }

  // "Busco inspiración": genera 3 ideas basadas solo en el tema de la sesión, sin ideas previas.
  getInspiration(): void {
    this.lastSource = 'inspiration';
    this.run(this.symbioService.getInspirationForSymbioFromLlm(this.symbiocreationId));
  }

  // "Generar nuevas ideas": vuelve a pedir según el último origen usado (sugerencias o inspiración).
  regenerate(): void {
    this.lastSource === 'inspiration' ? this.getInspiration() : this.loadSuggestions();
  }

  // Ejecuta una petición de IA gestionando loading/error y limpiando el estado previo.
  private run(request$: Observable<IdeaAI[]>): void {
    this.isLoadingLlmResponse = true;
    this.loadError = false;
    this.noticeMessage = null;
    this.ideasSuggested = undefined;

    request$.subscribe({
      next: ideas => this.handleResponse(ideas),
      error: () => {
        // B2: sin este callback el spinner giraba indefinidamente ante un error de red/timeout
        this.isLoadingLlmResponse = false;
        this.loadError = true;
      },
    });
  }

  private handleResponse(ideas: IdeaAI[]): void {
    // Estado limpio: al reintentar/inspirar, el aviso o error previo debe desaparecer.
    this.isLoadingLlmResponse = false;
    this.noticeMessage = null;
    this.loadError = false;

    // B1: el backend marca los mensajes informativos con placeholder = true.
    // Se muestran como aviso, nunca como idea accionable.
    if (ideas && ideas.length === 1 && ideas[0].placeholder) {
      this.noticeMessage = ideas[0];
      this.ideasSuggested = [];
      return;
    }

    // Defensa extra: descartar cualquier placeholder que se cuele entre ideas reales.
    this.ideasSuggested = (ideas ?? []).filter(idea => !idea.placeholder);
  }

  openEditIdeaDialog(ideaAi: IdeaAI) {
    if (!this.auth.loggedIn) {
      this.auth.login(`/symbiocreation/${this.symbiocreationId}/idea/${this.node.id}`);
      return;
    }

    const dialogRef = this.dialog.open(EditIdeaDialogComponent, {
      width: '650px',
      data: {
        name: this.node.name,
        idea: {title: ideaAi.title, description: ideaAi.description}
      }
    });

    dialogRef.afterClosed().subscribe(idea => {
      if (idea) {
        this.changedIdea.emit(idea);
      }
    });
  }

}
