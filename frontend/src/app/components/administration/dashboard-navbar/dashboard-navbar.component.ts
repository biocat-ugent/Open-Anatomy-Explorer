import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {RouterLink, RouterLinkActive, RouterLinkWithHref} from "@angular/router"
import {environment} from "src/environments/environment"

@Component({
  selector: 'app-dashboard-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './dashboard-navbar.component.html',
  styleUrls: ['./dashboard-navbar.component.scss']
})
export class DashboardNavbarComponent implements OnInit {

  role: string

  get environment() {
    return environment
  }

  constructor(public auth: KeycloakService, private roleService: RoleService) {
    this.role = roleService.getHighestRole().toString()
  }

  ngOnInit(): void {
  }

}
