self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification?.data?.url || "./index.html";
  event.waitUntil(clients.openWindow(url));
});
