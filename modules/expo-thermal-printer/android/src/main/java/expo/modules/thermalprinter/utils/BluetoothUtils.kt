package expo.modules.thermalprinter.utils

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.thermalprinter.models.PrinterDevice
import java.util.UUID

object BluetoothUtils {
  val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  private val BLUETOOTH_ADDRESS_PATTERN = Regex("^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")

  fun adapter(context: Context): BluetoothAdapter? {
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return manager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
  }

  fun requiredPermissions(): Array<String> {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      arrayOf(
        Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.ACCESS_FINE_LOCATION
      )
    } else {
      arrayOf(
        Manifest.permission.BLUETOOTH,
        Manifest.permission.BLUETOOTH_ADMIN,
        Manifest.permission.ACCESS_FINE_LOCATION
      )
    }
  }

  fun hasPermissions(context: Context): Boolean {
    return requiredPermissions().all {
      ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }
  }

  fun requireValidAddress(address: String) {
    if (!BLUETOOTH_ADDRESS_PATTERN.matches(address.trim())) {
      throw IllegalArgumentException("Invalid Bluetooth address: $address")
    }
  }

  @SuppressLint("MissingPermission")
  fun deviceName(device: BluetoothDevice): String {
    return try {
      device.name ?: "Unknown Printer"
    } catch (_: SecurityException) {
      "Unknown Printer"
    }
  }

  @SuppressLint("MissingPermission")
  fun isPaired(device: BluetoothDevice): Boolean {
    return try {
      device.bondState == BluetoothDevice.BOND_BONDED
    } catch (_: SecurityException) {
      false
    }
  }

  fun isBluetoothClassic(device: BluetoothDevice): Boolean {
    return device.type == BluetoothDevice.DEVICE_TYPE_CLASSIC ||
      device.type == BluetoothDevice.DEVICE_TYPE_DUAL ||
      device.type == BluetoothDevice.DEVICE_TYPE_UNKNOWN
  }

  fun toPrinterDevice(device: BluetoothDevice, connectedAddress: String?): PrinterDevice {
    return PrinterDevice(
      name = deviceName(device),
      address = device.address,
      paired = isPaired(device),
      connected = connectedAddress != null && connectedAddress == device.address
    )
  }
}
