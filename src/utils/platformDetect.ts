// Platform detection utilities

export interface PlatformInfo {
  isSupported: boolean
  platform: 'desktop' | 'android' | 'ios' | 'unknown'
  browser: string
  message: string
}

export function detectWebBluetoothSupport(): PlatformInfo {
  // Check if Web Bluetooth API is available
  const isBluetoothAvailable = 'bluetooth' in navigator

  // Detect platform and browser
  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform.toLowerCase()

  let platformType: 'desktop' | 'android' | 'ios' | 'unknown' = 'unknown'
  let browserName = 'Unknown'
  let isSupported = false
  let message = ''

  // Detect iOS (iPhone, iPad)
  if (/iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
    platformType = 'ios'
    browserName = /safari/.test(userAgent) ? 'Safari' : /crios/.test(userAgent) ? 'Chrome' : /fxios/.test(userAgent) ? 'Firefox' : 'Browser'
    isSupported = false
    message = 'Web Bluetooth tidak didukung di iOS/iPadOS. Fitur printer Bluetooth tidak dapat digunakan di iPhone atau iPad, gunakan perangkat Android atau Desktop untuk mencetak struk.'
  }
  // Detect Android
  else if (/android/.test(userAgent)) {
    platformType = 'android'
    browserName = /chrome/.test(userAgent) ? 'Chrome' : /samsung/.test(userAgent) ? 'Samsung Internet' : 'Browser'

    if (isBluetoothAvailable) {
      isSupported = true
      message = 'Web Bluetooth didukung di perangkat ini.'
    } else {
      isSupported = false
      message = 'Web Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Samsung Internet untuk fitur printer Bluetooth.'
    }
  }
  // Desktop
  else {
    platformType = 'desktop'

    if (/edg/.test(userAgent)) {
      browserName = 'Edge'
    } else if (/chrome/.test(userAgent)) {
      browserName = 'Chrome'
    } else if (/opera|opr/.test(userAgent)) {
      browserName = 'Opera'
    } else if (/firefox/.test(userAgent)) {
      browserName = 'Firefox'
    } else if (/safari/.test(userAgent)) {
      browserName = 'Safari'
    }

    if (isBluetoothAvailable) {
      isSupported = true
      message = 'Web Bluetooth didukung di perangkat ini.'
    } else {
      isSupported = false
      if (browserName === 'Firefox' || browserName === 'Safari') {
        message = `Web Bluetooth tidak didukung di ${browserName}. Gunakan Chrome, Edge, atau Opera untuk fitur printer Bluetooth.`
      } else {
        message = 'Web Bluetooth tidak didukung di browser ini. Gunakan Chrome, Edge, atau Opera untuk fitur printer Bluetooth.'
      }
    }
  }

  return {
    isSupported,
    platform: platformType,
    browser: browserName,
    message
  }
}

export function getPlatformName(platform: string): string {
  switch (platform) {
    case 'ios':
      return 'iOS'
    case 'android':
      return 'Android'
    case 'desktop':
      return 'Desktop'
    default:
      return 'Unknown'
  }
}
