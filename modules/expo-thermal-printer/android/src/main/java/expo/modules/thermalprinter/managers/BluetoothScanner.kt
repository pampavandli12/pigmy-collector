package expo.modules.thermalprinter.managers

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.thermalprinter.models.PrinterDevice
import expo.modules.thermalprinter.utils.BluetoothUtils

class BluetoothScanner(
  private val context: Context,
  private val connectionManager: BluetoothConnectionManager,
  private val emitEvent: (String, Map<String, Any?>) -> Unit
) {
  private val adapter: BluetoothAdapter?
    get() = BluetoothUtils.adapter(context)

  private val discovered = linkedMapOf<String, PrinterDevice>()
  private var receiverRegistered = false
  private var scanActive = false
  private var restartAfterCancellation = false

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context?, intent: Intent?) {
      when (intent?.action) {
        BluetoothDevice.ACTION_FOUND -> {
          val device = bluetoothDeviceFromIntent(intent)
          if (device != null && BluetoothUtils.isBluetoothClassic(device)) {
            emitDevice(device)
          }
        }
        BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
          if (restartAfterCancellation) {
            restartAfterCancellation = false
            startAdapterDiscovery()
          } else if (scanActive) {
            finishScan()
          }
        }
      }
    }
  }

  @SuppressLint("MissingPermission")
  fun getPairedPrinters(): List<PrinterDevice> {
    val bluetoothAdapter = adapter ?: return emptyList()
    return try {
      bluetoothAdapter.bondedDevices
        ?.filter { BluetoothUtils.isBluetoothClassic(it) }
        ?.map { BluetoothUtils.toPrinterDevice(it, connectionManager.connectedAddress) }
        ?: emptyList()
    } catch (_: SecurityException) {
      emptyList()
    }
  }

  @SuppressLint("MissingPermission")
  fun startScan() {
    val bluetoothAdapter = adapter ?: throw IllegalStateException("Bluetooth is not available")
    if (!BluetoothUtils.hasPermissions(context)) {
      throw SecurityException("Bluetooth permissions are not granted")
    }
    if (!bluetoothAdapter.isEnabled) {
      throw IllegalStateException("Bluetooth is disabled")
    }

    discovered.clear()
    registerReceiver()
    scanActive = true
    restartAfterCancellation = false
    emitEvent("scanStarted", emptyMap())

    getPairedPrinters().forEach { printer ->
      discovered[printer.address] = printer
      emitEvent("deviceFound", printer.toMap())
    }

    if (bluetoothAdapter.isDiscovering) {
      // Discovery cancellation is asynchronous. Wait for ACTION_DISCOVERY_FINISHED
      // before starting again, otherwise startDiscovery() commonly returns false.
      restartAfterCancellation = true
      bluetoothAdapter.cancelDiscovery()
      return
    }

    startAdapterDiscovery()
  }

  @SuppressLint("MissingPermission")
  fun stopScan() {
    val bluetoothAdapter = adapter
    restartAfterCancellation = false
    val wasActive = scanActive
    scanActive = false
    if (bluetoothAdapter?.isDiscovering == true) {
      bluetoothAdapter.cancelDiscovery()
    }
    unregisterReceiver()
    if (wasActive) {
      emitEvent("scanFinished", mapOf("devices" to discovered.values.map { it.toMap() }))
    }
  }

  @SuppressLint("MissingPermission")
  private fun startAdapterDiscovery() {
    val started = adapter?.startDiscovery() == true
    if (!started) finishScan()
  }

  private fun finishScan() {
    if (!scanActive) return
    scanActive = false
    emitEvent("scanFinished", mapOf("devices" to discovered.values.map { it.toMap() }))
  }

  @SuppressLint("MissingPermission")
  private fun emitDevice(device: BluetoothDevice) {
    if (discovered.containsKey(device.address)) return
    val printer = BluetoothUtils.toPrinterDevice(device, connectionManager.connectedAddress)
    discovered[printer.address] = printer
    emitEvent("deviceFound", printer.toMap())
  }

  private fun registerReceiver() {
    if (receiverRegistered) return
    val filter = IntentFilter().apply {
      addAction(BluetoothDevice.ACTION_FOUND)
      addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
    }
    ContextCompat.registerReceiver(
      context,
      receiver,
      filter,
      ContextCompat.RECEIVER_EXPORTED
    )
    receiverRegistered = true
  }

  @Suppress("DEPRECATION")
  private fun bluetoothDeviceFromIntent(intent: Intent): BluetoothDevice? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
    } else {
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
    }
  }

  fun unregisterReceiver() {
    if (!receiverRegistered) return
    try {
      context.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // Already unregistered by the system.
    }
    receiverRegistered = false
  }
}
