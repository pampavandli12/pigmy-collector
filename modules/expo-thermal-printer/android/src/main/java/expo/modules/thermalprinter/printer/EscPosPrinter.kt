package expo.modules.thermalprinter.printer

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import expo.modules.thermalprinter.managers.BluetoothConnectionManager
import java.io.ByteArrayOutputStream
import java.nio.charset.Charset
import kotlin.math.ceil
import kotlin.math.min

class EscPosPrinter(
  private val connectionManager: BluetoothConnectionManager
) {
  private val charset: Charset = Charsets.UTF_8

  @Synchronized
  fun printText(text: String) {
    val output = ByteArrayOutputStream()
    output.write(initializeCommand())
    output.write(text.toByteArray(charset))
    if (!text.endsWith("\n")) {
      output.write(lineFeedCommand())
    }
    write(output.toByteArray())
  }

  @Synchronized
  fun printQr(data: String) {
    val output = ByteArrayOutputStream()
    output.write(initializeCommand())
    output.write(alignCommand(1))
    val bytes = data.toByteArray(charset)
    val storeLength = bytes.size + 3
    output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))
    output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06))
    output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31))
    output.write(byteArrayOf(0x1D, 0x28, 0x6B, (storeLength and 0xFF).toByte(), ((storeLength shr 8) and 0xFF).toByte(), 0x31, 0x50, 0x30))
    output.write(bytes)
    output.write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))
    output.write(alignCommand(0))
    output.write(feedCommands(2))
    write(output.toByteArray())
  }

  @Synchronized
  fun printImage(base64: String) {
    val clean = base64.substringAfter(",", base64)
    val imageBytes = Base64.decode(clean, Base64.DEFAULT)
    val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
      ?: throw IllegalArgumentException("Invalid image data")
    val output = ByteArrayOutputStream()
    output.write(initializeCommand())
    output.write(alignCommand(1))
    output.write(bitmapToRaster(bitmap))
    output.write(alignCommand(0))
    output.write(feedCommands(2))
    write(output.toByteArray())
  }

  @Suppress("UNCHECKED_CAST")
  @Synchronized
  fun printReceipt(data: Map<String, Any?>) {
    val output = ByteArrayOutputStream()
    output.write(initializeCommand())
    output.write(alignCommand(1))
    output.write(textLineBytes(data["storeName"] as? String, bold = true, size = 1))
    output.write(textLineBytes(data["storeAddress"] as? String))
    output.write(textLineBytes((data["phone"] as? String)?.let { "Tel: $it" }))
    output.write(feedCommands(1))
    output.write(dividerBytes())

    output.write(alignCommand(0))
    output.write(textLineBytes("Receipt #: ${data["receiptNumber"] ?: ""}"))
    output.write(textLineBytes("Date: ${data["date"] ?: ""}"))
    output.write(dividerBytes())

    output.write(textLineBytes("Item"))
    val items = data["items"] as? List<Map<String, Any?>>
    items.orEmpty().forEach { item ->
      val name = item["name"]?.toString().orEmpty()
      val quantity = number(item["quantity"])
      val price = money(number(item["price"]))
      val total = money(number(item["total"]))
      output.write(textLineBytes(name))
      output.write(textLineBytes("  Qty: ${trimNumber(quantity)}  Price: $price  Total: $total"))
    }
    output.write(dividerBytes())

    output.write(totalLineBytes("Subtotal", data["subtotal"]))
    data["tax"]?.let { output.write(totalLineBytes("Tax", it)) }
    data["discount"]?.let { output.write(totalLineBytes("Discount", it, negative = true)) }
    output.write(dividerBytes())
    output.write(textLineBytes("TOTAL: ${money(number(data["total"]))}", bold = true, size = 1))
    data["paymentMethod"]?.let { output.write(textLineBytes("Payment: $it")) }
    output.write(dividerBytes())

    output.write(alignCommand(1))
    output.write(textLineBytes(data["footer"] as? String))
    output.write(textLineBytes("Thank you!"))
    output.write(feedCommands(3))
    output.write(cutCommand())
    write(output.toByteArray())
  }

  fun initialize() = write(initializeCommand())

  fun align(value: Int) = write(alignCommand(value))

  fun feed(lines: Int) {
    write(feedCommands(lines))
  }

  fun cut() {
    write(cutCommand())
  }

  private fun textLine(text: String?, bold: Boolean = false, size: Int = 0) {
    write(textLineBytes(text, bold, size))
  }

  private fun divider() {
    textLine("--------------------------------")
  }

  private fun totalLine(label: String, value: Any?, negative: Boolean = false) {
    write(totalLineBytes(label, value, negative))
  }

  private fun lineFeed() = write(lineFeedCommand())

  private fun write(bytes: ByteArray) = connectionManager.write(bytes)

  private fun initializeCommand() = byteArrayOf(0x1B, 0x40)

  private fun alignCommand(value: Int) = byteArrayOf(0x1B, 0x61, value.toByte())

  private fun lineFeedCommand() = byteArrayOf(0x0A)

  private fun cutCommand() = byteArrayOf(0x1D, 0x56, 0x42, 0x00)

  private fun feedCommands(lines: Int): ByteArray {
    val output = ByteArrayOutputStream()
    repeat(lines) { output.write(lineFeedCommand()) }
    return output.toByteArray()
  }

  private fun textLineBytes(text: String?, bold: Boolean = false, size: Int = 0): ByteArray {
    if (text.isNullOrBlank()) return byteArrayOf()

    val output = ByteArrayOutputStream()
    output.write(byteArrayOf(0x1B, 0x45, if (bold) 1 else 0))
    output.write(byteArrayOf(0x1D, 0x21, if (size > 0) 0x11 else 0x00))
    output.write(text.toByteArray(charset))
    output.write(lineFeedCommand())
    output.write(byteArrayOf(0x1D, 0x21, 0x00))
    output.write(byteArrayOf(0x1B, 0x45, 0x00))
    return output.toByteArray()
  }

  private fun dividerBytes() = textLineBytes("--------------------------------")

  private fun totalLineBytes(label: String, value: Any?, negative: Boolean = false): ByteArray {
    val amount = money(number(value))
    return textLineBytes("$label: ${if (negative) "-" else ""}$amount")
  }

  private fun number(value: Any?): Double {
    return when (value) {
      is Number -> value.toDouble()
      is String -> value.toDoubleOrNull() ?: 0.0
      else -> 0.0
    }
  }

  private fun money(value: Double): String = "%.2f".format(value)

  private fun trimNumber(value: Double): String {
    return if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
  }

  private fun bitmapToRaster(source: Bitmap): ByteArray {
    val maxWidth = 384
    val bitmap = if (source.width > maxWidth) {
      val ratio = maxWidth.toFloat() / source.width.toFloat()
      Bitmap.createScaledBitmap(source, maxWidth, (source.height * ratio).toInt(), true)
    } else {
      source
    }

    val widthBytes = ceil(bitmap.width / 8.0).toInt()
    val height = bitmap.height
    val output = ByteArrayOutputStream()
    output.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, (widthBytes and 0xFF).toByte(), ((widthBytes shr 8) and 0xFF).toByte(), (height and 0xFF).toByte(), ((height shr 8) and 0xFF).toByte()))

    for (y in 0 until height) {
      for (xByte in 0 until widthBytes) {
        var value = 0
        for (bit in 0 until 8) {
          val x = xByte * 8 + bit
          if (x < bitmap.width && isDark(bitmap.getPixel(x, y))) {
            value = value or (0x80 shr bit)
          }
        }
        output.write(value)
      }
    }
    return output.toByteArray()
  }

  private fun isDark(pixel: Int): Boolean {
    val red = (pixel shr 16) and 0xFF
    val green = (pixel shr 8) and 0xFF
    val blue = pixel and 0xFF
    val luminance = 0.299 * red + 0.587 * green + 0.114 * blue
    return luminance < min(200, 255)
  }
}
