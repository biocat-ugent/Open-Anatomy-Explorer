package idlab.openanatomy.backend.http.util

internal fun tokenize(filterExpression: String): List<String> {
    return "'([^']|\\.)*'|\\S+".toRegex().findAll(filterExpression.trim()).map { it.value }.toList()
}

internal class ODataFilterParser(private val tokens: List<String>) {

    constructor(filterExpression: String) : this(
        tokenize(filterExpression).flatMap { token ->
            // Split tokens if they start or end with a bracket
            if (token.startsWith("(") && token != "(") {
                listOf("(", token.removePrefix("("))
            } else if (token.endsWith(")") && token != ")") {
                listOf(token.removeSuffix(")"), ")")
            } else {
                listOf(token)
            }
        })

    private var index = 0
    private val buffer = ParseBuffer()

    fun toFilter(): Filter {
        while (index < tokens.size) {
            when (val token = tokens[index]) {
                in ComparisonOperator.operatorNames -> {
                    val filter = ComparisonOperator.from(token, buffer.asFieldName(), readNextValue())
                    buffer.resolve(filter)
                }
                in LogicalOperator.operatorNames -> {
                    val filter = LogicalOperator.from(token, listOf(buffer.asOperand()).plus(readNextOperands(token)))
                    buffer.resolve(filter)
                }
                "(" -> {
                    val filter = readSubFilter()
                    buffer.resolve(filter)
                }
                else -> {
                    buffer.feed(token)
                }
            }
            index++
        }
        return buffer.asOperand()
    }

    private fun readNextValue(): Any {
        val token = tokens[++index]
        return if (token.startsWith("'") && token.endsWith("'")) {
            token.removeSurrounding("'")
        } else if (token in setOf("true", "false")) {
            token.toBoolean()
        } else {
            token.toIntOrNull()
                ?: (token.toLongOrNull()
                    ?: (token.toDoubleOrNull()
                        ?: throw IllegalArgumentException("Value '$token' cannot be converted to a number!")))
        }
    }

    private fun readNextOperands(operator: String): List<Filter> {
        val nextTokens = tokens.drop(index + 1)
        val otherOperators = LogicalOperator.operatorNames.minus(operator)
        val sameOperandTokens = nextTokens.mapIndexed(::Pair)
            .takeWhile { (index, token) ->
                !nextTokens.isSequenceEnd(index)
                        && (!otherOperators.contains(token) || nextTokens.isInSubFilter(index))
            }
            .map { it.second }
        index += sameOperandTokens.size
        if (sameOperandTokens.isNotEmpty()) {
            return ODataFilterParser(sameOperandTokens).toFilter().let {
                if (it is LogicalOperator) {
                    it.operands
                } else {
                    listOf(it)
                }
            }
        } else {
            throw IllegalArgumentException("Logical operator '$operator' must have at least two operands!")
        }
    }

    private fun readSubFilter(): Filter {
        val closingTokenIndex = tokens.indexOfMatchingClosingBracket(index)
        if (closingTokenIndex != null) {
            val result = ODataFilterParser(tokens.subList(index + 1, closingTokenIndex)).toFilter()
            index = closingTokenIndex
            return result
        } else {
            throw IllegalArgumentException("Error while parsing subfilter: no closing bracket found!")
        }
    }

    private fun List<String>.indexOfMatchingClosingBracket(
        index: Int,
        openingToken: String = "(",
        closingToken: String = ")"
    ): Int? {
        if (this[index] != openingToken) {
            throw IllegalArgumentException("The provided index [$index, token: '${this[index]}'] is not an opening token '$openingToken'!")
        } else {
            val stack = ArrayDeque<String>()
            this.drop(index).forEachIndexed { i, c ->
                if (c == openingToken) {
                    stack.addLast(c)
                } else if (c == closingToken) {
                    stack.removeLastOrNull()
                    if (stack.isEmpty()) {
                        return index + i
                    }
                }
            }
            return null
        }
    }

    private fun List<String>.indexOfMatchingOpeningBracket(
        index: Int,
        openingToken: String = "(",
        closingToken: String = ")"
    ): Int? {
        return this.asReversed()
            .indexOfMatchingClosingBracket(
                this.size - index - 1,
                openingToken = closingToken,
                closingToken = openingToken
            )?.let { this.size - it - 1 }
    }

    private fun List<String>.isInSubFilter(
        index: Int,
        openingToken: String = "(",
        closingToken: String = ")"
    ): Boolean {
        return this.drop(index).indexOf(closingToken).takeIf { it >= 0 }
            ?.let { this.indexOfMatchingClosingBracket(it, openingToken, closingToken) != null } ?: false
    }

    private fun List<String>.isSequenceEnd(
        index: Int,
        openingToken: String = "(",
        closingToken: String = ")"
    ): Boolean {
        return this[index] == closingToken && indexOfMatchingOpeningBracket(index, openingToken, closingToken) == null
    }

}

private class ParseBuffer() {

    private var state: Any? = null

    fun feed(token: String) {
        state = token
    }

    fun asFieldName(): String {
        try {
            return state as String
        } catch (t: Throwable) {
            throw IllegalArgumentException("Error wile parsing filter: expected field name, but got $state", t)
        }
    }

    fun asOperand(): Filter {
        try {
            return state as Filter
        } catch (t: Throwable) {
            throw IllegalArgumentException("Error wile parsing filter: expected filter operand, but got $state", t)
        }
    }

    fun resolve(filter: Filter) {
        state = filter
    }

}

