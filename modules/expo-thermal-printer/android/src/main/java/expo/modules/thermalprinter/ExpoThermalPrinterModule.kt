package expo.modules.thermalprinter

import android.bluetooth.BluetoothAdapter
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.thermalprinter.managers.BluetoothConnectionManager
import expo.modules.thermalprinter.managers.BluetoothPairingManager
import expo.modules.thermalprinter.managers.BluetoothPermissionManager
import expo.modules.thermalprinter.managers.BluetoothScanner
import expo.modules.thermalprinter.printer.EscPosPrinter
import expo.modules.thermalprinter.utils.BluetoothUtils

class ExpoThermalPrinterModule : Module() {
    private var enableBluetoothPromise: Promise? = null

    private val reactContext
        get() = appContext.reactContext ?: throw IllegalStateException("React Context unavailable")

    private val permissionManager by lazy {
        BluetoothPermissionManager(reactContext, appContext)
    }

    private val connectionManager by lazy {
        BluetoothConnectionManager(reactContext) { name, body -> sendEvent(name, body) }
    }

    private val scanner by lazy {
        BluetoothScanner(reactContext, connectionManager) { name, body -> sendEvent(name, body) }
    }

    private val pairingManager by lazy {
        BluetoothPairingManager(reactContext) { name, body -> sendEvent(name, body) }
    }

    private val printer by lazy {
        EscPosPrinter(connectionManager)
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoThermalPrinter")

        Events(
            "deviceFound",
            "scanStarted",
            "scanFinished",
            "paired",
            "connected",
            "disconnected",
            "connectionLost",
            "reconnectFailed"
        )

        OnDestroy {
            scanner.unregisterReceiver()
            pairingManager.clear()
            connectionManager.shutdown()
        }

        OnActivityResult { _, payload ->
            if (payload.requestCode == ENABLE_BLUETOOTH_REQUEST_CODE) {
                val enabled = BluetoothUtils.adapter(reactContext)?.isEnabled == true
                enableBluetoothPromise?.resolve(enabled)
                enableBluetoothPromise = null
            }
        }

        AsyncFunction("requestPermissions") { promise: Promise ->
            permissionManager.requestPermissions(promise)
        }

        AsyncFunction("isBluetoothEnabled") {
            BluetoothUtils.adapter(reactContext)?.isEnabled == true
        }

        AsyncFunction("enableBluetooth") { promise: Promise ->
            val adapter = BluetoothUtils.adapter(reactContext)
            if (adapter == null) {
                promise.reject("E_BLUETOOTH_UNAVAILABLE", "Bluetooth is not available", null)
            } else if (adapter.isEnabled) {
                promise.resolve(true)
            } else {
                val activity = appContext.currentActivity
                if (activity == null) {
                    promise.reject("E_ACTIVITY_UNAVAILABLE", "Current Android activity is unavailable", null)
                } else {
                    enableBluetoothPromise = promise
                    activity.startActivityForResult(
                        Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE),
                        ENABLE_BLUETOOTH_REQUEST_CODE
                    )
                }
            }
        }

        AsyncFunction("getPairedPrinters") {
            scanner.getPairedPrinters().map { it.toMap() }
        }

        AsyncFunction("startScan") {
            scanner.startScan()
        }

        AsyncFunction("stopScan") {
            scanner.stopScan()
        }

        AsyncFunction("pairPrinter") { address: String, promise: Promise ->
            pairingManager.pairPrinter(address, promise)
        }

        AsyncFunction("connect") { address: String ->
            connectionManager.connect(address)
        }

        AsyncFunction("disconnect") {
            connectionManager.disconnect()
        }

        AsyncFunction("isConnected") {
            connectionManager.isConnected()
        }

        AsyncFunction("printText") { text: String ->
            printer.printText(text)
        }

        AsyncFunction("printImage") { base64: String ->
            printer.printImage(base64)
        }

        AsyncFunction("printQr") { data: String ->
            printer.printQr(data)
        }

        AsyncFunction("printReceipt") { data: Map<String, Any?> ->
            printer.printReceipt(data)
        }
    }

    companion object {
        private const val ENABLE_BLUETOOTH_REQUEST_CODE = 4301
    }
}
