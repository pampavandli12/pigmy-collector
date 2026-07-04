import ExpoModulesCore

public class ExpoThermalPrinterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoThermalPrinter")

    Events(
      "deviceFound",
      "scanStarted",
      "scanFinished",
      "paired",
      "connected",
      "disconnected",
      "connectionLost"
    )

    AsyncFunction("requestPermissions") { false }
    AsyncFunction("isBluetoothEnabled") { false }
    AsyncFunction("enableBluetooth") { false }
    AsyncFunction("getPairedPrinters") { [] }
    AsyncFunction("startScan") { throw UnsupportedException() }
    AsyncFunction("stopScan") {}
    AsyncFunction("pairPrinter") { (_: String) throws -> Bool in throw UnsupportedException() }
    AsyncFunction("connect") { (_: String) throws -> Bool in throw UnsupportedException() }
    AsyncFunction("disconnect") {}
    AsyncFunction("isConnected") { false }
    AsyncFunction("printText") { (_: String) throws -> Void in throw UnsupportedException() }
    AsyncFunction("printImage") { (_: String) throws -> Void in throw UnsupportedException() }
    AsyncFunction("printQr") { (_: String) throws -> Void in throw UnsupportedException() }
    AsyncFunction("printReceipt") { (_: [String: Any]) throws -> Void in throw UnsupportedException() }
  }

  private final class UnsupportedException: Exception {
    override var reason: String {
      "ExpoThermalPrinter is only supported on Android"
    }
  }
}
