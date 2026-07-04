package expo.modules.thermalprinter.managers

import android.annotation.SuppressLint
import android.bluetooth.BluetoothSocket
import android.content.Context
import expo.modules.thermalprinter.utils.BluetoothUtils
import java.io.IOException
import java.io.OutputStream
import kotlin.concurrent.thread

class BluetoothConnectionManager(
  private val context: Context,
  private val emitEvent: (String, Map<String, Any?>) -> Unit
) {
  @Volatile private var socket: BluetoothSocket? = null
  @Volatile private var outputStream: OutputStream? = null
  @Volatile private var manualDisconnect = false
  @Volatile private var reconnecting = false

  var lastConnectedAddress: String? = null
    private set

  val connectedAddress: String?
    get() = if (isConnected()) lastConnectedAddress else null

  fun isConnected(): Boolean {
    return socket?.isConnected == true
  }

  @SuppressLint("MissingPermission")
  fun connect(address: String): Boolean {
    val adapter = BluetoothUtils.adapter(context) ?: throw IllegalStateException("Bluetooth is not available")
    if (!BluetoothUtils.hasPermissions(context)) {
      throw SecurityException("Bluetooth permissions are not granted")
    }
    if (!adapter.isEnabled) {
      throw IllegalStateException("Bluetooth is disabled")
    }

    adapter.cancelDiscovery()
    closeCurrent()

    val device = adapter.getRemoteDevice(address)
    val nextSocket = device.createRfcommSocketToServiceRecord(BluetoothUtils.SPP_UUID)
    nextSocket.connect()

    socket = nextSocket
    outputStream = nextSocket.outputStream
    lastConnectedAddress = address
    manualDisconnect = false
    emitEvent("connected", BluetoothUtils.toPrinterDevice(device, address).toMap())
    monitorConnection(nextSocket, address)
    return true
  }

  fun disconnect() {
    manualDisconnect = true
    closeCurrent()
    emitEvent("disconnected", emptyMap())
  }

  @Synchronized
  @Throws(IOException::class)
  fun write(bytes: ByteArray) {
    val stream = outputStream ?: throw IOException("Printer is not connected")
    try {
      stream.write(bytes)
      stream.flush()
    } catch (error: IOException) {
      handleConnectionLost(error)
      throw error
    }
  }

  private fun monitorConnection(monitoredSocket: BluetoothSocket, address: String) {
    thread(name = "ExpoThermalPrinterMonitor", isDaemon = true) {
      try {
        val buffer = ByteArray(1)
        while (monitoredSocket == socket && monitoredSocket.isConnected) {
          val read = monitoredSocket.inputStream.read(buffer)
          if (read < 0) break
        }
        if (!manualDisconnect && monitoredSocket == socket) {
          handleConnectionLost(IOException("Bluetooth socket closed"))
        }
      } catch (error: IOException) {
        if (!manualDisconnect && monitoredSocket == socket) {
          handleConnectionLost(error)
        }
      }
    }
  }

  private fun handleConnectionLost(error: IOException) {
    if (manualDisconnect) return
    val address = lastConnectedAddress ?: return
    closeCurrent()
    emitEvent(
      "connectionLost",
      mapOf("address" to address, "message" to (error.message ?: "Connection lost"))
    )
    autoReconnect(address)
  }

  private fun autoReconnect(address: String) {
    if (reconnecting || manualDisconnect) return
    reconnecting = true
    thread(name = "ExpoThermalPrinterReconnect", isDaemon = true) {
      repeat(3) { attempt ->
        if (manualDisconnect) {
          reconnecting = false
          return@thread
        }
        try {
          Thread.sleep((attempt + 1) * 1000L)
          connect(address)
          reconnecting = false
          return@thread
        } catch (_: Exception) {
          // Keep trying until the retry budget is exhausted.
        }
      }
      reconnecting = false
    }
  }

  private fun closeCurrent() {
    try {
      outputStream?.close()
    } catch (_: IOException) {}
    try {
      socket?.close()
    } catch (_: IOException) {}
    outputStream = null
    socket = null
  }
}
