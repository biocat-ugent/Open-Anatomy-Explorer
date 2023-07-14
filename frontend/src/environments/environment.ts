// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  frontend_url: 'http://localhost:4200',
  keycloak_url: 'http://localhost:9090',
  keycloak_realm: 'opanex',
  keycloak_clientId: 'opanex-frontend',
  backend_root: '/api',
  DEFAULT_PAGE_SIZE: 100
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
