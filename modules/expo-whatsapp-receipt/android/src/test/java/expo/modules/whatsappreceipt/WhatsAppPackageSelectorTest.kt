package expo.modules.whatsappreceipt

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WhatsAppPackageSelectorTest {
  @Test
  fun prefersPersonalWhatsAppWhenBothPackagesAreInstalled() {
    val selected = WhatsAppPackageSelector.select { true }

    assertEquals("com.whatsapp", selected)
  }

  @Test
  fun fallsBackToWhatsAppBusiness() {
    val selected = WhatsAppPackageSelector.select { it == "com.whatsapp.w4b" }

    assertEquals("com.whatsapp.w4b", selected)
  }

  @Test
  fun returnsNullWhenWhatsAppIsNotInstalled() {
    val selected = WhatsAppPackageSelector.select { false }

    assertNull(selected)
  }
}
