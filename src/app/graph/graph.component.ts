import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, HostListener, AfterViewInit, Output, EventEmitter, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { Router, ActivatedRoute } from "@angular/router";
import { SidenavService } from '../services/sidenav.service';
import * as d3 from "d3";
import { DimensionsType } from '../utils/types';
import { Node, Link } from '../models/forceGraphTypes';
import { MatMenuTrigger } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';

import { Queue } from '../utils/queue';
import { Participant } from '../models/symbioTypes';

@Component({
    selector: 'app-graph',
    templateUrl: './graph.component.html',
    styleUrls: ['./graph.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class GraphComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('nodeMenuTrigger') nodeMenuTrigger: MatMenuTrigger;
  @Output() parentChanged = new EventEmitter<string[]>();
  @Output() nodeDeleted = new EventEmitter<string>();
  @Output() nodeChangedName = new EventEmitter<string>();
  @Output() nodeChangedRole = new EventEmitter<string[]>();
  @Output() nodeChangedIdea = new EventEmitter<string>();
  @Output() dblClickNewIdea = new EventEmitter();

  menuX: number = 0;
  menuY: number = 0;

  @Input() data: Node[];
  @Input() participant: Participant;
  @Input() myAncestries: Node[][];
  @Input() currentStrength: number = 160;
  @Input() currentDistance: number = 40;
  @Input() currentOrder: number = 100;

  groups: Node[];
  dimensions: DimensionsType;

  nodes: Node[];
  links: Link[];
  maxNodeHeight: number;
  nodesMap: Map<string, Node>; // <nodeId: node>; useful to make O(1) lookups when deselectedNodes happens

  simulation: any;
  wrapper: any;
  bounds: any;
  g_zoomable: any;
  zoom: any; // comportamiento d3.zoom, guardado para poder centrar nodos programáticamente

  nodeElements: any;
  linkElements: any;
  textElements: any;

  nodeGroup: any;
  linkGroup: any;
  textGroup: any;

  @HostListener('window:resize', ['$event'])

  @ViewChild('container', {static: true}) container: ElementRef;

  constructor(
    private sidenav: SidenavService,
    private auth: AuthService,
    private sharedService: SharedService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {
    this.links = [];
    this.nodes = [];
    this.dimensions = {
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
      height: 465,
      width: 600,
    }
    this.dimensions = {
      ...this.dimensions, 
      boundedHeight: Math.max(this.dimensions.height - this.dimensions.marginTop - this.dimensions.marginBottom, 0),
      boundedWidth: Math.max(this.dimensions.width - this.dimensions.marginLeft - this.dimensions.marginRight, 0),
    }
    this.groups = [];
    this.nodesMap = new Map();
    this.data = [];
  }

  public innerWidth: number;
  public innerHeight: number;
  private resizeSubscription: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    // remove, create, run
    if (changes['data'] && !changes['data'].isFirstChange()) {
      this.removeChart();
      this.createChart();
      this.runSimulation();
      this.groups = this.getGroups(this.data);
    }
    else if (changes['currentStrength'] && !changes['data']?.isFirstChange()) {
      this.updateChargeStrength(changes['currentStrength'].currentValue, this.currentDistance, this.currentOrder);
    }
    else if (changes['currentDistance'] && !changes['data']?.isFirstChange()) {
      this.updateChargeStrength(this.currentStrength, changes['currentDistance'].currentValue, this.currentOrder);
    }
    else if (changes['currentOrder'] && !changes['data']?.isFirstChange()) {
      this.updateChargeStrength(this.currentStrength, this.currentDistance, changes['currentOrder'].currentValue);
    }
  }

  ngOnInit() {
    //this.updateDimensions();

    // Funcion que pinta los nodos desde el modal de grupos al hacer hover
    this.sharedService.selectedNodes$
      .subscribe(nodes => { // of type Node[] extends d3Force.SimulationNodeDatu
        if (!nodes) return;

        for (let n of nodes) {
          d3.select('#id' + n.id)
              .attr("fill", '#A074FE')
              .attr("color",'#FFFFFF');
        }
    });

    // Funcion que pinta los nodos desde el modal de grupos al hacer blur
    this.sharedService.deselectedNodes$
      .subscribe(nodes => {
        if (!nodes) return;

        for (let n of nodes) {
          let tempNode = this.nodesMap.get(n.id);
          if (!tempNode) continue; // to avoid using nodes not present in current symbio. Weird behavior.

          d3.select('#id' + n.id)
              .attr("fill", tempNode.color);
        }
      });

    // Centra (pan/zoom) un nodo cuando lo pide el listado de participantes
    this.sharedService.centerNode$
      .subscribe(node => {
        if (node) this.centerNode(node);
      });

    // Escucha el evento de redimensionamiento
    this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
      this.innerWidth = window.innerWidth;
      this.innerHeight = window.innerHeight;
      // console.log(`Width: ${this.innerWidth}, Height: ${this.innerHeight}`);
    });
  }

  ngAfterViewInit() {
    this.updateDimensions(); // called here to have the % dimensions calculated
    
    this.createChart();
    if (this.data?.length) {
      this.runSimulation();
      this.groups = this.getGroups(this.data);
    }
  }

  ngOnDestroy() {
    // Cancela la suscripción cuando el componente se destruya
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }

  onResize(event: Event) {
    this.dimensions.width = window.innerWidth;
    this.dimensions.height = window.innerHeight;
    // console.log(`Width: ${this.dimensions.width}, Height: ${this.dimensions.height}`);
  }

  createChart() {
    // create chart
    // console.log("width: ",this.dimensions.width)
    // console.log("height: ",this.dimensions.height)

    this.zoom = d3.zoom().scaleExtent([0.3, 3]).on("zoom", this.zoomed);

    this.wrapper = d3.select(this.container.nativeElement)
      .append("svg")
        .attr("width", this.dimensions.width)
        .attr("height", this.dimensions.height)
        .call(this.zoom)
        .on("dblclick.zoom", null)
        .on("dblclick", () => this.newIdeaClick())
        .on("contextmenu", () => d3.event.preventDefault()); // Disables native context menu


    // Pintar cuadricula
    // this.paintTinyCirclesGrid()
        
    this.bounds = this.wrapper.append("g")
        .attr("transform", `translate(${this.dimensions.marginLeft} ${this.dimensions.marginTop})`);

    this.linkGroup = this.bounds.append('g').attr('class', 'links');
    this.nodeGroup = this.bounds.append('g').attr('class', 'nodes');
  }

  getLinksWithAttributes(links: any[]): any[] {
    return links.map(link => {
      return {
        ...link,
        parent: link.source.id,
        child: link.target ? link.target.id : 'null'
      };
    });
  }

  runSimulation() {
    // === [OPTIMIZACIÓN 5] Pre-calcula alturas en O(n) con un solo DFS ===
    const heightMap = this.preComputeHeights(this.data);
    this.maxNodeHeight = heightMap.size > 0 ? Math.max(...heightMap.values()) : 0;
    this.links = this.getLinks(this.data);
    this.nodes = this.getNodesOptimized(this.data, heightMap);

    // === [ORIGINAL - OPTIMIZACIÓN 5] Bloque original O(n²) — revertir si hay problemas ===
    // this.maxNodeHeight = 0;
    // for (let node of this.data) {
    //   let temp = this.getNodeHeight(node);
    //   if (temp > this.maxNodeHeight) this.maxNodeHeight = temp;
    // }
    // this.links = this.getLinks(this.data);
    // this.nodes = this.getNodes(this.data);
    // console.log("this.nodes",this.nodes)
    //const links = d3.hierarchy(this.data).links();
    this.nodesMap = this.mapIdToNodes(this.nodes);


    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id((d: any) => d.id).distance((d: any) => this.getGradientLinkLength(d.source.height, this.maxNodeHeight, 130, 140))) // d is for node, useful to set ids of source and target: default to node.id, then node.index
      // .force('charge', d3.forceManyBody().strength(-1*this.currentStrength))
      .force('center', d3.forceCenter(this.dimensions.width / 2, this.dimensions.height / 2))
      .force('attract', d3.forceRadial(this.dimensions.width / 3, this.dimensions.width / 2, this.dimensions.height / 2).strength(0.001))
      .force("collide", d3.forceCollide().radius((d:any) => d.r * 2 + this.currentDistance)) // Separación basada en el radio del nodo + currentDistance
      .force('grid', this.forceCustom()) // Moves unlinked nodes to a corner of the canvas
      // === [OPTIMIZACIÓN 3] Estabiliza la simulación más rápido (60 ticks vs ~300) ===
      .alphaDecay(0.05);
      // === [ORIGINAL - OPTIMIZACIÓN 3] Revertir: quitar .alphaDecay(0.05) para volver al default ===
      // .force('custom', this.circularArrangementForce())

    const linksWithAttributes = this.getLinksWithAttributes(this.links);

    // draw links
    this.linkElements = this.linkGroup
      .selectAll('line')
      // .data(this.links);
      .data(linksWithAttributes);
    
    this.linkElements.exit().remove();

    const linkEnter = this.linkElements
      .enter()
      .append("line")
        .attr('parent', (d: any) => d.parent)
        .attr('child', (d: any) => d.child)
        .style("stroke-width", d => this.getGradientLinkWidth(d.source.height, this.maxNodeHeight, 1, 10));

    this.linkElements = linkEnter.merge(this.linkElements);
    
    // draw nodes
    this.nodeElements = this.nodeGroup
      .selectAll('g')
      .data(this.nodes);
      
    this.nodeElements.exit().remove();

    const nodeEnter = this.nodeElements
      .enter()
      .append("g")
        .attr("class", "node")
      .on('click', d => this.openIdeaDetailSidenav(d))
      .on('contextmenu', d => this.openNodeContextMenu(d))
      .on("mouseover", d => d3.select('#id' + d.id).classed("hover", true))
      .on("mouseout", d => d3.select('#id' + d.id).classed("hover", false))
      .call(this.drag(this.simulation));


    // Draw node circles
    // === [OPTIMIZACIÓN 2] Sin filtro blur SVG — stroke más grueso como alternativa ===
    nodeEnter.insert("circle")
        .attr('id', d => 'id' + d.id) // useful for selecting by id on hover event
        .attr("fill", d => d.color)
        .attr("stroke", d => d.children ? this.getDarkerColor(d.color) : "#cccccc")
        .attr("stroke-width", d => d.children ? 3 : 2)
        .attr('r', d => d.r * 3)
        .attr("class", "circle");

    
    // node label for ambassadors
    nodeEnter
        .filter(d => d.role === 'ambassador')
        .append("text")
        .text('Embajador')
        .attr('text-anchor', 'middle')
        .attr('dy', d => -d.r - 24)
        .call(this.getBBox); // sets the bbox property on d.


    // background for ambassador labels
    nodeEnter
        .filter(d => d.role === 'ambassador')
        .insert('rect', 'text')
        .attr('x', d => d.bbox.x - 4)
        .attr('y', d => d.bbox.y - 1)
        .attr('rx', 8) // rounded corners
        .attr('ry', 8)
        .attr('width', d => d.bbox.width + 8)
        .attr('height', d => d.bbox.height + 2)
        .attr('class', 'bbox-ambassador'); // fill with background color


    // node label for idea
    nodeEnter.append("text")
        .text(d => d.idea?.title ? (d.idea.title.length > 10 ? d.idea.title.substring(0, 7) + '...' : d.idea.title) : '')
        .style('fill', '#616161')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('font-size', d => d.r)
        .attr('dy', d =>  -d.r);
        

    // node label for name (group name or participant's name)
    nodeEnter.append("text")
        .text(d => d.name.substring(0, 11))
        .attr('text-anchor', 'middle')
        .attr("dominant-baseline", "middle")
        .style('font-size', d => d.r);
        

    this.nodeElements = nodeEnter.merge(this.nodeElements);

    // === [OPTIMIZACIÓN 1+4] runOutsideAngular + requestAnimationFrame throttle ===
    let ticking = false;
    this.ngZone.runOutsideAngular(() => {
      this.simulation.on('tick', () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            this.linkElements
              .attr("x1", d => (<Node>d.source).x)
              .attr("y1", d => (<Node>d.source).y)
              .attr("x2", d => (<Node>d.target).x)
              .attr("y2", d => (<Node>d.target).y);
            this.nodeElements
              .attr("transform", d => `translate(${d.x} ${d.y})`);
            ticking = false;
          });
        }
      });
    });

    // === [ORIGINAL - OPTIMIZACIÓN 1+4] Revertir: descomentar este bloque y comentar el de arriba ===
    // this.simulation.on('tick', () => {
    //     this.linkElements
    //       .attr("x1", d => (<Node>d.source).x)
    //       .attr("y1", d => (<Node>d.source).y)
    //       .attr("x2", d => (<Node>d.target).x)
    //       .attr("y2", d => (<Node>d.target).y);
    //     this.nodeElements
    //       .attr("transform", d => `translate(${d.x} ${d.y})`);
    //   });
  }

  getBBox(selection) {
    selection.each(function(d) {
        d.bbox = this.getBBox();
    });
  };

  drag = simulation => {
    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }
    
    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }

  removeChart() {
    this.wrapper.remove();
  }

  // returns a 1d array of all nodes
  getNodes(data: Node[]): Node[] {
    let nodes: Node[] = [];
    let that = this;

    function recurse(node: Node) {
      node.height = that.getNodeHeight(node);
      node.r = that.getGradientRadius(node.height, that.maxNodeHeight, 8, 30);
      node.color = that.getGradientColor(node.height, that.maxNodeHeight, "#FFFFFF", "#FF4081");

      if (node.children) node.children.forEach(recurse);
      nodes.push(node);
    }
    // data can have many nodes at root level
    for (let n of data) {
      recurse(n);
    }
    return nodes;
  }

  // === [OPTIMIZACIÓN 5] Versión optimizada de getNodes que usa el mapa pre-calculado ===
  getNodesOptimized(data: Node[], heightMap: Map<string, number>): Node[] {
    let nodes: Node[] = [];
    let that = this;
    function recurse(node: Node) {
      node.height = heightMap.get(node.id) || 0;
      node.r = that.getGradientRadius(node.height, that.maxNodeHeight, 8, 30);
      node.color = that.getGradientColor(node.height, that.maxNodeHeight, "#FFFFFF", "#FF4081");
      if (node.children) node.children.forEach(recurse);
      nodes.push(node);
    }
    for (let n of data) {
      recurse(n);
    }
    return nodes;
  }

  getLinks(data: Node[]): Link[] {
    let links: Link[] = [];

    function recurse(node: Node) {
      if (node.children) {
        node.children.forEach(child => {
          let l: Link = {source: node, target: child};
          links.push(l);
          recurse(child);
        });
      }
    }

    for (let n of data) {
      recurse(n);
    }
    return links;
  }

  getGroups(data: Node[]): Node[] {
    let groups: Node[] = [];

    function recurse(node: Node) {
      if (node.children) {
        groups.push(node);
        node.children.forEach(recurse);
      } 
    }
    // data can have many nodes at root level
    for (let n of data) {
      recurse(n);
    }
    return groups;
  }

  mapIdToNodes(nodes: Node[]): Map<string, Node> {
    let map = new Map();
    for (let n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }

  zoomed = () => {
    this.bounds.attr("transform", d3.event.transform);
  }

  // Centra en el viewport el nodo indicado, conservando el nivel de zoom actual, con animación.
  centerNode = (node: Node) => {
    if (!node || !this.wrapper || !this.zoom) return;

    const target = this.nodesMap.get(node.id);
    if (!target || target.x == null || target.y == null) return;

    const k = d3.zoomTransform(this.wrapper.node()).k; // conserva el zoom actual
    const tx = this.dimensions.width / 2 - k * target.x;
    const ty = this.dimensions.height / 2 - k * target.y;

    this.wrapper.transition().duration(500)
      .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }

  @HostListener('window:resize') windowResize() {
    this.updateDimensions();
    if (this.simulation) {
      this.simulation.stop();
    }
    this.removeChart();
    this.createChart();
    if (this.data?.length) {
      this.runSimulation();
    }
  }

  updateDimensions() {
    const width = this.container.nativeElement.offsetWidth; // take full width and height of container
    const height = this.container.nativeElement.offsetHeight; 
    //console.log(height);

    this.dimensions.width = width;
    this.dimensions.height = height;
    this.dimensions.boundedWidth = Math.max(
      this.dimensions.width
        - this.dimensions.marginLeft
        - this.dimensions.marginRight,
      0
    );
    this.dimensions.boundedHeight = Math.max(
      this.dimensions.height
        - this.dimensions.marginTop
        - this.dimensions.marginBottom,
      0
    );
  }

  // copy of fn in symbiocreation.component.ts
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
    this.router.navigate(['idea', node.id], {relativeTo: this.route});
    this.sidenav.open();
  }

  openNodeContextMenu(node: Node) {
    if (!this.auth.loggedIn) return;

    d3.event.preventDefault();
    this.menuX = d3.event.x - 10;
    this.menuY = d3.event.y - 50;
    this.nodeMenuTrigger.menuData = {node: node};
    this.nodeMenuTrigger.openMenu();
  }

  setNodeParent(childId: string, parentId: string) {
    this.parentChanged.emit([childId, parentId]);
  }

  filterGroups(groups: Node[], node: Node): Node[] {
    return groups.filter(g => g.id !== node.id);
  }

  deleteNode(node: Node) {
    this.nodeDeleted.emit(node.id);
  }

  setNodeName(node: Node) {
    this.nodeChangedName.emit(node.id);
  }

  setNodeRole(node: Node, role: string) {
    this.nodeChangedRole.emit([node.id, role]);
  }

  /*
  changeIdeaNode(node: Node) {
    this.nodeChangedIdea.emit(node.id);
  } */

  getNode(nodeId: string): Node {
    let n: Node = null;

    function recurse(node: Node) {
      if (node.children) node.children.forEach(recurse);
      if (node.id === nodeId) n = node;
    }
    // data can have many nodes at root level
    for (let node of this.data) {
      recurse(node);
    }
    return n;
  }

  /************ Helper functions ************/

  // === [OPTIMIZACIÓN 5] Pre-calcula todas las alturas en un solo DFS O(n) en vez de O(n²) ===
  private preComputeHeights(data: Node[]): Map<string, number> {
    const heightMap = new Map<string, number>();
    function computeHeight(node: Node): number {
      if (!node.children || node.children.length === 0) {
        heightMap.set(node.id, 0);
        return 0;
      }
      let h = 1;
      for (const child of node.children) {
        h += computeHeight(child);
      }
      heightMap.set(node.id, h);
      return h;
    }
    for (const n of data) {
      computeHeight(n);
    }
    return heightMap;
  }

  // TODO: fix wrong implementation!!!!!!!!!!!!!!!
  // BFS
  getNodeHeight(node: Node): number {
    let height = 0;

    let queue = new Queue<Node>();
    queue.add(node);
    let current: Node;

    while (!queue.isEmpty()) {
      current = queue.pop();

      if (current.children) {
        height +=1 ;
        current.children.forEach(child => queue.add(child));
      }
    }
    return height;
  }

  getGradientColor(height: number, maxHeight: number, from: string, to: string): string {
    let start = this.convertToRGB(from);    
    let end = this.convertToRGB(to);
    let diff = [0, 0, 0];
    diff[0] = end[0] - start[0];
    diff[1] = end[1] - start[1];
    diff[2] = end[2] - start[2];

    if (maxHeight === 0) return from;

    let color = [0, 0, 0];
    color[0] = diff[0] * (height / maxHeight) + start[0];
    color[1] = diff[1] * (height / maxHeight) + start[1];
    color[2] = diff[2] * (height / maxHeight) + start[2];

    return '#' + this.convertToHex(color);
  } 

  getDarkerColor(color: string): string {
    let colorRGB = this.convertToRGB(color);  

    colorRGB[0] -= 55;
    colorRGB[1] -= 55;
    colorRGB[2] -= 55;

    return '#' + this.convertToHex(colorRGB);
  }

  getGradientRadius(height: number, maxHeight: number, from: number, to: number): number {
    if (maxHeight === 0) return from;
    
    const diff = to - from;
    return diff * (height / maxHeight) + from;
  }

  getGradientLinkWidth(height: number, maxHeight: number, from: number, to: number): number {
    if (maxHeight <= 1) return from;

    const diff = to - from;
    return diff * ((height - 1) / (maxHeight - 1)) + from + 1;
  }

  getGradientLinkLength(height: number, maxHeight: number, from: number, to: number): number {
    if (maxHeight <= 1) return from;

    const diff = to - from;
    return diff * ((height - 1) / (maxHeight - 1)) + from;
  }

  hex(c): string {
    var s = "0123456789abcdef";
    var i = parseInt(c);
    if (i == 0 || isNaN(c))
      return "00";
    i = Math.round(Math.min(Math.max(0, i), 255));

    return s.charAt((i - i % 16) / 16) + s.charAt (i % 16);
  }
  
  /* Convert an RGB triplet to a hex string */
  convertToHex(rgb: number[]): string {
    return this.hex(rgb[0]) + this.hex(rgb[1]) + this.hex(rgb[2]);
  }
  
  /* Remove '#' in color hex string */
  trim(s): string { return (s.charAt(0) == '#') ? s.substring(1, 7) : s }
  
  /* Convert a hex string to an RGB triplet */
  convertToRGB(hex): number[] {
    var color = [];
    color[0] = parseInt((this.trim(hex)).substring(0, 2), 16);
    color[1] = parseInt((this.trim(hex)).substring(2, 4), 16);
    color[2] = parseInt((this.trim(hex)).substring(4, 6), 16);
    return color;
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

  // Cambiamos la fuerza al centro del svg que se aplica al usar el slider de fuerza
  private updateChargeStrength(strength: number, currentDistance: number, currentOrder: number): void {

    const nodesWithLinks = this.nodes.filter(node => 
      (node.r > 24) && this.links.some( (link:any) => link.source.id === node.id || link.target.id === node.id)
    );

    this.simulation.force('charge', d3.forceManyBody()
      .strength(-1*this.currentStrength))
      .force('center', d3.forceCenter(this.dimensions.width / 2, this.dimensions.height / 2))
      .force('attract', d3.forceRadial(this.dimensions.width / 3, this.dimensions.width / 2, this.dimensions.height / 2).strength(0.1))
      // .force("collide", d3.forceCollide().radius(this.currentDistance)) //Antiguo margen de los nodos
      .force("collide", d3.forceCollide()
        .radius( (d:any) => d.r*2 + this.currentDistance)  // Separación basada en el radio del nodo + currentDistance
      )
      .force('center-links', d3.forceRadial(0, this.dimensions.width / 2, this.dimensions.height / 2).strength(d => nodesWithLinks.includes(d) ? 0.1 : 0));

      // .force('grid', this.forceCustom())
    this.simulation.alpha(1).restart();  // Re-calienta y reinicia la simulación
  }

  // Fuerza para reordenar los puntos en una cuadricula
  // private forceCustom(): any {
  //   let maxDistance = 100;
  //   let index = 0;
  
  //   return (alpha: number) => {
  //     let unlinkedNodes = this.nodes.filter((node: any) => !this.links.some((link: any) => link.source.id === node.id || link.target.id === node.id));
  //     let columns = Math.ceil(Math.sqrt(unlinkedNodes.length)); // Número de columnas basado en el número total de nodos sin enlaces
  //     let spacing = 100 + maxDistance / columns; // Espacio entre los nodos
  
  //     unlinkedNodes.forEach((node: any, i: number) => {
  //       let row = Math.floor(i / columns);
  //       let col = i % columns;
  
  //       // Calcular la posición objetivo para el nodo
  //       let targetX = (this.dimensions.width * 3 / 8) + (col * spacing);
  //       let targetY = (this.dimensions.height * 3 / 8) + (row * spacing);
  
  //       // Ajustar las velocidades para mover los nodos hacia la posición objetivo
  //       node.vx += (targetX - node.x) * alpha;
  //       node.vy += (targetY - node.y) * alpha;
  //     });
  //   };
  // }

  // Funcion para pintar las lineas verticales y horizontales
  paintGrid() {
    let gridSize = 10;
  
    // Selecciona o crea el grupo para el grid
    let gridGroup = this.wrapper.select('.grid-group');
    if (gridGroup.empty()) {
      gridGroup = this.wrapper.insert('g', ':first-child').attr('class', 'grid-group');
    } else {
      // Limpia las líneas anteriores del grid
      gridGroup.selectAll('line').remove();
    }
  
    // Dibuja las líneas horizontales
    for (let y = 0; y <= this.dimensions.height; y += gridSize) {
      gridGroup.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', this.dimensions.width)
        .attr('y2', y)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1);
    }
  
    // Dibuja las líneas verticales
    for (let x = 0; x <= this.dimensions.width; x += gridSize) {
      gridGroup.append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', this.dimensions.height)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1);
    }

  }

  // Funcion para pintar pequeños circulos en el svg
  paintTinyCirclesGrid() {
    let gridSize = 10;

    // Selecciona o crea el grupo para el grid
    let gridGroup = this.wrapper.select('.grid-group');
    if (gridGroup.empty()) {
      gridGroup = this.wrapper.insert('g', ':first-child').attr('class', 'grid-group');
    } else {
      // Limpia los elementos anteriores del grid
      gridGroup.selectAll('circle').remove();
    }

    // Dibuja los puntos en las intersecciones
    for (let y = 0; y <= this.dimensions.height; y += gridSize) {
      for (let x = 0; x <= this.dimensions.width; x += gridSize) {
        gridGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0.5)  // Radio de 0.5px para un punto de 1px de diámetro
          .attr('fill', '#000000');
      }
    }
  }

  // Funcion que pone a los nodos sin enlaces alrededor del centro en forma circular
  private forceCustom(): any {
    return (alpha: number) => {
        // Filtrar los nodos sin enlaces
        let unlinkedNodes = this.nodes.filter((node: any) => !this.links.some((link: any) => link.source.id === node.id || link.target.id === node.id));
    
        // Calcular el radio del círculo
        let radius = this.currentOrder*4 + this.currentStrength + Math.min(this.dimensions.width, this.dimensions.height)/4;
        let centerX = this.dimensions.width / 2;
        let centerY = this.dimensions.height / 2;
    
        // Colocar los nodos en el círculo
        unlinkedNodes.forEach((node: any, i: number) => {
        let angle = (i / unlinkedNodes.length) * 2 * Math.PI;
  
        // Calcular la posición objetivo para el nodo
        let targetX = centerX + radius * Math.cos(angle);
        let targetY = centerY + radius * Math.sin(angle);
  
        // Ajustar las velocidades para mover los nodos hacia la posición objetivo
        node.vx += (targetX - node.x) * alpha * 0.02;
        node.vy += (targetY - node.y) * alpha * 0.02;
      });
    };
  }

  newIdeaClick() {
    this.dblClickNewIdea.emit();
  }

  deleteLine(childId: string, parentId: string) {
    this.parentChanged.emit([childId, parentId]);
  }

}