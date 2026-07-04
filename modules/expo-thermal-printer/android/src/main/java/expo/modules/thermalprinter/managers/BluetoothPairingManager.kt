package expo.modules.thermalprinter.managers

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.thermalprinter.utils.BluetoothUtils

class BluetoothPairingManager(
  private val context: Context,
  private val emitEvent: (String, Map<String, Any?>) -> Unit
) {
  private var pendingAddress: String? = null
  private var pendingPromise: Promise? = null
  private var receiverRegistered = false

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context?, intent: Intent?) {
      if (intent?.action != BluetoothDevice.ACTION_BOND_STATE_CHANGED) return

      val device = bluetoothDeviceFromIntent(intent) ?: return

      if (device.address != pendingAddress) return

      val state = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)
      when (state) {
        BluetoothDevice.BOND_BONDED -> {
          val printer = BluetoothUtils.toPrinterDevice(device, null).copy(paired = true)
          emitEvent("paired", printer.toMap())
          pendingPromise?.resolve(true)
          clear()
        }
        BluetoothDevice.BOND_NONE -> {
          pendingPromise?.reject("E_PAIRING_FAILED", "Failed to pair printer ${device.address}", null)
          clear()
        }
      }
    }
  }

  @SuppressLint("MissingPermission")
  fun pairPrinter(address: String, promise: Promise) {
    val adapter = BluetoothUtils.adapter(context)
    if (adapter == null) {
      promise.reject("E_BLUETOOTH_UNAVAILABLE", "Bluetooth is not available", null)
      return
    }
    if (!BluetoothUtils.hasPermissions(context)) {
      promise.reject("E_BLUETOOTH_PERMISSIONS", "Bluetooth permissions are not granted", null)
      return
    }

    val device = adapter.getRemoteDevice(address)
    if (device.bondState == BluetoothDevice.BOND_BONDED) {
      emitEvent("paired", BluetoothUtils.toPrinterDevice(device, null).toMap())
      promise.resolve(true)
      return
    }

    clear()
    pendingAddress = address
    pendingPromise = promise
    registerReceiver()

    val started = device.createBond()
    if (!started) {
      pendingPromise?.reject("E_PAIRING_FAILED", "Could not start pairing with $address", null)
      clear()
    }
  }

  private fun registerReceiver() {
    if (receiverRegistered) return
    ContextCompat.registerReceiver(
      context,
      receiver,
      IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED),
      ContextCompat.RECEIVER_EXPORTED
    )
    receiverRegistered = true
  }

  fun clear() {
    pendingAddress = null
    pendingPromise = null
    if (receiverRegistered) {
      try {
        context.unregisterReceiver(receiver)
      } catch (_: IllegalArgumentException) {
        // Receiver already gone.
      }
      receiverRegistered = false
    }
  }

  @Suppress("DEPRECATION")
  private fun bluetoothDeviceFromIntent(intent: Intent): BluetoothDevice? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
    } else {
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
    }
  }
}
