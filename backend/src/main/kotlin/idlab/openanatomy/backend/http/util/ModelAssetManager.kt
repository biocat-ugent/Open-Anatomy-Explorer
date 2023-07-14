package idlab.openanatomy.backend.http.util

import com.mongodb.reactivestreams.client.gridfs.GridFSBuckets
import idlab.openanatomy.backend.definitions.Model
import idlab.openanatomy.backend.definitions.ModelAssetType
import io.quarkus.mongodb.reactive.ReactiveMongoClient
import io.quarkus.security.identity.SecurityIdentity
import io.smallrye.mutiny.Multi
import io.smallrye.mutiny.Uni
import io.smallrye.mutiny.coroutines.awaitSuspending
import io.vertx.core.file.OpenOptions
import io.vertx.mutiny.core.Vertx
import org.bson.types.ObjectId
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.nio.ByteBuffer
import java.nio.file.Path
import java.time.Instant
import javax.enterprise.context.ApplicationScoped
import javax.ws.rs.NotFoundException
import javax.ws.rs.core.Response
import kotlin.io.path.name
import kotlin.io.path.pathString

@ApplicationScoped
class ModelAssetManager(
    val vertx: Vertx,
    mongoClient: ReactiveMongoClient,
    @ConfigProperty(name = "quarkus.mongodb.database") val dbName: String
) {

    private val db = mongoClient.getDatabase(dbName)
    private val buckets = ModelAssetType.values().associateWith { GridFSBuckets.create(db.unwrap(), it.toString()) }

    suspend fun handleHttpAssetUpload(
        securityIdentity: SecurityIdentity,
        modelId: String,
        assetType: ModelAssetType,
        filePath: Path
    ): Response {
        val asyncFile =
            vertx.fileSystem().open(filePath.pathString, OpenOptions().setRead(true)).awaitSuspending()
        val objectId =
            Uni.createFrom().publisher(
                buckets[assetType]!!.uploadFromPublisher(
                    filePath.name,
                    asyncFile.toMulti().map { ByteBuffer.wrap(it.bytes) })
            ).awaitSuspending()
        val model = Model.findById(ObjectId(modelId)).awaitSuspending() ?: throw NotFoundException()
        securityIdentity.checkTeacherCanOnlyModifyOwnResources(model)
        model.storageKeys[assetType.toString()] = objectId.toString()
        model.lastModifiedAt = Instant.now()
        Model.update(model).awaitSuspending()
        return Response.noContent().build()
    }

    fun handleHttpAssetDownload(modelId: String, assetType: ModelAssetType): Multi<ByteArray> {
        return Model.findById(ObjectId(modelId))
            .onItem().transformToMulti { model ->
                val storageKey = model?.storageKeys?.get(assetType.toString())
                if (storageKey != null) {
                    getByteStream(modelId, assetType, storageKey)
                } else {
                    Multi.createFrom().failure(NotFoundException())
                }
            }
    }

    fun getByteStream(modelId: String, assetType: ModelAssetType, assetId: String): Multi<ByteArray> {
        return Multi.createFrom()
            .publisher(buckets[assetType]!!.downloadToPublisher(ObjectId(assetId)))
            .map { it.array() }
    }

    suspend fun handleHttpAssetRemove(
        securityIdentity: SecurityIdentity,
        modelId: String,
        assetType: ModelAssetType
    ): Response {
        val model = Model.findById(ObjectId(modelId)).awaitSuspending() ?: throw NotFoundException()
        securityIdentity.checkTeacherCanOnlyModifyOwnResources(model)
        val assetId = model.storageKeys[assetType.toString()]

        return if (assetId != null) {
            Uni.createFrom().publisher(buckets[assetType]!!.delete(ObjectId(assetId))).awaitSuspending()
            Model.update(model.apply {
                this.storageKeys.remove(assetType.toString())
                this.lastModifiedAt = Instant.now()
            }).awaitSuspending()
            Response.noContent().build()
        } else {
            Response.notModified().build()
        }
    }

    suspend fun removeAssetRaw(assetId: String, assetType: ModelAssetType) {
        Uni.createFrom().publisher(buckets[assetType]!!.delete(ObjectId(assetId))).awaitSuspending()
    }
}
