# Appuri Hogosha

Appuri Hogosha is a notification platform for sending alerts to students' parents. It provides:

- A **web admin panel** for composing and sending notifications.
- A **mobile app** for parents to receive and read messages.
- **Optional social media bots** for extended notification delivery.

## Components

### Admin Panel

- **Frontend ([`admin-panel-frontend`](./admin-panel-frontend/README.md)):** Built with Next.js.
- **Backend ([`admin-panel-backend`](./admin-panel-backend/README.md)):** Built with Express.js.

### Mobile App

- **Frontend (`mobile-frontend`):** Built with React Native.
- **Backend (`mobile-backend`):** Built with Express.js.

### Notification Service

- **Push Notifications (`push-notification`):** Manages mobile notification delivery.

### Social Media Bots

- **Bots (`bots`):** Contains modules for social media notifications.