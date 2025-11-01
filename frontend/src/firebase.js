import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission()
  if (permission === "granted") {
    const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" })
    return token
  }
}

export { messaging, onMessage }
