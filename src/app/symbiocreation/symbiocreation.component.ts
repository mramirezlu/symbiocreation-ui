import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from "@angular/router";
import { MatSidenav } from '@angular/material/sidenav';
import { SidenavService } from '../services/sidenav.service';

import { Node } from '../models/forceGraphTypes';
import { Symbiocreation, Participant, User, TrendAI } from '../models/symbioTypes';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { AuthService } from '../services/auth.service';
import { RSocketService } from '../services/rsocket.service';
import { SharedService } from '../services/shared.service';
import { concatMap, tap } from 'rxjs/operators';
import { UserService } from '../services/user.service';

import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { NewGroupDialogComponent } from '../new-group-dialog/new-group-dialog.component';
import { EditIdeaDialogComponent } from '../edit-idea-dialog/edit-idea-dialog.component';
import { EditGroupNameDialogComponent } from '../edit-group-name-dialog/edit-group-name-dialog.component';

import { SymbiocreationDetailComponent } from '../symbiocreation-detail/symbiocreation-detail.component';
import { MatButton } from '@angular/material/button';
import { NewIdeaConfirmationDialogComponent } from '../new-idea-confirmation-dialog/new-idea-confirmation-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

import { saveAs } from 'file-saver';
import { AnalyticsService } from '../services/analytics.service';

@Component({
    selector: 'app-symbiocreation',
    templateUrl: './symbiocreation.component.html',
    styleUrls: ['./symbiocreation.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SymbiocreationComponent implements OnInit, OnDestroy {

  appUser?: User;

  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('sidenavAnalytics') sidenavAnalytics: MatSidenav;

  //@ViewChild(GraphComponent)
  //private graphComponent: GraphComponent;

  idGroupSelected: string = null;

  // Índice cíclico por participante: cada click en su nombre centra/abre la siguiente de sus ideas.
  private participantCycleIndex: { [u_id: string]: number } = {};

  participant: Participant;
  groups: Node[];
  myAncestries: Node[][];

  symbiocreation: Symbiocreation;

  _listFilter1: string = '';
  filteredParticipants: Participant[];

  _listFilter2: string = '';
  filteredGroups: Node[];

  isVisible: boolean = true;
  sliderStrengthValue: number = 160;
  sliderDistanceValue: number = 40;
  sliderOrderValue: number = 100;

  isModalOptionsOpen = false;

  showFloatIdeaMenu: boolean = false;
  showFloatGroupMenu: boolean = false;
  showFloatStatMenu: boolean = false;
  showFloatListIdeaMenu: boolean = false;

  isSidenavGroupsOpen = false;
  GroupOrParticipant: boolean = true;
  
  
  // Stats
  GroupParticipantStat: number = 1; // 1:Group, 2:Participant, 3:TopUsuarios, 4:Tendencias, 5:ListaIdeas
  // isSidenavStatsOpen = false;
  isLoadingUsersRanking = false;
  isLoadingTrends = false;

  totalUsers: number;
  totalIdeas: number;

  trends: TrendAI[];
  usersRanking: any[];

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    public sidenavService: SidenavService,
    private symbioService: SymbiocreationService,
    private userService: UserService,
    public auth: AuthService,
    private rSocketService: RSocketService,
    public sharedService: SharedService,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,

    private analyticsService: AnalyticsService,
  ) {
    this.appUser = null;
    this.participant = null;
  }

  ngOnInit() {
    this.sharedService.appUser$
      .subscribe(appUser => this.appUser = appUser);

    this.getData();
    // this.toggleModalIdeas();    
  }

  ngAfterViewInit() {
    this.sidenavService.setSidenav(this.sidenav);
    this.sidenavService.setSidenavAnalytics(this.sidenavAnalytics);
  }

  ngOnDestroy() {
    this.rSocketService.disconnect();
    console.log('ngOnDestroy');
  }
  
  getData(): void {
    this.sharedService.nextIsLoading(true);
    const id = this.route.snapshot.paramMap.get('id');

    this.symbioService.getSymbiocreation(id)
    .pipe(
      tap(s => {
        this.symbiocreation = s;
        this.groups = this.getGroups();
        this.filteredParticipants = this.symbiocreation.participants;
        this.filteredGroups = this.groups;
      }),
      concatMap(s => this.auth.userProfile$),
    ).subscribe(usrProfile => {
      if (this.auth.loggedIn) {
        for (let p of this.symbiocreation.participants) {
          if (p.user.email === usrProfile.email) {
            this.participant = p;
            this.myAncestries = this.getMyAncestriesCompleted();
            break;
          }
        }
      }

      this.fetchCounts();
      this.sharedService.nextIsLoading(false);
      
      // connect to socket for updates
      this.rSocketService.connectToSymbio(this.symbiocreation.id);
      this.rSocketService.symbio$
        .subscribe(
          symbio => {
            if (symbio?.id === this.symbiocreation.id) { // to avoid pulling last symbio with another id
              //console.log(symbio);
              this.symbiocreation = symbio;
              this.updateReferences();
            }
          }
        );
    });
  }

  /*============= Operations on local symbiocreation object =============*/

  getGroups(): Node[] {
    let groups: Node[] = [];

    function recurse(node: Node) {
      if (node.children) {
        groups.push(node);
        node.children.forEach(recurse);
      } 
    }
    // data can have many nodes at root level
    for (let n of this.symbiocreation.graph) {
      recurse(n);
    }
    return groups;
  }

  filterGroups(groups: Node[], node: Node): Node[] {
    return groups.filter(g => g.id !== node.id);
  }

  // returns an array of all my ancestries starting by each of my nodes
  // TODO: should receive list of nodes (parents), and return their ancestries (Node[][])
  // TODO: Do it without having to compute parents!??
  getMyAncestriesCompleted(): Node[][] {
    let graphWParents = this.computeParents();

    let ancestries: Node[][] = [];
    let myNodes = [];
    let participant = this.participant;

    function recurse(node: Node) {
      if (node.children) {
        node.children.forEach(recurse);
      } 
      if (node.u_id === participant.u_id) {
        myNodes.push(node);
      }
    }

    for (let i = 0; i < graphWParents.length; i++) {
      recurse(graphWParents[i]);
    }

    myNodes.forEach(element => {
      ancestries.push([]);
      while(element) {
        ancestries[ancestries.length - 1].push(element);
        element = element.parent;
      }
    });

    // complete first node of each lineage to have the idea available
    for (let lineage of ancestries) {
      this.symbioService.getNodeById(this.symbiocreation.id, lineage[0].id)
        .subscribe(node => lineage[0] = node);
    }
    return ancestries;
  }

  computeParents(): Node[] {
    function recurse(node: Node) {
      if (node.children) node.children.forEach(child => {
        child.parent = node;
        recurse(child);
      });
    }

    let graphWParents = this.copy(this.symbiocreation.graph);
    // data can have many nodes at root level
    for (let i = 0; i < graphWParents.length; i++) {
      recurse(graphWParents[i]);
    }
    return graphWParents;
  }

  // deep copy of array by value
  copy(aObject) {
    if (!aObject) {
      return aObject;
    }
  
    let v;
    let bObject = Array.isArray(aObject) ? [] : {};
    for (const k in aObject) {
      v = aObject[k];
      bObject[k] = (typeof v === "object") ? this.copy(v) : v;
    }
  
    return bObject;
  }

  /*getMyNodes(): Node[] {
    let participant = this.participant;
    let nodes: Node[] = [];

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.u_id === participant.u_id) nodes.push(node);
    }
    // data can have many nodes at root level
    this.symbiocreation.graph.forEach(recurse);
    return nodes;
  } */

  getNode(nodeId: string): Node {
    let n: Node = null;

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.id === nodeId) n = node;
    }
    // data can have many nodes at root level
    for (let i = 0; i < this.symbiocreation.graph.length; i++) {
      recurse(this.symbiocreation.graph[i]);
    }
    return n;
  }

  // returns array of local nodes without their corresponding ideas.
  getNodesByUserId(userId: string): Node[] {
    let nodes: Node[] = [];

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.u_id === userId) nodes.push(node);
    }
    // data can have many nodes at root level
    this.symbiocreation.graph.forEach(recurse);
    return nodes;
  }

  nodeAContainsNodeB(nodeA: Node, nodeB: Node): boolean {
    let contains = false;

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.id === nodeB.id) contains = true;
    }

    recurse(nodeA);
    return contains;
  }

  getRootContaining(node: Node): Node {
    for (let n of this.symbiocreation.graph) {
      if (this.nodeAContainsNodeB(n, node)) return n;
    }
    return null; // this should never occur
  }

  isAmbassadorOfAnyGroupBelow(node: Node): boolean {
    let isAmbassador = false;
    const participant = this.participant;

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.u_id && node.u_id === participant?.u_id && node.role === 'ambassador') {
        isAmbassador = true;
      }
    }
    recurse(node);
    return isAmbassador;
  }


  /* ========================================================================= */


  joinSymbiocreation(btnParticipate: MatButton) {
    if (!this.auth.loggedIn) {
      const id = this.route.snapshot.params.id;
      this.auth.login(`/symbiocreation/${id}`);
      return;
    } 

    btnParticipate.disabled = true;
    
    // add logged-in user as participant
    this.auth.userProfile$.pipe(
      concatMap(user => this.userService.getUserByEmail(user.email)),
      concatMap(u => {
        this.participant = {u_id: u.id, user: u, isModerator: false};
        return this.symbioService.createParticipant(this.symbiocreation.id, this.participant);
      })
    ).subscribe(symbio => {
      this._snackBar.open('Se te agregó como participante.', 'ok', {
        duration: 2000,
      });
    });
  }

  createUserNode() {
    if (!this.participant) {
      return;
    }

    const dialogRef = this.dialog.open(NewIdeaConfirmationDialogComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.symbioService.createUserNode(this.symbiocreation.id, this.participant.user)
          .subscribe();
      }
    });
  }

  // propagates changes to child graph component
  // called when received a new symbio from socket
  updateReferences() {
    this.symbiocreation.graph = this.symbiocreation.graph.slice();
    this.groups = this.getGroups();
    // Se re-aplica el filtro activo para que el buscador siga funcionando tras una actualización en vivo.
    this.filteredParticipants = this.listFilter1 ? this.performFilter1(this.listFilter1) : this.symbiocreation.participants;
    this.filteredGroups = this.listFilter2 ? this.performFilter2(this.listFilter2) : this.groups;

    // update logged-in user
    if (this.participant) {
      // look for my participant object
      for (let p of this.symbiocreation.participants) {
        if (p.user.email === this.participant.user.email) {
          //console.log(p);
          this.participant = p;
          // update myAncestries
          this.myAncestries = this.getMyAncestriesCompleted();
          //this.graphComponent.participant = this.participant;
          //this.graphComponent.myAncestries = this.myAncestries;
          //this.sharedService.nextSessionIsModerator(this.participant.isModerator);
          break;
        }
      }
    }
  }

  // creates a new parent node for the node with id nodeId
  openNewParentGroupDialog(nodeId: string) {
    const dialogRef = this.dialog.open(NewGroupDialogComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(name => {
      if (name) {
        const nextLevelNode: Node = {name: name, children: []};
        this.symbioService.createNextLevelGroup(this.symbiocreation.id, nodeId, nextLevelNode)
          .subscribe();
      }
    });
  }

  // creates a parent node for the current root of ancestry
  openNextLevelGroupDialog(rootOfAncestry: Node) {
    const dialogRef = this.dialog.open(NewGroupDialogComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(name => {
      if (name) {
        const nextLevelNode: Node = {name: name, children: []};
        this.symbioService.createNextLevelGroup(this.symbiocreation.id, rootOfAncestry.id, nextLevelNode)
          .subscribe();
      }
    });
  }

  openMyIdeaEditDialog(myNode: Node) {
    // get node w idea from DB
    this.symbioService.getNodeById(this.symbiocreation.id, myNode.id).subscribe(
      node => {
        const dialogRef = this.dialog.open(EditIdeaDialogComponent, {
          width: '650px',
          data: {
            //name: this.participant.user.firstName && this.participant.user.lastName ? this.participant.user.firstName + ' ' + this.participant.user.lastName : this.participant.user.name,
            name: myNode.name,
            idea: node.idea
          }
        });
    
        dialogRef.afterClosed().subscribe(idea => {
          if (idea) {
            myNode.idea = idea;
            this.symbioService.updateNodeIdea(this.symbiocreation.id, myNode).subscribe(res => {
              this._snackBar.open('Se registró la idea correctamente.', 'ok', {
                duration: 2000,
              });
            });
          }
        });
      }
    );
  }

  // Funcion cuando se cambia/asigna grupo de una idea desde el control Grupo
  // Para quitar el grupo de cualquier nodo hay que asignar como grupo 'none'
  onMyGroupChanged(myNode: Node) {
    // console.log("Falla")
    // console.log("myNode",myNode)
    // console.log("this.symbiocreation.id",this.symbiocreation.id)
    // console.log("myNode.id",myNode.id)
    // console.log("this.idGroupSelected",this.idGroupSelected)

    this.symbioService.setParentNode(this.symbiocreation.id, myNode.id, this.idGroupSelected ? this.idGroupSelected : 'none')
      .subscribe();
    const el = document.getElementById(myNode.id);
    el.hidden = true;

    this.idGroupSelected = null;
  }

  // Funcion cuando se cambia/asigna un grupo a una idea desde el area de trabajo
  // Funciona
  onParentChanged(nodeIds: string[]) {
    // console.log("Funciona")
    // console.log("nodeIds",nodeIds)
    // console.log("this.symbiocreation.id",this.symbiocreation.id)

    
    if( nodeIds[1] == 'none' ){
      this.symbioService.setParentNode(this.symbiocreation.id, nodeIds[0], nodeIds[1])
      .subscribe();

      this.idGroupSelected = null;
      return;
    }

    let child = this.getNode(nodeIds[0]);
    let parent = this.getNode(nodeIds[1]);

    // console.log("child",child)
    // console.log("parent",parent)


    if (this.nodeAContainsNodeB(child, parent)) {
      this._snackBar.open('No se puede asignar. El grupo seleccionado es descendiente del nodo a modificar.', 'ok', {
        duration: 2000,
      });
      return;
    }

    this.symbioService.setParentNode(this.symbiocreation.id, nodeIds[0], nodeIds[1])
      .subscribe();

    this.idGroupSelected = null;
  }

  onNodeDeleted(nodeId: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: 'Eliminar nodo',
        content: '¿Estás seguro(a) que deseas eliminar este nodo y su idea asociada?',
        cancelText: 'Cancelar',
        confirmText: 'Confirmar',
        confirmationColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.symbioService.deleteNode(this.symbiocreation.id, nodeId)
          .subscribe();
      }
    });
  }

  // arr contains 2 elements: nodeId and the role to be set.
  onRoleChanged(arr: string[]) {
    this.setRoleOfUserNode(arr[0], arr[1]);
  }

  openChangeNodeNameDialog(nodeId: string) {
    let toChange = this.getNode(nodeId);

    const dialogRef = this.dialog.open(EditGroupNameDialogComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(name => {
      if (name) {
        toChange.name = name;
        this.symbioService.updateNodeName(this.symbiocreation.id, toChange)
          .subscribe();
      }
    });
  }

  openEditNodeIdeaDialog(nodeId) {
    // get node w idea from DB
    this.symbioService.getNodeById(this.symbiocreation.id, nodeId)
      .subscribe(node => {
          const dialogRef = this.dialog.open(EditIdeaDialogComponent, {
            width: '550px',
            data: {
              name: node.name,
              idea: node.idea
            }
          });
    
          dialogRef.afterClosed().subscribe(idea => {
            if (idea) {
              node.idea = idea;
              this.symbioService.updateNodeIdea(this.symbiocreation.id, node)
                .subscribe(newNode => {
                  this._snackBar.open('Se registró la idea correctamente.', 'ok', {
                    duration: 2000,
                  });
              });
            }
          });
      }
    );
  }

  // function is copied in graph.component.ts
  openIdeaDetailSidenav(node: Node) {
    if (this.participant) { // user could be an external viewer
      let amAmbassadorOfGroup = false;
      for (let lineage of this.myAncestries) {
        if (this.nodeAContainsNodeB(node, lineage[0]) && lineage[0].role === 'ambassador') {
          amAmbassadorOfGroup = true;
          break;
        }
      }
      // 3 possible conditions to make and idea editable
      this.sharedService.nextIsIdeaEditable(
            this.participant.isModerator // if I am moderator
            || amAmbassadorOfGroup // if I am ambassador and descendant of group node to edit
            || node.u_id === this.participant.u_id // if it's my node
      );
    } else {
      this.sharedService.nextIsIdeaEditable(false);
    }
    
    //this.sharedService.nextSelectedNodes([node]);
    this.sharedService.nextCenterNode(node); // centra el nodo en el grafo al abrir su detalle (grupos, participantes, mis ideas, menú)
    this.router.navigate(['idea', node.id], {relativeTo: this.route});
    this.sidenav.open();
  }

  // Al presionar un participante: centra su idea en el grafo y abre el detalle.
  // Si tiene varias ideas, cada click cicla a la siguiente (reemplaza el diálogo selector).
  preOpenIdeaDetailSidenav(u_id: string) {
    const nodes = this.getNodesByUserId(u_id); // nodos locales del participante
    if (!nodes.length) return;

    const nextIndex = ((this.participantCycleIndex[u_id] ?? -1) + 1) % nodes.length;
    this.participantCycleIndex[u_id] = nextIndex;

    const node = nodes[nextIndex];
    this.openIdeaDetailSidenav(node); // centra y abre el detalle (el centrado lo hace openIdeaDetailSidenav)
  }

  setRoleOfUserNode(nodeId: string, role: string) {
    const node = this.getNode(nodeId);
    node.role = role;
    this.symbioService.updateUserNodeRole(this.symbiocreation.id, node)
      .subscribe();
  }

  setParticipantIsModerator(participant: Participant, isModerator: boolean) {
    participant.isModerator = isModerator;
    this.symbioService.updateParticipantIsModerator(this.symbiocreation.id, participant)
      .subscribe();
  }

  //  removes participant and all his user nodes
  deleteParticipant(participant: Participant) {
    // confirmation
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: 'Eliminar participante',
        content: '¿Estás seguro que desea eliminar este participante y todas sus ideas de esta simbiocreación? Los datos se perderán para siempre.',
        cancelText: 'Cancelar',
        confirmText: 'Confirmar',
        confirmationColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.symbioService.deleteParticipant(this.symbiocreation.id, participant.u_id)
          .subscribe(res => {
            this._snackBar.open('Se eliminó correctamente al participante.', 'ok', {
              duration: 2000,
            });
          });
      }
    });
  }

  leaveSymbiocreation() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: '¿Seguro(a) que deseas darte de baja?',
        content: 'Todos tus datos asociados a esta simbiocreación se perderán.',
        cancelText: 'Cancelar',
        confirmText: 'Confirmar',
        confirmationColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.symbioService.deleteParticipant(this.symbiocreation.id, this.participant.u_id)
          .subscribe(res => {
            this.router.navigate(['dashboard']);
            this._snackBar.open('Te diste de baja correctamente.', 'ok', {
              duration: 2000,
            });
          });
      }
    });
  }

  openSymbioDetailDialog() {
    const dialogRef = this.dialog.open(SymbiocreationDetailComponent, {
      width: '600px',
      data: {
        symbio: this.symbiocreation,
        isModerator: this.participant?.isModerator
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  downloadParticipantsData() {
    this._snackBar.open('Generando archivo para descarga...', 'ok', {
      duration: 2000,
    });

    this.symbioService.downloadParticipantsData(this.symbiocreation.id)
          .subscribe(blob => saveAs(blob, `symbio-${this.symbiocreation.id}-participants-data.csv`));
  }

  downloadAllData() {
    this._snackBar.open('Generando archivo para descarga...', 'ok', {
      duration: 2000,
    });
    
    this.symbioService.downloadAllData(this.symbiocreation.id)
          .subscribe(blob => saveAs(blob, `symbio-${this.symbiocreation.id}-all-data.csv`));
  }

  onMouseEnterListItem(nodes: Node[]) {
    this.sharedService.nextSelectedNodes(nodes);
  }

  onMouseLeaveListItem(nodes: Node[]) {
    this.sharedService.nextDeselectedNodes(nodes);
  }

  // setter and getter for _listFilters
  get listFilter1(): string { 
    return this._listFilter1; 
  }
   
  set listFilter1(value: string) { 
    this._listFilter1 = value; 
    this.filteredParticipants = this.listFilter1 ? this.performFilter1(this.listFilter1) : this.symbiocreation.participants; 
  }

  get listFilter2(): string { 
    return this._listFilter2; 
  }
   
  set listFilter2(value: string) { 
    this._listFilter2 = value; 
    this.filteredGroups = this.listFilter2 ? this.performFilter2(this.listFilter2) : this.groups; 
  }

  performFilter1(filterBy: string): Participant[] { 
    filterBy = filterBy.toLocaleLowerCase();  

    return this.symbiocreation.participants.filter(
      (p: Participant) => {
        const name = p.user.firstName && p.user.lastName ? p.user.firstName + " " + p.user.lastName : p.user.name; 
        return name.toLocaleLowerCase().indexOf(filterBy) !== -1;
      }
    ); 
  }

  performFilter2(filterBy: string): Node[] { 
    filterBy = filterBy.toLocaleLowerCase();

    return this.groups.filter(
      (n: Node) => n.name.toLocaleLowerCase().indexOf(filterBy) !== -1
    ); 
  }

  toggleGroupSelectorVisibility(node: Node) {
    const el = document.getElementById(node.id);
    el.hidden = !el.hidden;
  }

  sliderStrengthChange(){
    // console.log("this.sliderValue",this.sliderValue)
  }

  sliderDistanceChange(){
    // console.log("this.sliderValue",this.sliderValue)
  }

  sliderOrderChange(){
    // console.log("this.sliderValue",this.sliderValue)
  }

  stopPropagation(event: MouseEvent) {
    event.stopPropagation(); // Esto evita que el clic dentro del modal se propague al fondo
  }

  
  showFloatIdeaMenuBtn() {
    this.showFloatGroupMenu = false;
    this.showFloatStatMenu = false;
    this.showFloatIdeaMenu = !this.showFloatIdeaMenu;
  }

  closeIdeaBtn() {
    this.showFloatIdeaMenu = false;
  }

  createNewUserIdea() {
    this.symbioService.createUserNode(this.symbiocreation.id, this.participant.user)
          .subscribe();
    this.showFloatIdeaMenu = false;
  }


  showFloatListIdeaMenuBtn() {
    this.showFloatIdeaMenu = false;
    this.showFloatStatMenu = false;
    this.showFloatListIdeaMenu = !this.showFloatListIdeaMenu;
  }

  closeListIdeaBtn() {
    this.showFloatListIdeaMenu = false;
  }

  showFloatGroupMenuBtn() {
    this.showFloatIdeaMenu = false;
    this.showFloatStatMenu = false;
    this.showFloatGroupMenu = !this.showFloatGroupMenu;
  }

  closeGroupBtn() {
    this.showFloatGroupMenu = false;
  }


  showFloatStatMenuBtn() {
    this.showFloatIdeaMenu = false;
    this.showFloatGroupMenu = false;
    this.showFloatStatMenu = !this.showFloatStatMenu;
  }

  closeStatBtn() {
    this.showFloatStatMenu = false;
  }

  toggleModalOptions() {
    this.isModalOptionsOpen = !this.isModalOptionsOpen;
  }

  closeModalOptions(event: MouseEvent) {
    this.isModalOptionsOpen = false;
  }


  toggleGroupSelectorVisibility2(node: Node) {
    const el = document.getElementById(node.id+'@');
    el.hidden = !el.hidden;
  }

  // creates a new parent node for the node with id nodeId
  openNewParentGroupDialog2(nodeId: string) {
    const dialogRef = this.dialog.open(NewGroupDialogComponent, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(name => {
      if (name) {
        const nextLevelNode: Node = {name: name, children: []};
        this.symbioService.createNextLevelGroup(this.symbiocreation.id, nodeId, nextLevelNode)
          .subscribe();
      }
    });
  }

  OpenGroupsSidenav(isGroup: number) {
    this.showFloatIdeaMenu = false;
    this.showFloatGroupMenu = false;
    this.showFloatStatMenu = false;
    this.GroupParticipantStat = isGroup;
    this.isSidenavGroupsOpen = !this.isSidenavGroupsOpen;

    if (this.GroupParticipantStat === 3) {
      this.fetchUsersRanking();
    }
    else if (this.GroupParticipantStat === 4) {
      this.fetchTrends();
    }
  }

  closeSidebarGroupsBtn() {
    this.isSidenavGroupsOpen = false;
  }

  fetchCounts() {
    this.analyticsService.getCountsSummarySymbiocreation(this.symbiocreation?.id)
      .subscribe(countsSummary => {
        this.totalUsers = countsSummary.users;
        this.totalIdeas = countsSummary.ideas;
      });
  }

  fetchUsersRanking() {
    if (this.usersRanking) {
      return;
    }

    this.isLoadingUsersRanking = true;
    this.analyticsService.getUsersRankingSymbiocreation(this.symbiocreation?.id)
      .subscribe(usersRanking => {
        this.isLoadingUsersRanking = false;
        this.usersRanking = usersRanking;
      });
  }

  fetchTrends() {
    if (this.trends) {
      return;
    }

    this.isLoadingTrends = true;
    this.analyticsService.getTrendsInSymbiocreation(this.symbiocreation?.id)
      .subscribe(trends => {
        this.isLoadingTrends = false;
        this.trends = trends;
      });
  }

}