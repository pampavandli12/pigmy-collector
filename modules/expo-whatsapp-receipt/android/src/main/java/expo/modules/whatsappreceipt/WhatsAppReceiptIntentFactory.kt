package expo.modules.whatsappreceipt

import android.content.ClipData
import android.content.Intent
import android.net.Uri

internal object WhatsAppReceiptIntentFactory {
  fun create(packageName: String, receiptUri: Uri, phoneNumber: String): Intent =
    Intent(Intent.ACTION_SEND).apply {
      type = PDF_MIME_TYPE
      setPackage(packageName)
      putExtra(Intent.EXTRA_STREAM, receiptUri)
      putExtra(WHATSAPP_JID_EXTRA, "$phoneNumber@s.whatsapp.net")
      clipData = ClipData.newRawUri("receipt", receiptUri)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

  private const val PDF_MIME_TYPE = "application/pdf"
  private const val WHATSAPP_JID_EXTRA = "jid"
}

internal object WhatsAppPackageSelector {
  fun select(isInstalled: (String) -> Boolean): String? =
    PACKAGES.firstOrNull(isInstalled)

  private val PACKAGES = listOf("com.whatsapp", "com.whatsapp.w4b")
}
