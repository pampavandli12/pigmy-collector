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

  fun printText(text: String) {
    initialize()
    write(text.toByteArray(charset))
    if (!text.endsWith("\n")) {
      lineFeed()
    }
  }

  fun printQr(data: String) {
    initialize()
    align(1)
    val bytes = data.toByteArray(charset)
    val storeLength = bytes.size + 3
    write(byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))
    write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06))
    write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31))
    write(byteArrayOf(0x1D, 0x28, 0x6B, (storeLength and 0xFF).toByte(), ((storeLength shr 8) and 0xFF).toByte(), 0x31, 0x50, 0x30))
    write(bytes)
    write(byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))
    align(0)
    feed(2)
  }

  fun printImage(base64: String) {
    initialize()
    val clean = base64.substringAfter(",", base64)
    val imageBytes = Base64.decode(clean, Base64.DEFAULT)
    val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
      ?: throw IllegalArgumentException("Invalid image data")
    align(1)
    write(bitmapToRaster(bitmap))
    align(0)
    feed(2)
  }

  @Suppress("UNCHECKED_CAST")
  fun printReceipt(data: Map<String, Any?>) {
    initialize()
    align(1)
    textLine(data["storeName"] as? String, bold = true, size = 1)
    textLine(data["storeAddress"] as? String)
    textLine((data["phone"] as? String)?.let { "Tel: $it" })
    feed(1)
    divider()

    align(0)
    textLine("Receipt #: ${data["receiptNumber"] ?: ""}")
    textLine("Date: ${data["date"] ?: ""}")
    divider()

    textLine("Item")
    val items = data["items"] as? List<Map<String, Any?>>
    items.orEmpty().forEach { item ->
      val name = item["name"]?.toString().orEmpty()
      val quantity = number(item["quantity"])
      val price = money(number(item["price"]))
      val total = money(number(item["total"]))
      textLine(name)
      textLine("  Qty: ${trimNumber(quantity)}  Price: $price  Total: $total")
    }
    divider()

    totalLine("Subtotal", data["subtotal"])
    data["tax"]?.let { totalLine("Tax", it) }
    data["discount"]?.let { totalLine("Discount", it, negative = true) }
    divider()
    textLine("TOTAL: ${money(number(data["total"]))}", bold = true, size = 1)
    data["paymentMethod"]?.let { textLine("Payment: $it") }
    divider()

    align(1)
    textLine(data["footer"] as? String)
    textLine("Thank you!")
    feed(3)
    cut()
  }

  fun initialize() = write(byteArrayOf(0x1B, 0x40))

  fun align(value: Int) = write(byteArrayOf(0x1B, 0x61, value.toByte()))

  fun feed(lines: Int) {
    repeat(lines) { lineFeed() }
  }

  fun cut() {
    write(byteArrayOf(0x1D, 0x56, 0x42, 0x00))
  }

  private fun textLine(text: String?, bold: Boolean = false, size: Int = 0) {
    if (text.isNullOrBlank()) return
    write(byteArrayOf(0x1B, 0x45, if (bold) 1 else 0))
    write(byteArrayOf(0x1D, 0x21, if (size > 0) 0x11 else 0x00))
    write(text.toByteArray(charset))
    lineFeed()
    write(byteArrayOf(0x1D, 0x21, 0x00))
    write(byteArrayOf(0x1B, 0x45, 0x00))
  }

  private fun divider() {
    textLine("--------------------------------")
  }

  private fun totalLine(label: String, value: Any?, negative: Boolean = false) {
    val amount = money(number(value))
    textLine("$label: ${if (negative) "-" else ""}$amount")
  }

  private fun lineFeed() = write(byteArrayOf(0x0A))

  private fun write(bytes: ByteArray) = connectionManager.write(bytes)

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
