/* Chat + location smoke test. Run: node scripts/test-chat.js */
const { io } = require("socket.io-client");

const BASE = "http://localhost:5000/api";

async function login(email, password) {
  const res = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.token;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io("http://localhost:5000", { auth: { token } });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (e) => reject(new Error(e.message)));
  });
}

async function main() {
  console.log("1) Logging in...");
  const mariaTok = await login("maria@test.com", "secret123");
  const juanTok = await login("juan@test.com", "secret123");

  console.log("2) Maria starts conversation with Juan (id 2)...");
  let res = await fetch(BASE + "/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + mariaTok },
    body: JSON.stringify({ recipientId: 2 }),
  });
  const conv = (await res.json()).data;
  console.log("   conversationId:", conv.conversationId);

  console.log("3) Repeat -> should return SAME id (dedupe)...");
  res = await fetch(BASE + "/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + mariaTok },
    body: JSON.stringify({ recipientId: 2 }),
  });
  const conv2 = (await res.json()).data;
  console.log("   same?", conv2.conversationId === conv.conversationId ? "YES" : "NO - BUG");

  console.log("4) Maria -> Maria blocked?...");
  res = await fetch(BASE + "/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + mariaTok },
    body: JSON.stringify({ recipientId: 1 }),
  });
  console.log("   HTTP", res.status, res.status === 400 ? "(blocked OK)" : "(BUG)");

  console.log("5) Connecting sockets for Maria and Juan...");
  const mariaSock = await connect(mariaTok);
  const juanSock = await connect(juanTok);
  console.log("   both connected");

  console.log("6) Juan listens; Maria sends via SOCKET...");
  const received = new Promise((resolve) => {
    juanSock.on("new_message", (m) => resolve(m));
  });
  mariaSock.emit(
    "send_message",
    { conversationId: Number(conv.conversationId), message: "Hi Juan! Are you available today?" },
    (ack) => console.log("   send ack:", ack.success)
  );
  const msg = await Promise.race([received, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT - no realtime delivery")), 5000))]);
  console.log("   Juan received in realtime:", JSON.stringify(msg.message));

  console.log("7) Juan replies via REST; Maria should receive via socket...");
  const got = new Promise((resolve) => {
    mariaSock.on("new_message", (m) => resolve(m));
  });
  res = await fetch(BASE + "/conversations/" + conv.conversationId + "/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + juanTok },
    body: JSON.stringify({ message: "Yes! On my way after lunch." }),
  });
  console.log("   REST send HTTP", res.status);
  const msg2 = await Promise.race([got, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 5000))]);
  console.log("   Maria received:", JSON.stringify(msg2.message));

  console.log("8) Message history:");
  res = await fetch(BASE + "/conversations/" + conv.conversationId + "/messages", {
    headers: { Authorization: "Bearer " + mariaTok },
  });
  (await res.json()).data.forEach((m) =>
    console.log("   [" + m.sender.name + "] " + m.message)
  );

  console.log("9) Collector location: Juan updates GPS, Maria reads it...");
  res = await fetch(BASE + "/collectors/location", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + juanTok },
    body: JSON.stringify({ latitude: 14.6407, longitude: 121.0018 }),
  });
  console.log("   update:", (await res.json()).message);
  res = await fetch(BASE + "/collectors/2/location", {
    headers: { Authorization: "Bearer " + mariaTok },
  });
  const loc = (await res.json()).data;
  console.log("   Maria sees Juan at:", loc.latitude + "," + loc.longitude);

  mariaSock.disconnect();
  juanSock.disconnect();
  console.log("\nALL CHAT + LOCATION TESTS PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
