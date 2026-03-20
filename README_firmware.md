# Claude Usage Monitor — ESP8266 Firmware

## Hardware
- NodeMCU ESP-12E (ESP8266)
- SSD1306 0.96" OLED (I2C)
  - SDA → D2 (GPIO4)
  - SCL → D1 (GPIO5)
  - VCC → 3.3V
  - GND → GND

## Arduino IDE Setup

### Board
- Board: "NodeMCU 1.0 (ESP-12E Module)"
- Flash Size: 4MB (FS:2MB OTA:~1019KB)
- Upload Speed: 115200

### Libraries (install via Library Manager)
- U8g2 by oliver
- WiFiManager by tzapu
- ArduinoJson by Benoit Blanchon (v6.x)
- ESP8266HTTPClient (included with ESP8266 core)

## First Boot Setup (WiFi Only)

1. Flash the firmware.
2. On first boot, it creates a WiFi AP: **ClaudeMonitor**.
3. Connect to that AP on your phone/laptop → browser opens captive portal.
4. Enter your WiFi credentials so the device joins your Local Area Network.
5. The device will reboot, get an IP address, and show "waiting for config" on the OLED.

## Device Configuration (Extension Push)

You no longer need to manually copy-paste UUIDs or session cookies.
1. Connect your computer to the same WiFi network as the device.
2. Note the IP address displayed on the OLED screen.
3. Open the Claude Usage Monitor Chrome Extension **Settings**.
4. Enter the device IP under "IoT Push Target" and click **↑ Push to device**.

The extension will read your active `sessionKey` cookie and Org UUID, and HTTP POST them directly over your local network to the ESP8266.

## Updating Credentials & WiFi

- **Session updates:** The Chrome extension automatically repushes the latest session cookie in the background whenever the browser is open, so you'll never face manual session timeouts.
- **WiFi reset:** Hold the **FLASH button** (GPIO0) for 2 seconds to wipe the WiFi settings and reboot into Access Point mode.

## Security Note

`setInsecure()` skips TLS cert validation. This is acceptable for a personal
local widget — the data is non-sensitive usage stats on your own account.
If you want proper validation, extract the claude.ai cert fingerprint and
use `client.setFingerprint(fingerprint)` instead. You'll need to update it
when Anthropic rotates their cert.

## Display Layout

```text
CLAUDE USAGE            9:42p
─────────────────────────────
5HR   [████░░░░░░░]      9.0%
      resets 4h 57m
─────────────────────────────
7DAY  [██████░░░░░]     21.0%
      resets 6d 12h
─────────────────────────────
synced 3m ago
```
