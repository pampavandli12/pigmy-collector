package expo.modules.thermalprinter.managers

import android.content.Context
import expo.modules.interfaces.permissions.PermissionsResponse
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.thermalprinter.utils.BluetoothUtils

class BluetoothPermissionManager(
  private val context: Context,
  private val appContext: AppContext
) {
  fun hasPermissions(): Boolean = BluetoothUtils.hasPermissions(context)

  fun requestPermissions(promise: Promise) {
    if (hasPermissions()) {
      promise.resolve(true)
      return
    }

    val permissions = appContext.permissions
    if (permissions == null) {
      promise.reject("E_NO_PERMISSIONS", "Expo permissions module is unavailable", null)
      return
    }

    permissions.askForPermissions({ result: Map<String, PermissionsResponse> ->
      val granted = result.values.all { it.status == PermissionsStatus.GRANTED }
      promise.resolve(granted)
    }, *BluetoothUtils.requiredPermissions())
  }
}
