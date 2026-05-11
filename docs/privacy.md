# Privacy threat model — mesh-light-paint

## What other peers in the same room can see

- Your current brush settings: `{ pattern, hue, speed, offset, ts }` —
  published as a Yjs awareness field every 1.5 s.
- Your phone's wall-clock time (`Date.now()`), published every 1.5 s as part
  of the mesh clock sync.
- Your Yjs awareness `clientID` — a per-session 32-bit random integer
  regenerated on every page load.

That is the entire payload. No camera, no microphone, no location.

## What stays local

- Your room ID, pattern choice, hue, speed, and offset are persisted to
  `localStorage` and never leave your device beyond the brush awareness fan-out
  described above.

## What the signaling server can see

`signaling-server` sees the **room name** (`mesh-light-paint:<roomId>`),
encrypted SDP blobs, and your IP. It does **not** see your pattern or hue —
application traffic flows peer-to-peer over WebRTC DataChannel.

## What the TURN server can see

`coturn-hetzner` relays encrypted WebRTC traffic when peers cannot connect
directly. It sees IP addresses and encrypted DTLS-SRTP / DataChannel bytes
but cannot decrypt them.

## Permissions asked

None. No camera. No microphone. No DeviceMotion. No DeviceOrientation. The
photograph is taken by your real camera, not by the browser.

## What's NOT in the threat model

- Stable identity. The Yjs clientID rotates per page load.
- Network observers. Hostile Wi-Fi can see the WebSocket connection to
  `turn.0docker.com` and a relay flow if TURN is needed; they cannot decrypt
  the contents.
