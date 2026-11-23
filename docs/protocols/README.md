# Wire Protocols & Payloads (`docs/protocols/`)

This directory houses wire specifications, payload schemas, and communication handshake protocols for **Speedy Site SaaS**.

---

## 🗺️ Protocol Specifications Index

| Protocol / Spec | Wire Transport | Endpoints | Description |
| :--- | :--- | :--- | :--- |
| [**RUM Beacon Transport**](rum-beacon-transport.md) | HTTPS POST / Beacon | `/collect` (buffer.speedy.site) | Real user monitoring beacon schema, Durable Object buffering, and flush payload |
| [**WordPress Plugin HMAC Handshake**](wordpress-hmac-protocol.md) | HTTPS JSON POST | `/api/wordpress/hmac*`, `/api/wordpress/injection` | Domain verification handshake, signature generation, and dynamic RUM injection decisions |

---

## 🛠️ Boundary Invariants

- **Low-Level Isolation**: Wire layouts, headers, and request payload definitions live strictly in `docs/protocols/`.
- **System Layer Decoupling**: High-level architecture dossiers in `docs/systems/` reference protocol names and endpoints rather than embedding wire structures directly.
