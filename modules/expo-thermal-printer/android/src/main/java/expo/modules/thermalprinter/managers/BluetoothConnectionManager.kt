package expo.modules.thermalprinter.managers

import android.annotation.SuppressLint
import android.bluetooth.BluetoothSocket
import android.content.Context
import expo.modules.thermalprinter.utils.BluetoothUtils
import java.io.IOException
import java.io.OutputStream
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import kotlin.concurrent.thread
import kotlin.math.min

class BluetoothConnectionManager(
  private val context: Context,
  private val emitEvent: (String, Map<String, Any?>) -> Unit
) {
  private val connectExecutor = Executors.newSingleThreadExecutor()
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
    BluetoothUtils.requireValidAddress(address)
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
    try {
      connectWithTimeout(nextSocket)

      socket = nextSocket
      outputStream = nextSocket.outputStream
      lastConnectedAddress = address
      manualDisconnect = false
      emitEvent("connected", BluetoothUtils.toPrinterDevice(device, address).toMap())
      monitorConnection(nextSocket, address)
      return true
    } catch (error: Exception) {
      try {
        nextSocket.close()
      } catch (_: IOException) {}
      throw error
    }
  }

  fun disconnect() {
    manualDisconnect = true
    closeCurrent()
    emitEvent("disconnected", emptyMap())
  }

  @Synchronized
  @Throws(IOException::class)
  fun write(bytes: ByteArray) {
    if (bytes.isEmpty()) return

    try {
      var offset = 0
      while (offset < bytes.size) {
        val stream = outputStream ?: throw IOException("Printer is not connected")
        if (socket?.isConnected != true) {
          throw IOException("Printer connection is closed")
        }

        val length = min(WRITE_CHUNK_SIZE, bytes.size - offset)
        stream.write(bytes, offset, length)
        stream.flush()
        offset += length

        if (offset < bytes.size) {
          Thread.sleep(INTER_CHUNK_DELAY_MS)
        }
      }

      val stream = outputStream ?: throw IOException("Printer is not connected")
      stream.flush()
    } catch (error: IOException) {
      handleConnectionLost(error)
      throw error
    } catch (error: InterruptedException) {
      Thread.currentThread().interrupt()
      val ioError = IOException("Printer write was interrupted", error)
      handleConnectionLost(ioError)
      throw ioError
    }
  }

  fun shutdown() {
    disconnect()
    connectExecutor.shutdownNow()
  }

  private fun connectWithTimeout(nextSocket: BluetoothSocket) {
    val future = connectExecutor.submit {
      nextSocket.connect()
    }

    try {
      future.get(CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
    } catch (error: TimeoutException) {
      future.cancel(true)
      try {
        nextSocket.close()
      } catch (_: IOException) {}
      throw IOException("Timed out connecting to printer", error)
    } catch (error: ExecutionException) {
      val cause = error.cause
      if (cause is IOException) throw cause
      if (cause is RuntimeException) throw cause
      throw IOException("Failed to connect to printer", cause)
    } catch (error: InterruptedException) {
      Thread.currentThread().interrupt()
      throw IOException("Printer connection was interrupted", error)
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
      emitEvent(
        "reconnectFailed",
        mapOf("address" to address, "message" to "Failed to reconnect to printer")
      )
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

  companion object {
    private const val CONNECT_TIMEOUT_MS = 10000L
    private const val WRITE_CHUNK_SIZE = 256
    private const val INTER_CHUNK_DELAY_MS = 20L
  }
}
