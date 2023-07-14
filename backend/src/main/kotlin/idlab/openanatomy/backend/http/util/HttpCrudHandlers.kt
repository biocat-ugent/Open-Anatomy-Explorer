package idlab.openanatomy.backend.http.util

import idlab.openanatomy.backend.commons.fromBase64
import idlab.openanatomy.backend.commons.toBase64
import idlab.openanatomy.backend.definitions.OpenAnatomyEntity
import io.quarkus.logging.Log
import io.quarkus.mongodb.panache.kotlin.reactive.ReactivePanacheMongoCompanion
import io.quarkus.security.identity.SecurityIdentity
import io.smallrye.mutiny.coroutines.awaitSuspending
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.bson.Document
import org.bson.types.ObjectId
import java.time.Instant
import javax.ws.rs.InternalServerErrorException
import javax.ws.rs.NotFoundException
import javax.ws.rs.core.Response

private const val DEFAULT_PAGE_SIZE = 100

internal suspend inline fun <reified T : OpenAnatomyEntity> ReactivePanacheMongoCompanion<T>.handleHttpList(
    filter: Filter? = null,
    cursor: String? = null
): PagedResult<T> = coroutineScope {
    try {
        val requestedPage = cursor?.fromBase64()?.toIntOrNull() ?: 0
        val q =
            (if (filter != null) this@handleHttpList.find(filter.toQueryDocument()) else this@handleHttpList.findAll()).page(
                requestedPage,
                DEFAULT_PAGE_SIZE
            )
        val items = async { q.list().awaitSuspending() }
        val hasNextPage = async { q.hasNextPage().awaitSuspending() }
        val count = async { q.count().awaitSuspending() }
        PagedResult(
            items.await(),
            if (hasNextPage.await()) requestedPage.inc().toString().toBase64() else null,
            count.await()
        )
    } catch (t: Throwable) {
        Log.warn("Error while trying to list Entities of type ${T::class.simpleName}.")
        throw InternalServerErrorException(t)
    }
}

internal suspend inline fun <reified T : OpenAnatomyEntity> ReactivePanacheMongoCompanion<T>.handleHttpCreate(
    securityIdentity: SecurityIdentity,
    entitySupplier: () -> T
): Response {
    try {
        val entity = entitySupplier.invoke().apply {
            this.ownerUserId = securityIdentity.principal.name
        }
        this.persist(entity).awaitSuspending()
        return Response.status(Response.Status.CREATED).entity(entity.id.toString()).build()
    } catch (t: Throwable) {
        Log.warn("Error while trying to create an Entity of type ${T::class.simpleName}.", t)
        throw InternalServerErrorException(t)
    }
}

internal suspend fun <T : OpenAnatomyEntity> ReactivePanacheMongoCompanion<T>.handleHttpGet(id: String): T {
    return this.findById(ObjectId(id)).awaitSuspending() ?: throw NotFoundException()
}

internal suspend inline fun <reified T : OpenAnatomyEntity> ReactivePanacheMongoCompanion<T>.handleHttpUpdate(
    securityIdentity: SecurityIdentity,
    id: String,
    updateApplyer: (T) -> T
): Response {
    val updatedEntity = updateApplyer.invoke(this.handleHttpGet(id)).apply {
        securityIdentity.checkTeacherCanOnlyModifyOwnResources(this)
        this.lastModifiedAt = Instant.now()
    }
    this.update(updatedEntity).awaitSuspending()
    return Response.noContent().build()
}

internal suspend fun <T : OpenAnatomyEntity> ReactivePanacheMongoCompanion<T>.handleHttpDelete(
    securityIdentity: SecurityIdentity,
    id: String,
    additionalCleanupHook: suspend (T) -> Unit = {}
): Response {
    val resource = this.handleHttpGet(id).apply { securityIdentity.checkTeacherCanOnlyModifyOwnResources(this) }
    additionalCleanupHook.invoke(resource)
    this.deleteById(ObjectId(id)).awaitSuspending()
    return Response.noContent().build()
}
