import { Component, OnInit, Input, ViewChild, ElementRef, AfterContentInit, OnChanges, SimpleChanges, HostListener, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from "@angular/router";
import { SidenavService } from '../services/sidenav.service';
import * as d3 from "d3"
import { DimensionsType } from '../utils/types';
import { Node, Link } from '../models/forceGraphTypes';
import { MatMenuTrigger } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';
import { SymbiocreationService } from '../services/symbiocreation.service';
import { SharedService } from '../services/shared.service';

import { Queue } from '../utils/queue';
import { Participant } from '../models/symbioTypes';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit, AfterContentInit, AfterViewInit, OnChanges {

  @ViewChild('nodeMenuTrigger') nodeMenuTrigger: MatMenuTrigger;
  @Output() parentChanged = new EventEmitter<string[]>();
  @Output() nodeDeleted = new EventEmitter<string>();
  @Output() nodeChangedName = new EventEmitter<string>();
  @Output() nodeChangedRole = new EventEmitter<string[]>();
  @Output() nodeChangedIdea = new EventEmitter<string>();

  //participant: Participant;
  //myAncestries: Node[][];

  menuX: number = 0;
  menuY: number = 0;

  @Input() data: Node[];
  @Input() participant: Participant;
  @Input() myAncestries: Node[][];

  groups: Node[];
  dimensions: DimensionsType;

  nodes: Node[];
  links: Link[];
  maxNodeHeight: number;
  nodesMap: Map<string, Node>; // nodeId -> node; useful to make O(1) lookups when deselectedNodes happens

  simulation: any;
  wrapper: any;
  bounds: any;
  g_zoomable: any;

  nodeElements: any;
  linkElements: any;
  textElements: any;

  nodeGroup: any;
  linkGroup: any;
  textGroup: any;

  @ViewChild('container', {static: true}) container: ElementRef;

  constructor(
    private sidenav: SidenavService,
    private auth: AuthService,
    private symbioService: SymbiocreationService,
    private sharedService: SharedService,
    private router: Router, 
    private route: ActivatedRoute,
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    // remove, create, run
    if (changes['data'] && !changes['data'].isFirstChange()) {
      this.removeChart();
      this.createChart();
      this.runSimulation();
      this.groups = this.getGroups(this.data);
    }
  }

  ngOnInit() {
    //this.updateDimensions();
    this.sharedService.selectedNodes$
      .subscribe(nodes => { // of type Node[] extends d3Force.SimulationNodeDatum
        if (!nodes) return;
        for (let n of nodes) {
          let el = d3.select('#id' + n.id);
          el.attr("fill", '#304FFE');
        }
    });

    this.sharedService.deselectedNodes$
      .subscribe(nodes => {
        if (!nodes) return;
        for (let n of nodes) {
          let tempNode = this.nodesMap.get(n.id);
          if (!tempNode) continue; // to avoid using nodes not present in current symbio. Weird behavior.
          let el = d3.select('#id' + n.id);
          el.attr("fill", tempNode.color);
        }
      });
  }

  ngAfterContentInit() {
    //this.updateDimensions();
  }

  ngAfterViewInit() {
    this.updateDimensions(); // called here to have the % dimensions calculated
    
    this.createChart();
    if (this.data?.length) {
      this.runSimulation();
      this.groups = this.getGroups(this.data);
    }
  }

  createChart() {
    // create chart
    this.wrapper = d3.select(this.container.nativeElement)
      .append("svg")
        .attr("width", this.dimensions.width)
        .attr("height", this.dimensions.height)
        .call(d3.zoom().scaleExtent([0.3, 3]).on("zoom", this.zoomed))
        .on("dblclick.zoom", null);
        
    this.bounds = this.wrapper.append("g")
        .attr("transform", 'translate(' + this.dimensions.marginLeft + 'px, ' + this.dimensions.marginTop + 'px)');

    this.linkGroup = this.bounds.append('g').attr('class', 'links');
    this.nodeGroup = this.bounds.append('g').attr('class', 'nodes');
  }

  runSimulation() {
    // get the maximum height of any node, which must belong to a root-level node
    this.maxNodeHeight = 0;
    for (let node of this.data) {
      let temp = this.getNodeHeight(node);
      if (temp > this.maxNodeHeight) this.maxNodeHeight = temp;
    }

    //const root = d3.hierarchy(this.data);
    this.links = this.getLinks(this.data);
    //const nodes = root.descendants();
    this.nodes = this.getNodes(this.data);
    //const links = d3.hierarchy(this.data).links();
    this.nodesMap = this.mapIdToNodes(this.nodes);

    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id((d: any) => d.id).distance((d: any) => this.getGradientLinkLength(d.source.height, this.maxNodeHeight, 55, 90))) // d is for node, useful to set ids of source and target: default to node.id, then node.index
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(this.dimensions.width / 2, this.dimensions.height / 2));

    // draw links
    this.linkElements = this.linkGroup
      .selectAll('line')
      .data(this.links);
    
    this.linkElements.exit().remove();

    const linkEnter = this.linkElements
      .enter()
      .append("line")
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
      .call(this.drag(this.simulation));

    // node label
    nodeEnter.append("text")
      .text(d => d.name)
      .attr('text-anchor', d => d.role === 'ambassador' ? 'end' : 'middle')
      .attr('dy', d => -d.r - 17)
      .call(this.getBBox); // sets the bbox property on d
    
    // text background for label
    nodeEnter.insert('rect', 'text')
      .attr('x', d => d.bbox.x - 2)
      .attr('y', d => d.bbox.y - 1)
      .attr('width', d => d.bbox.width + 4)
      .attr('height', d => d.bbox.height + 2)
      .attr('class', 'bbox-name');

        
    // node label for ambassadors
    nodeEnter.append("text")
        .text(d => d.role === 'ambassador' ? 'Embajador' : '')
        //.style('fill', '#FFAB00')
        .attr('dx', 5)
        .attr('dy', d =>  -d.r - 17)
        .call(this.getBBox); // sets the bbox property on d

    // text background for ambassador labels
    nodeEnter.insert('rect', 'text')
        .attr('x', d => d.bbox.x - 4)
        .attr('y', d => d.bbox.y - 1)
        .attr('rx', 8) // rounded corners
        .attr('ry', 8)
        .attr('width', d => d.bbox.width + 8)
        .attr('height', d => d.bbox.height + 2)
        .attr('class', 'bbox-ambassador');


    // node label for idea
    nodeEnter.append("text")
        .text(d => d.idea ? (d.idea.title.length > 15 ? d.idea.title.substring(0, 15) : d.idea.title) : '(vacío)')
        .style('fill', '#616161')
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .attr('dy', d =>  -d.r - 3)
        .call(this.getBBox); // sets the bbox property on d

    // text background for idea
    nodeEnter.insert('rect', 'text')
        .attr('x', d => d.bbox.x - 2)
        .attr('y', d => d.bbox.y - 1)
        .attr('width', d => d.bbox.width + 4)
        .attr('height', d => d.bbox.height + 2)
        .attr('class', 'bbox-name');


    nodeEnter.append("circle")
        .attr('id', d => 'id' + d.id) // useful for selecting by id on hover event
        .attr("fill", d => d.color)
        .attr("stroke", d => d.children ? this.getDarkerColor(d.color) : "#cccccc")
        .attr("stroke-width", 1.5)
        .attr('r', d => d.r)
        .on('click', d => this.openIdeaDetailSidenav(d))
        .on('contextmenu', d => this.openNodeContextMenu(d))
        .on('mouseover', d => d3.select(d3.event.currentTarget).attr("fill", '#304FFE'))
        .on('mouseout', d => d3.select(d3.event.currentTarget).attr("fill", this.nodesMap.get(d.id).color));

    this.nodeElements = nodeEnter.merge(this.nodeElements);

    this.simulation.on('tick', () => {
        this.linkElements
          .attr("x1", d => (<Node>d.source).x)
          .attr("y1", d => (<Node>d.source).y)
          .attr("x2", d => (<Node>d.target).x)
          .attr("y2", d => (<Node>d.target).y);
        this.nodeElements
          .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
      });
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

  toggleChildren(d) {
    /*if (d3.event.defaultPrevented) return; // ignore drag
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }*/
    // updateGraph();
  }

  @HostListener('window:resize') windowResize() {
    this.updateDimensions();
    this.wrapper
        .attr("width", this.dimensions.width)
        .attr("height", this.dimensions.height);

    this.runSimulation();
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
    let amAmbassadorOfGroup = false;
    if (this.participant) { // user could be an external viewer
      for (let lineage of this.myAncestries) {
        if (this.nodeAContainsNodeB(node, lineage[0]) && lineage[0].role === 'ambassador') {
          amAmbassadorOfGroup = true;
          break;
        }
      }
    }
    // 3 possible conditions to make and idea editable
    this.sharedService.nextIsIdeaEditable(
          this.participant?.isModerator // if I am moderator
          || amAmbassadorOfGroup // if I am ambassador and descendant of group node to edit
          || node.u_id === this.participant?.u_id // if it's my node
    );
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
    return diff * ((height - 1) / (maxHeight - 1)) + from;
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

}