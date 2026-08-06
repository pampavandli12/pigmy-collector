package expo.modules.whatsappreceipt

import android.content.ActivityNotFoundException
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class ExpoWhatsAppReceiptModule : Module() {
  private val reactContext
    get() = appContext.reactContext ?: throw ReceiptShareException(
      "E_CONTEXT_UNAVAILABLE",
      "Application context is unavailable."
    )

  override fun definition() = ModuleDefinition {
    Name("ExpoWhatsAppReceipt")

    AsyncFunction("sharePdfReceipt") { fileUri: String, phoneNumber: String ->
      val normalizedNumber = validatePhoneNumber(phoneNumber)
      val receiptFile = validateReceiptFile(fileUri)
      val packageName = findWhatsAppPackage()
      val receiptUri = contentUriFor(receiptFile)
      val intent = WhatsAppReceiptIntentFactory.create(
        packageName = packageName,
        receiptUri = receiptUri,
        phoneNumber = normalizedNumber
      )

      if (intent.resolveActivity(reactContext.packageManager) == null) {
        throw ReceiptShareException(
          "E_SHARE_UNSUPPORTED",
          "The installed WhatsApp app cannot receive PDF receipts."
        )
      }

      val activity = appContext.currentActivity ?: throw ReceiptShareException(
        "E_ACTIVITY_UNAVAILABLE",
        "Open the app and try sharing the receipt again."
      )

      try {
        activity.startActivity(intent)
      } catch (error: ActivityNotFoundException) {
        throw ReceiptShareException(
          "E_SHARE_LAUNCH_FAILED",
          "Unable to open WhatsApp.",
          error
        )
      } catch (error: SecurityException) {
        throw ReceiptShareException(
          "E_FILE_PERMISSION",
          "WhatsApp could not access the receipt file.",
          error
        )
      } catch (error: Exception) {
        throw ReceiptShareException(
          "E_SHARE_LAUNCH_FAILED",
          "Unable to open WhatsApp.",
          error
        )
      }

      mapOf("packageName" to packageName)
    }
  }

  private fun validatePhoneNumber(phoneNumber: String): String {
    if (!phoneNumber.matches(WHATSAPP_NUMBER)) {
      throw ReceiptShareException(
        "E_INVALID_PHONE_NUMBER",
        "The customer phone number is invalid."
      )
    }
    return phoneNumber
  }

  private fun validateReceiptFile(fileUri: String): File {
    val parsedUri = Uri.parse(fileUri)
    if (parsedUri.scheme != "file" || parsedUri.path.isNullOrBlank()) {
      throw ReceiptShareException(
        "E_INVALID_FILE_URI",
        "The receipt file location is invalid."
      )
    }

    val receiptRoot = File(reactContext.cacheDir, RECEIPT_DIRECTORY).canonicalFile
    val receiptFile = File(requireNotNull(parsedUri.path)).canonicalFile
    val rootPath = receiptRoot.path + File.separator

    if (!receiptFile.path.startsWith(rootPath)) {
      throw ReceiptShareException(
        "E_INVALID_FILE_URI",
        "The receipt must be stored in the protected receipt cache."
      )
    }
    if (!receiptFile.isFile || !receiptFile.canRead() || receiptFile.length() <= 0L) {
      throw ReceiptShareException(
        "E_RECEIPT_FILE_UNAVAILABLE",
        "The receipt PDF is missing or empty."
      )
    }

    return receiptFile
  }

  private fun findWhatsAppPackage(): String {
    val packageManager = reactContext.packageManager
    return WhatsAppPackageSelector.select { packageName ->
      try {
        packageManager.getApplicationInfo(packageName, 0).enabled
      } catch (_: PackageManager.NameNotFoundException) {
        false
      }
    } ?: throw ReceiptShareException(
      "E_WHATSAPP_UNAVAILABLE",
      "WhatsApp is not installed on this device."
    )
  }

  private fun contentUriFor(receiptFile: File): Uri = try {
    FileProvider.getUriForFile(
      reactContext,
      "${reactContext.packageName}.whatsappreceipt.fileprovider",
      receiptFile
    )
  } catch (error: IllegalArgumentException) {
    throw ReceiptShareException(
      "E_INVALID_FILE_URI",
      "The receipt file cannot be shared securely.",
      error
    )
  }

  companion object {
    private val WHATSAPP_NUMBER = Regex("^[1-9][0-9]{7,14}$")
    private const val RECEIPT_DIRECTORY = "whatsapp-receipts"
  }
}

private class ReceiptShareException(
  code: String,
  message: String,
  cause: Throwable? = null
) : CodedException(code, message, cause)
