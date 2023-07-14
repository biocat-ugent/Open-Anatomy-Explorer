package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Model
import idlab.openanatomy.backend.definitions.ModelAssetType
import idlab.openanatomy.backend.http.util.*
import io.quarkus.security.identity.SecurityIdentity
import io.smallrye.mutiny.Multi
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.jboss.resteasy.reactive.MultipartForm
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.Context
import javax.ws.rs.core.MediaType

@Path("/models")
class ModelResource(val modelAssetManager: ModelAssetManager) {

    @Context
    lateinit var securityIdentity: SecurityIdentity

    @GET
    @Operation(summary = "Query the Model instances.")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun list(
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ) = Model.handleHttpList(filter = parseFilter(filter), cursor = cursor)

    @POST
    @Operation(summary = "Create a Model instance.")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The Model was created successfully")
    suspend fun create(input: ModelInput) = Model.handleHttpCreate(securityIdentity) {
        // Convert input to entity
        Model(input.name, input.category, input.cameraPosition, input.cameraTarget, input.modelRotation)
    }

    @GET
    @Operation(summary = "Get a specific Model instance.")
    @Path("{modelId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun get(@PathParam("modelId") modelId: String) = Model.handleHttpGet(modelId)

    @PUT
    @Operation(summary = "Update a specific Model instance.")
    @Path("{modelId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Model was updated successfully")
    suspend fun update(@PathParam("modelId") modelId: String, input: ModelInput) =
        Model.handleHttpUpdate(securityIdentity, modelId) { entityState ->
            entityState.name = input.name
            entityState.category = input.category
            entityState.cameraPosition = input.cameraPosition
            entityState.cameraTarget = input.cameraTarget
            entityState.modelRotation = input.modelRotation
            entityState
        }

    @DELETE
    @Operation(summary = "Remove a specific Model instance.")
    @Path("{modelId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Model was removed successfully")
    suspend fun remove(@PathParam("modelId") modelId: String) = Model.handleHttpDelete(securityIdentity, modelId) {
        cleanModelChildren(it, modelAssetManager)
    }


    @PUT
    @Operation(summary = "Upload an object file for a specific Model.")
    @Path("{modelId}/object")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Object was uploaded successfully")
    suspend fun uploadObj(@PathParam("modelId") modelId: String, @MultipartForm formData: FormData) =
        modelAssetManager.handleHttpAssetUpload(
            securityIdentity,
            modelId,
            ModelAssetType.OBJECT,
            formData.file.filePath()
        )


    @GET
    @Operation(summary = "Download the object file for a specific Model.")
    @Path("{modelId}/object")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    fun downloadObj(@PathParam("modelId") modelId: String): Multi<ByteArray> =
        modelAssetManager.handleHttpAssetDownload(modelId, ModelAssetType.OBJECT)

    @DELETE
    @Operation(summary = "Remove the object file of a specific Model.")
    @Path("{modelId}/object")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Object was removed successfully")
    suspend fun removeObject(@PathParam("modelId") modelId: String) =
        modelAssetManager.handleHttpAssetRemove(securityIdentity, modelId, ModelAssetType.OBJECT)

    @PUT
    @Operation(summary = "Upload a texture file for a specific Model.")
    @Path("{modelId}/texture")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Texture was uploaded successfully")
    suspend fun uploadTexture(@PathParam("modelId") modelId: String, @MultipartForm formData: FormData) =
        modelAssetManager.handleHttpAssetUpload(
            securityIdentity,
            modelId,
            ModelAssetType.TEXTURE,
            formData.file.filePath()
        )


    @GET
    @Operation(summary = "Download the texture file for a specific Model.")
    @Path("{modelId}/texture")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    fun downloadTexture(@PathParam("modelId") modelId: String) =
        modelAssetManager.handleHttpAssetDownload(modelId, ModelAssetType.TEXTURE)

    @DELETE
    @Operation(summary = "Remove the texture file of a specific Model.")
    @Path("{modelId}/texture")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Texture was removed successfully")
    suspend fun removeTexture(@PathParam("modelId") modelId: String) =
        modelAssetManager.handleHttpAssetRemove(securityIdentity, modelId, ModelAssetType.TEXTURE)

    @PUT
    @Operation(summary = "Upload a material file for a specific Model.")
    @Path("{modelId}/material")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Material was uploaded successfully")
    suspend fun uploadMaterial(@PathParam("modelId") modelId: String, @MultipartForm formData: FormData) =
        modelAssetManager.handleHttpAssetUpload(
            securityIdentity,
            modelId,
            ModelAssetType.MATERIAL,
            formData.file.filePath()
        )

    @GET
    @Operation(summary = "Download the material file of a specific Model.")
    @Path("{modelId}/material")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    fun downloadMaterial(@PathParam("modelId") modelId: String) =
        modelAssetManager.handleHttpAssetDownload(modelId, ModelAssetType.MATERIAL)

    @DELETE
    @Operation(summary = "Remove the material file for a specific Model.")
    @Path("{modelId}/material")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Material was removed successfully")
    suspend fun removeMaterial(@PathParam("modelId") modelId: String) =
        modelAssetManager.handleHttpAssetRemove(securityIdentity, modelId, ModelAssetType.MATERIAL)

}
