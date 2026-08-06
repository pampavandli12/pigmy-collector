package expo.modules.whatsappreceipt

import android.content.Intent
import android.net.Uri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class WhatsAppReceiptIntentFactoryTest {
  @Test
  fun createsOnePackageTargetedPdfIntentWithRecipientAndReadAccess() {
    val receiptUri = Uri.parse(
      "content://com.example.whatsappreceipt.fileprovider/whatsapp_receipts/receipt.pdf"
    )

    val intent = WhatsAppReceiptIntentFactory.create(
      packageName = "com.whatsapp",
      receiptUri = receiptUri,
      phoneNumber = "919123456780"
    )

    assertEquals(Intent.ACTION_SEND, intent.action)
    assertEquals("application/pdf", intent.type)
    assertEquals("com.whatsapp", intent.`package`)
    assertNull(intent.component)
    assertEquals(receiptUri, intent.getParcelableExtra(Intent.EXTRA_STREAM))
    assertEquals("919123456780@s.whatsapp.net", intent.getStringExtra("jid"))
    assertEquals(receiptUri, intent.clipData?.getItemAt(0)?.uri)
    assertTrue(intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
    assertTrue(intent.getStringExtra(Intent.EXTRA_TEXT).isNullOrEmpty())
  }

}
