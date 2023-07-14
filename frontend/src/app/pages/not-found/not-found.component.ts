import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterLinkWithHref} from "@angular/router"

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
