package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.export.ExportResult
import idlab.openanatomy.backend.export.ModelExporter
import idlab.openanatomy.backend.http.util.Roles
import idlab.openanatomy.backend.http.util.parseFilter
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.HttpHeaders
import javax.ws.rs.core.MediaType
import javax.ws.rs.core.Response

@Path("/model-export")
class ExportResource(private val modelExporter: ModelExporter) {

    @GET
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    suspend fun requestExport(@QueryParam("filter") @DefaultValue("") filter: String): Response {
        var result: ExportResult? = null
        try {
            result = modelExporter.createExport(parseFilter(filter))
            return Response.ok(result.downloadPath)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${result.fileName}\"").build()
        } finally {
            result?.clean()
        }
    }

}
