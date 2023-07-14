package idlab.openanatomy.backend.commons

import io.smallrye.mutiny.coroutines.awaitSuspending
import io.vertx.core.file.OpenOptions
import io.vertx.core.json.Json
import io.vertx.mutiny.core.buffer.Buffer
import io.vertx.mutiny.core.file.FileSystem
import java.nio.file.Path
import kotlin.io.path.absolutePathString

suspend fun FileSystem.writeString(filePath: Path, string: String, autoCreate: Boolean = true) {
    writeBuffer(filePath, Buffer.buffer(string), autoCreate)
}

suspend fun FileSystem.writeBinary(filePath: Path, byteArray: ByteArray, autoCreate: Boolean = true) {
    writeBuffer(filePath, Buffer.buffer(byteArray), autoCreate)
}

suspend fun FileSystem.writeAsJson(filePath: Path, instance: Any) {
    writeString(filePath, Json.encode(instance))
}

suspend fun FileSystem.writeBuffer(filePath: Path, buffer: Buffer, autoCreate: Boolean = true) {
    val fileHandle =
        this.open(filePath.absolutePathString(), OpenOptions().setWrite(true).setCreate(autoCreate)).awaitSuspending()
    fileHandle.write(buffer).awaitSuspending()
}

suspend fun FileSystem.readString(filePath: Path): String {
    return readBuffer(filePath).toString()
}

suspend fun FileSystem.readBinary(filePath: Path): ByteArray {
    return readBuffer(filePath).bytes
}

suspend inline fun <reified T : Any> FileSystem.readFromJson(filePath: Path): T {
    val jsonString = readString(filePath)
    return Json.decodeValue(jsonString, T::class.java)
}

suspend fun FileSystem.readBuffer(filePath: Path): Buffer {
    val fileHandle = this.open(filePath.absolutePathString(), OpenOptions().setRead(true)).awaitSuspending()
    val resultBuffer = Buffer.buffer()
    return fileHandle.read(resultBuffer, 0, 0, fileHandle.size().awaitSuspending().toInt()).awaitSuspending()
}

suspend fun FileSystem.listChildren(directoryPath: Path): List<Path> {
    return this.readDir(directoryPath.absolutePathString()).awaitSuspending().map { Path.of(it) }
}
