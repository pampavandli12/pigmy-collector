package expo.modules.thermalprinter.models

data class PrinterDevice(
  val name: String,
  val address: String,
  val paired: Boolean,
  val connected: Boolean
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "name" to name,
    "address" to address,
    "paired" to paired,
    "connected" to connected
  )
}
