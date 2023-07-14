package idlab.openanatomy.backend.commons

import java.nio.charset.Charset
import java.util.Base64

fun String.fromBase64(charSet: Charset = Charsets.UTF_8): String {
    return Base64.getDecoder().decode(this.toByteArray(charSet)).toString(charSet)
}

fun String.toBase64(charSet: Charset = Charsets.UTF_8): String {
    return Base64.getEncoder().encodeToString(this.toByteArray(charSet))
}
