package idlab.openanatomy.backend.export

import idlab.openanatomy.backend.commons.listChildren
import idlab.openanatomy.backend.commons.readFromJson
import idlab.openanatomy.backend.commons.readString
import idlab.openanatomy.backend.commons.writeString
import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.http.util.Eq
import idlab.openanatomy.backend.http.util.Filter
import idlab.openanatomy.backend.http.util.ModelAssetManager
import idlab.openanatomy.backend.http.util.toQueryDocument
import io.quarkus.logging.Log
import io.quarkus.security.identity.SecurityIdentity
import io.smallrye.mutiny.coroutines.asFlow
import io.smallrye.mutiny.coroutines.awaitSuspending
import io.vertx.core.file.OpenOptions
import io.vertx.core.json.Json
import io.vertx.core.json.JsonObject
import io.vertx.mutiny.core.Vertx
import io.vertx.mutiny.core.buffer.Buffer
import io.vertx.mutiny.core.file.AsyncFile
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.onEach
import net.lingala.zip4j.ZipFile
import net.lingala.zip4j.model.ZipParameters
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.io.File
import java.nio.file.Path
import java.time.Instant
import java.util.*
import javax.enterprise.context.ApplicationScoped
import kotlin.io.path.absolutePathString
import kotlin.io.path.name
import kotlin.jvm.optionals.getOrNull

@ApplicationScoped
class ModelExporter(val vertx: Vertx, val modelAssetManager: ModelAssetManager) {

    companion object {
        const val META_DATA_JSON = "metadata.json"
        const val LABEL_FOLDER = "labels"
        const val QUIZ_FOLDER = "quizzes"
        const val BINARIES_FOLDER = "binaries"
    }

    @ConfigProperty(name = "opanex.exports.base-dir", defaultValue = "exports")
    private lateinit var baseDir: String

    @ConfigProperty(name = "opanex.imports.base-dir", defaultValue = "imports")
    private lateinit var importsBaseDir: String

    @ConfigProperty(name = "opanex.exports.extensions.model")
    private lateinit var modelObjectExtension: Optional<String>

    @ConfigProperty(name = "opanex.exports.extensions.material")
    private lateinit var modelMaterialExtension: Optional<String>

    @ConfigProperty(name = "opanex.exports.extensions.texture")
    private lateinit var modelTextureExtension: Optional<String>


    /**
     * When a non-empty filter is provided, this function exports all models that match the filter.
     * Otherwise, an export is made that contains all models.
     */
    @OptIn(ExperimentalCoroutinesApi::class)
    suspend fun createExport(filter: Filter? = null): ExportResult {
        // Create a temp directory
        val exportId = UUID.randomUUID()

        val dir = File("$baseDir/$exportId")
        val modelStream = if (filter != null) Model.stream(filter.toQueryDocument()) else Model.streamAll()
        val zipResult = ZipFile(File("$dir.zip")).use { zipFile ->
            modelStream.asFlow()
                .onEach { model ->
                    withContext(Dispatchers.IO) {
                        prepareExport(model, dir.toPath())
                    }
                }
                .collect()
            val params = ZipParameters()
            params.isIncludeRootFolder = false
            zipFile.addFolder(dir, params)
            zipFile
        }
        val asyncOutput =
            vertx.fileSystem().open(zipResult.file.absolutePath, OpenOptions().setRead(true)).awaitSuspending()
        return object : ExportResult(asyncOutput, zipResult.file.name) {
            override suspend fun clean() {
                cleanTempResources(dir)
            }
        }
    }

    /**
     * Import model data from the provided (temporary) input file.
     *
     * TODO: implement rollback on failure?
     *
     * @return List containing the (new) IDs of the imported models
     */
    suspend fun importFrom(securityIdentity: SecurityIdentity, inputPath: Path): List<String> {
        val importDir = File(importsBaseDir).toPath().resolve(inputPath.name)
        vertx.fileSystem().mkdirs(importDir.absolutePathString()).awaitSuspending()
        try {
            ZipFile(inputPath.toFile()).extractAll(importDir.absolutePathString())
            return vertx.fileSystem().listChildren(importDir).map { exportDir ->
                // Parse metadata and create model
                val metadata = vertx.fileSystem().readFromJson<Model>(exportDir.resolve(META_DATA_JSON))
                resetEntity(securityIdentity, metadata)
                metadata.storageKeys = mutableMapOf()
                Model.persist(metadata).awaitSuspending()

                // Set up map from old label IDs to new
                val labelIds = mutableMapOf<String, String>()

                // Import labels and vertices
                vertx.fileSystem().listChildren(exportDir.resolve(LABEL_FOLDER)).forEach { labelFile ->
                    val (label, vertices) = readLabel(labelFile)
                    val originalId = label.id.toString()
                    resetEntity(securityIdentity, label)
                    // Update model ref
                    label.modelId = metadata.id.toString()
                    Label.persist(label).awaitSuspending()
                    labelIds[originalId] = label.id.toString()
                    // Update vertices (reset ids)
                    vertices.id = null
                    vertices.labelId = label.id.toString()
                    LabelVertices.persist(vertices).awaitSuspending()
                }

                // Import quizzes & questions
                vertx.fileSystem().listChildren(exportDir.resolve(QUIZ_FOLDER)).forEach { quizFile ->
                    val (quiz, questions) = readQuiz(quizFile)
                    resetEntity(securityIdentity, quiz)
                    // Update model ref
                    quiz.modelId = metadata.id.toString()
                    Quiz.persist(quiz).awaitSuspending()
                    // Process questions
                    Question.persist(questions.map { q ->
                        // Refresh question
                        resetEntity(securityIdentity, q)
                        // Reset ids
                        q.quizId = quiz.id.toString()
                        q.labelId = labelIds[q.labelId]
                        q
                    }).awaitSuspending()
                }

                // Import binaries
                vertx.fileSystem().listChildren(exportDir.resolve(BINARIES_FOLDER)).forEach { binFile ->
                    val assetType = getAssetTypeFromFileName(binFile.name)
                    if (assetType != null) {
                        modelAssetManager.handleHttpAssetUpload(
                            securityIdentity,
                            metadata.id.toString(),
                            assetType,
                            binFile
                        )
                    }
                }
                metadata.id.toString()
            }
        } finally {
            vertx.fileSystem().deleteRecursive(importDir.absolutePathString(), true).awaitSuspending()
        }
    }

    suspend fun writeLabel(filePath: Path, label: Label, vertices: LabelVertices? = null) {
        val labelJson = JsonObject.mapFrom(label)
        if (vertices != null) {
            labelJson.put("data", vertices.data)
        }
        vertx.fileSystem().writeString(filePath, labelJson.encode())
    }

    suspend fun readLabel(filePath: Path): Pair<Label, LabelVertices> {
        val labelJson = JsonObject(vertx.fileSystem().readString(filePath))
        val label = labelJson.mapTo(Label::class.java)
        val verticesRaw = labelJson.getJsonArray("data")
        val labelVertices = LabelVertices(label.id.toString(), verticesRaw.map { it as Int }.toList())
        return Pair(label, labelVertices)
    }

    suspend fun writeQuiz(filePath: Path, quiz: Quiz, questions: List<Question> = emptyList()) {
        val quizJson = JsonObject.mapFrom(quiz)
        quizJson.put("questions", questions)
        vertx.fileSystem().writeString(filePath, quizJson.encode())
    }

    suspend fun readQuiz(filePath: Path): Pair<Quiz, List<Question>> {
        val quizJson = JsonObject(vertx.fileSystem().readString(filePath))
        val quiz = quizJson.mapTo(Quiz::class.java)
        val questions = quizJson.getJsonArray("questions").map {
            val question = (it as JsonObject).mapTo(Question::class.java)
            question.quizId = quiz.id.toString()
            question
        }
        return Pair(quiz, questions)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private suspend fun prepareExport(model: Model, targetDir: Path) {
        val outputDir = targetDir.resolve("${model.id}_${model.name}")
        vertx.fileSystem().mkdirs(outputDir.absolutePathString()).awaitSuspending()
        vertx.fileSystem().writeString(outputDir.resolve(META_DATA_JSON), Json.encode(model))

        // Write labels (+ vertices data)
        val labelsDir = outputDir.resolve(LABEL_FOLDER)
        vertx.fileSystem().mkdir(labelsDir.absolutePathString()).awaitSuspending()
        Label.stream(Eq(Label::modelId.name, model.id.toString()).toQueryDocument()).asFlow().onEach { label ->
            val vertices =
                LabelVertices.find(Eq(LabelVertices::labelId.name, label.id.toString()).toQueryDocument()).firstResult()
                    .awaitSuspending()
            writeLabel(labelsDir.resolve("${label.id}.json"), label, vertices)
        }.collect()

        // Write quizzes (& include questions)
        val quizzesDir = outputDir.resolve(QUIZ_FOLDER)
        vertx.fileSystem().mkdir(quizzesDir.absolutePathString()).awaitSuspending()
        Quiz.stream(Eq(Quiz::modelId.name, model.id.toString()).toQueryDocument()).asFlow().onEach { quiz ->
            val questions =
                Question.list(Eq(Question::quizId.name, quiz.id.toString()).toQueryDocument()).awaitSuspending()
            writeQuiz(quizzesDir.resolve("${quiz.id}.json"), quiz, questions)
        }.collect()

        // Write binaries
        val binariesDir = outputDir.resolve(BINARIES_FOLDER)
        vertx.fileSystem().mkdir(binariesDir.absolutePathString()).awaitSuspending()
        model.storageKeys.forEach { (type, assetId) ->
            val assetFileName = getAssetExtension(type)?.let { type.plus(it) }
            if (assetFileName != null) {
                val assetFile =
                    vertx.fileSystem()
                        .open(
                            binariesDir.resolve(assetFileName).absolutePathString(),
                            OpenOptions().setWrite(true).setCreate(true)
                        )
                        .awaitSuspending()
                modelAssetManager.getByteStream(model.id.toString(), ModelAssetType.valueOf(type), assetId).asFlow()
                    .onEach { buffer ->
                        assetFile.write(Buffer.buffer(buffer)).awaitSuspending()
                    }.collect()
            }
        }
    }

    private suspend fun cleanTempResources(directory: File) {
        try {
            vertx.fileSystem().deleteRecursive(directory.absolutePath, true).awaitSuspending()
            vertx.fileSystem().delete("${directory.absolutePath}.zip").awaitSuspending()
        } catch (err: Throwable) {
            Log.warn("Error while trying to clean temporary directory '$directory'", err)
        }
    }

    private suspend fun resetEntity(securityIdentity: SecurityIdentity, entity: OpenAnatomyEntity) {
        entity.id = null
        entity.createdAt = Instant.now()
        entity.lastModifiedAt = null
        entity.ownerUserId = securityIdentity.principal.name
    }

    @OptIn(ExperimentalStdlibApi::class)
    private fun getAssetExtension(type: String): String? {
        return ModelAssetType.valueOfOrNull(type)?.let { assetType ->
            when (assetType) {
                ModelAssetType.OBJECT -> modelObjectExtension.getOrNull()
                ModelAssetType.MATERIAL -> modelMaterialExtension.getOrNull()
                ModelAssetType.TEXTURE -> modelTextureExtension.getOrNull()
            }?:""
        }
    }

    @OptIn(ExperimentalStdlibApi::class)
    private fun getAssetTypeFromFileName(fileName: String): ModelAssetType? {
        fun applyOptionalExtension(optExt: Optional<String>): String {
            return optExt.getOrNull()?.let { fileName.removeSuffix(it) } ?: fileName
        }

        val typeString = when {
            fileName.startsWith(ModelAssetType.OBJECT.toString()) -> applyOptionalExtension(modelObjectExtension)
            fileName.startsWith(ModelAssetType.MATERIAL.toString()) -> applyOptionalExtension(modelMaterialExtension)
            fileName.startsWith(ModelAssetType.TEXTURE.toString()) -> applyOptionalExtension(modelTextureExtension)
            else -> null
        }
        return typeString?.let { ModelAssetType.valueOfOrNull(it) }
    }

}

abstract class ExportResult(val downloadPath: AsyncFile, val fileName: String) {

    abstract suspend fun clean()

}


