import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { SidenavService } from '../services/sidenav.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Node } from '../models/forceGraphTypes';
import { Comment, Idea, User } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';
import { concatMap } from 'rxjs/operators';
import { from } from 'rxjs';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { EditIdeaDialogComponent } from '../edit-idea-dialog/edit-idea-dialog.component';
import { ChatgptIdeaSuggestionsComponent } from '../chatgpt-idea-suggestions/chatgpt-idea-suggestions.component';
import { ImageService } from '../services/image.service';
import { CloudinaryImage } from '@cloudinary/url-gen';

import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity';
import { FocusOn } from "@cloudinary/url-gen/qualifiers/focusOn";
import { fill } from '@cloudinary/url-gen/actions/resize';

@Component({
    selector: 'app-idea-detail',
    templateUrl: './idea-detail.component.html',
    styleUrls: ['./idea-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class IdeaDetailComponent implements OnInit, AfterViewInit {

  appUser: User;
  idSymbio: string;

  node: Node;

  rating: number = 3.5;
  comment: string = '';
  hiddenCommentButtons: boolean = true;
  showAiSuggestedIdeas = false;
  @ViewChild(ChatgptIdeaSuggestionsComponent) aiSuggestions?: ChatgptIdeaSuggestionsComponent;

  // Carrousel
  @ViewChild('carouselTrack', { static: false }) carouselTrack: ElementRef;
  currentIndex: number = 0;
  isDragging: boolean = false;
  startPosition: number = 0;
  currentTranslate: number = 0;
  prevTranslate: number = 0;

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    public sidenavService: SidenavService,
    private symbioService: SymbiocreationService,
    private auth: AuthService,
    public sharedService: SharedService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private imageService: ImageService,
    public renderer: Renderer2,
    ) {}

  ngOnInit(): void {
    this.subscribeToParams();
    
    /*this.sharedService.sessionIsModerator$.subscribe(isModerator => {
      if (isModerator) this.sessionIsModerator = isModerator;
    }); */
  }

  ngAfterViewInit() {
    setTimeout(() => this.sidenavService.open(), 0); // to allow sidenav to be injected properly
  }

  subscribeToParams() {
    this.sharedService.appUser$.subscribe(appUser => {
      this.appUser = appUser;
      this.appUser.cloudinaryImage = this.getThumbnailFromUrl(this.appUser.pictureUrl);
    });

    this.idSymbio = this.route.parent.snapshot.paramMap.get('id');

    this.route.params.pipe(
      concatMap(routeParams => this.symbioService.getNodeById(this.idSymbio, routeParams.idNode))
    )
    .subscribe(node => { // node injected w user
      this.showAiSuggestedIdeas = false;
      this.node = node;

      if (this.node.idea?.imgPublicIds) {
        this.node.idea.cloudinaryImages = this.toCloudinaryImages(this.node.idea.imgPublicIds);
      }
      if (this.node.idea?.comments) {
        this.node.idea.comments.forEach(comment => {
          comment.author.cloudinaryImage = this.getThumbnailFromUrl(comment.author.pictureUrl);
        });
      }
    });
  }

  // Genera ideas con IA. Si el panel ya está abierto, el mismo botón regenera (respeta el origen: sugerencias o inspiración).
  generateAiIdeas(): void {
    if (this.showAiSuggestedIdeas && this.aiSuggestions) {
      this.aiSuggestions.regenerate();
    } else {
      this.showAiSuggestedIdeas = true; // primera vez: el panel carga en su ngOnInit
    }
  }

  toggleFullscreen() {
    this.sidenavService.toggleFullscreen();
  }

  closeIdeaDetail() {
    const closed$ = from(this.sidenavService.close());
    closed$.subscribe(res => {
      this.router.navigate(['.'], {relativeTo: this.route.parent});
      //this.sharedService.nextDeselectedNodes([this.node]);
    }); // to avoid blank sidenav on closing
  }

  openEditIdeaDialog() {
    if (!this.appUser) {
      const ideaId = this.route.snapshot.params.idNode;
      this.auth.login(`/symbiocreation/${this.idSymbio}/idea/${ideaId}`);
      return;
    }

    const dialogRef = this.dialog.open(EditIdeaDialogComponent, {
      width: '650px',
      data: {
        name: this.node.name,
        idea: structuredClone(this.node.idea) // deep copy
      }
    });

    dialogRef.afterClosed().subscribe(idea => {
      if (idea) {
        this.node.idea = idea;
        
        if (this.node.idea.imgPublicIds) {
          this.node.idea.cloudinaryImages = this.toCloudinaryImages(this.node.idea.imgPublicIds);
        }
        if (this.node.idea.comments) {
          this.node.idea.comments.forEach(comment => {
            comment.author.cloudinaryImage = this.getThumbnailFromUrl(comment.author.pictureUrl);
          });
        }

        this.symbioService.updateNodeIdea(this.idSymbio, this.node)
          .subscribe(res => {
            this._snackBar.open('Se registró la idea correctamente.', 'ok', {
              duration: 2000,
            });
          });
      }
    });
  }

  onIdeaChanged(idea: Idea) {
    this.showAiSuggestedIdeas = false;
    this.node.idea = idea;
        
    if (this.node.idea.imgPublicIds) {
      this.node.idea.cloudinaryImages = this.toCloudinaryImages(this.node.idea.imgPublicIds);
    }
    if (this.node.idea.comments) {
      this.node.idea.comments.forEach(comment => {
        comment.author.cloudinaryImage = this.getThumbnailFromUrl(comment.author.pictureUrl);
      });
    }

    this.symbioService.updateNodeIdea(this.idSymbio, this.node)
      .subscribe(res => {
        this._snackBar.open('Se registró la idea correctamente.', 'ok', {
          duration: 2000,
        });
      });
  }

  toCloudinaryImages(publicIds: string[]): CloudinaryImage[] {
    return publicIds.map(publicId => this.imageService.getImage(publicId).format('auto').quality('auto'));
  }

  onRateChange(rating: number) {
    
  }

  cancelCommentPost() {
    this.comment = '';
    this.hiddenCommentButtons = true;
  }

  postComment() {
    const newComment: Comment = {u_id: this.appUser.id, content: this.comment};

    this.symbioService.createCommentOfIdea(this.idSymbio, this.node.id, newComment)
      .subscribe(comment => {
        comment.author.cloudinaryImage = this.getThumbnailFromUrl(comment.author.pictureUrl);

        if (!this.node.idea.comments) {
          this.node.idea.comments = [];
        }
        this.node.idea.comments.push(comment);
        this.comment = '';
        this._snackBar.open('Se registró tu comentario correctamente.', 'ok', {
          duration: 2000,
        });
      });
  }

  moveLeft() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateCarouselPosition(true);
    }
  }

  moveRight() {
    const items = this.carouselTrack.nativeElement.children.length;
    if (this.currentIndex < items - 1) {
      this.currentIndex++;
      this.updateCarouselPosition(true);
    }
  }

  updateCarouselPosition(addTransition: boolean) {
    const width = this.carouselTrack.nativeElement.offsetWidth;
    this.currentTranslate = -this.currentIndex * width;
    
    // Añade la clase de transición solo si se está usando los botones
    if (addTransition) {
      this.renderer.addClass(this.carouselTrack.nativeElement, 'with-transition');
    } else {
      this.renderer.removeClass(this.carouselTrack.nativeElement, 'with-transition');
    }

    this.carouselTrack.nativeElement.style.transform = `translateX(${this.currentTranslate}px)`;
  }

  getPositionX(event: MouseEvent | TouchEvent): number {
    return event instanceof MouseEvent ? event.pageX : event.touches[0].clientX;
  }

  getThumbnailFromUrl(url: string): CloudinaryImage {
    return this.imageService.getImage(url)
              .setDeliveryType('fetch')
              .format('auto')
              .resize(fill().width(120).height(120).gravity(focusOn(FocusOn.face()))) 
              .roundCorners(byRadius(100));
  }

}
