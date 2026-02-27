const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL?.trim() ??
  "http://notification-service.gaz.svc.cluster.local:8082";

type NotificationPayload = {
  message: string;
  details?: Record<string, string | number>;
};

export const sendNotification = async (payload: NotificationPayload) => {
  const response = await fetch(`${NOTIFICATION_SERVICE_URL.replace(/\/+$/, "")}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Notification service error (${response.status}): ${message}`);
  }
};
