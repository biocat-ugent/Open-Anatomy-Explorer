import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {
  DashboardNavbarComponent
} from "src/app/components/administration/dashboard-navbar/dashboard-navbar.component"
import {RouterOutlet} from "@angular/router"

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardNavbarComponent, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

}
