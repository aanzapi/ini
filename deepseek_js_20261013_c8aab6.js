const fs = require("fs");
const path = require("path");

const { Api } = require("telegram");

const config = require("./config");

const DB_FILE = path.join(__dirname, "database.json");

const START_TIME = Date.now();

let commandCounter = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmt(n) {
  return new Intl.NumberFormat("id-ID").format(Number(n) || 0);
}

function isOwner(id) {
  if (id === undefined || id === null) {
    return false;
  }

  return Number(id) === Number(config.OWNER_ID);
}

function mention(id, name) {
  const safeName = String(name || "User")
    .replace(/]/g, "")
    .replace(/\[/g, "");

  return `[${safeName}](tg://user?id=${id})`;
}

function chunk(arr, size) {
  const result = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result;
}

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}h`);
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function formatTimeAgo(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) return `${totalSeconds} detik lalu`;

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultDB = {
        blacklist: [],
        afk: {
          enabled: false,
          message: ""
        }
      };

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(defaultDB, null, 2),
        "utf8"
      );

      return defaultDB;
    }

    const raw = fs.readFileSync(DB_FILE, "utf8").trim();

    if (!raw) {
      return {
        blacklist: [],
        afk: { enabled: false, message: "" }
      };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.blacklist)) {
      parsed.blacklist = [];
    }

    if (!parsed.afk || typeof parsed.afk !== "object") {
      parsed.afk = { enabled: false, message: "" };
    }

    if (typeof parsed.afk.enabled !== "boolean") {
      parsed.afk.enabled = false;
    }

    if (typeof parsed.afk.message !== "string") {
      parsed.afk.message = "";
    }

    return parsed;
  } catch (err) {
    console.error("[DATABASE LOAD ERROR]", err);

    return {
      blacklist: [],
      afk: { enabled: false, message: "" }
    };
  }
}

function saveDB(db) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );

    return true;
  } catch (err) {
    console.error("[DATABASE SAVE ERROR]", err);
    return false;
  }
}

function normalizeId(id) {
  if (id === undefined || id === null) {
    return null;
  }

  const value = String(id).trim();

  if (!/^-?\d+$/.test(value)) {
    return null;
  }

  return value;
}

function isBlacklisted(id) {
  const normalized = normalizeId(id);

  if (!normalized) {
    return false;
  }

  const db = loadDB();

  return db.blacklist.some(
    (item) => String(item) === normalized
  );
}

function addBlacklist(id) {
  const normalized = normalizeId(id);

  if (!normalized) {
    return false;
  }

  const db = loadDB();

  if (
    db.blacklist.some(
      (item) => String(item) === normalized
    )
  ) {
    return false;
  }

  db.blacklist.push(normalized);

  saveDB(db);

  return true;
}

function removeBlacklist(id) {
  const normalized = normalizeId(id);

  if (!normalized) {
    return false;
  }

  const db = loadDB();

  const oldLength = db.blacklist.length;

  db.blacklist = db.blacklist.filter(
    (item) => String(item) !== normalized
  );

  if (db.blacklist.length === oldLength) {
    return false;
  }

  saveDB(db);

  return true;
}

function getAfk() {
  const db = loadDB();
  return db.afk;
}

function setAfk(enabled, message) {
  const db = loadDB();

  db.afk = {
    enabled: Boolean(enabled),
    message: String(message || "")
  };

  if (enabled) {
    db.afk.since = Date.now();
  } else {
    delete db.afk.since;
  }

  saveDB(db);

  return db.afk;
}

async function reply(event, text, opts = {}) {
  if (!event || !event.message) {
    return null;
  }

  return await event.message.reply({
    message: text,
    ...opts
  });
}

async function getReplyMessage(event) {
  if (!event || !event.message) {
    return null;
  }

  return await event.message.getReplyMessage();
}

function detectMedia(msg) {
  if (!msg || !msg.media) {
    return null;
  }

  if (msg.media instanceof Api.MessageMediaPhoto) {
    return {
      type: "photo",
      media: msg.media
    };
  }

  if (msg.media instanceof Api.MessageMediaDocument) {
    const document = msg.media.document;

    if (!document) {
      return null;
    }

    const mimeType = String(document.mimeType || "")
      .toLowerCase();

    if (mimeType.startsWith("video/")) {
      return {
        type: "video",
        media: msg.media
      };
    }

    if (mimeType.startsWith("image/")) {
      return {
        type: "photo",
        media: msg.media
      };
    }
  }

  return null;
}

function getSenderId(event) {
  if (!event || !event.message) {
    return null;
  }

  if (event.message.senderId !== undefined) {
    return Number(event.message.senderId);
  }

  return null;
}

function getEntityId(entity) {
  if (!entity || entity.id === undefined) {
    return null;
  }

  return String(entity.id);
}

function isDeletedUser(entity) {
  return Boolean(
    entity &&
    (
      entity instanceof Api.User &&
      entity.deleted === true
    )
  );
}

function isBotUser(entity) {
  return Boolean(
    entity &&
    (
      entity instanceof Api.User &&
      entity.bot === true
    )
  );
}

function isPrivateUser(entity) {
  return Boolean(
    entity &&
    entity instanceof Api.User &&
    !entity.bot &&
    !entity.deleted
  );
}

function isGroupEntity(entity) {
  if (!entity) {
    return false;
  }

  if (entity instanceof Api.Chat) {
    return true;
  }

  if (entity instanceof Api.Channel) {
    return Boolean(entity.megagroup === true);
  }

  return false;
}

function isBroadcastChannel(entity) {
  return Boolean(
    entity instanceof Api.Channel &&
    entity.broadcast === true &&
    entity.megagroup !== true
  );
}

function getDisplayName(entity) {
  if (!entity) {
    return "User";
  }

  if (entity instanceof Api.User) {
    const first = entity.firstName || "";
    const last = entity.lastName || "";
    const full = `${first} ${last}`.trim();

    if (full) {
      return full;
    }

    if (entity.username) {
      return `@${entity.username}`;
    }

    return String(entity.id);
  }

  if (entity.title) {
    return entity.title;
  }

  return String(entity.id);
}

function getFloodWaitSeconds(err) {
  if (!err) {
    return 0;
  }

  if (
    err.seconds !== undefined &&
    Number.isFinite(Number(err.seconds))
  ) {
    return Number(err.seconds);
  }

  if (
    err.errorMessage &&
    typeof err.errorMessage === "string"
  ) {
    const match = err.errorMessage.match(
      /FLOOD_WAIT[_ ]?(\d+)/i
    );

    if (match) {
      return Number(match[1]);
    }
  }

  if (err.message && typeof err.message === "string") {
    const match = err.message.match(
      /FLOOD_WAIT[_ ]?(\d+)/i
    );

    if (match) {
      return Number(match[1]);
    }
  }

  return 0;
}

function parseCommand(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const prefix = config.PREFIX;

  if (!text.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = text.slice(prefix.length).trim();

  if (!withoutPrefix) {
    return null;
  }

  const firstSpace = withoutPrefix.search(/\s/);

  let command;
  let args;

  if (firstSpace === -1) {
    command = withoutPrefix.toLowerCase();
    args = "";
  } else {
    command = withoutPrefix
      .slice(0, firstSpace)
      .toLowerCase();

    args = withoutPrefix
      .slice(firstSpace + 1)
      .trim();
  }

  return {
    command,
    args
  };
}

async function sendBroadcastMedia(
  client,
  target,
  mediaInfo,
  caption
) {
  return await client.sendFile(target, {
    file: mediaInfo.media,
    caption: caption || ""
  });
}

async function sendBroadcastText(
  client,
  target,
  text
) {
  return await client.sendMessage(target, {
    message: text
  });
}

async function sendWithFloodRetry(
  sendFunction
) {
  try {
    await sendFunction();
    return {
      success: true,
      retried: false
    };
  } catch (err) {
    const seconds = getFloodWaitSeconds(err);

    if (!seconds) {
      return {
        success: false,
        retried: false,
        error: err
      };
    }

    console.log(
      `[BROADCAST] FloodWait ${seconds}s. Retry sekali setelah menunggu.`
    );

    await sleep((seconds + 2) * 1000);

    try {
      await sendFunction();

      return {
        success: true,
        retried: true
      };
    } catch (retryError) {
      return {
        success: false,
        retried: true,
        error: retryError
      };
    }
  }
}

async function getBroadcastTargets(
  client,
  mode,
  blacklist
) {
  const dialogs = await client.getDialogs({
    limit: 1000
  });

  const targets = [];
  const seen = new Set();

  for (const dialog of dialogs) {
    try {
      const entity = dialog.entity;

      if (!entity) {
        continue;
      }

      const entityId = getEntityId(entity);

      if (!entityId) {
        continue;
      }

      if (seen.has(entityId)) {
        continue;
      }

      seen.add(entityId);

      if (
        blacklist.some(
          (id) => String(id) === String(entityId)
        )
      ) {
        continue;
      }

      if (entity instanceof Api.User) {
        if (isDeletedUser(entity)) {
          continue;
        }

        if (isBotUser(entity)) {
          continue;
        }

        if (
          Number(entity.id) === Number(config.OWNER_ID)
        ) {
          continue;
        }

        if (
          mode === "broadcast" ||
          mode === "private"
        ) {
          if (isPrivateUser(entity)) {
            targets.push(entity);
          }
        }

        continue;
      }

      if (isGroupEntity(entity)) {
        if (
          mode === "broadcast" ||
          mode === "group"
        ) {
          targets.push(entity);
        }

        continue;
      }

      if (isBroadcastChannel(entity)) {
        continue;
      }
    } catch (err) {
      console.error(
        "[TARGET FILTER ERROR]",
        err
      );
    }
  }

  return targets;
}

async function executeBroadcast(
  event,
  client,
  mode,
  payload
) {
  const db = loadDB();

  const mediaInfo = payload.mediaInfo;
  const text = payload.text || "";

  let targets;

  try {
    targets = await getBroadcastTargets(
      client,
      mode,
      db.blacklist
    );
  } catch (err) {
    await reply(
      event,
      `Gagal mengambil daftar target.\n\nError: ${err.message}`
    );

    return;
  }

  const total = targets.length;
  let success = 0;
  let failed = 0;

  const startedAt = Date.now();

  await reply(
    event,
    [
      "Broadcast dimulai.",
      "",
      `Mode: ${mode}`,
      `Target: ${fmt(total)}`,
      `Delay: ${fmt(config.BROADCAST_DELAY)} ms`
    ].join("\n")
  );

  for (let index = 0; index < targets.length; index++) {
    const target = targets[index];

    try {
      const result = await sendWithFloodRetry(
        async () => {
          if (mediaInfo) {
            await sendBroadcastMedia(
              client,
              target,
              mediaInfo,
              text
            );
          } else {
            await sendBroadcastText(
              client,
              target,
              text
            );
          }
        }
      );

      if (result.success) {
        success++;

        console.log(
          `[BROADCAST] ${index + 1}/${total} SUCCESS -> ${getDisplayName(target)}`
        );
      } else {
        failed++;

        console.error(
          `[BROADCAST] ${index + 1}/${total} FAILED -> ${getDisplayName(target)}`,
          result.error
        );
      }
    } catch (err) {
      failed++;

      console.error(
        `[BROADCAST] ${index + 1}/${total} ERROR -> ${getDisplayName(target)}`,
        err
      );
    }

    if (index < targets.length - 1) {
      await sleep(config.BROADCAST_DELAY);
    }
  }

  const durationMs = Date.now() - startedAt;
  const durationSec = (durationMs / 1000).toFixed(1);

  await reply(
    event,
    [
      "Broadcast selesai.",
      "",
      `Total target : ${fmt(total)}`,
      `Berhasil     : ${fmt(success)}`,
      `Gagal        : ${fmt(failed)}`,
      `Durasi       : ${durationSec} detik`
    ].join("\n")
  );
}

async function handleMenu(
  event,
  owner
) {
  const lines = [
    "╭━━━「 USERBOT 」━━━╮",
    `┃ Prefix: ${config.PREFIX}`,
    "┃",
    `┃ ${config.PREFIX}menu`,
    `┃ ${config.PREFIX}ping`,
    `┃ ${config.PREFIX}id (reply)`,
    `┃ ${config.PREFIX}info (reply)`,
    `┃ ${config.PREFIX}stats`,
    `┃ ${config.PREFIX}tagall [teks]`,
    `┃ ${config.PREFIX}copytext (reply)`,
    `┃ ${config.PREFIX}save (reply)`,
    `┃ ${config.PREFIX}pin (reply)`,
    `┃ ${config.PREFIX}unpin`,
    `┃ ${config.PREFIX}afk on/off <pesan>`,
    "┃"
  ];

  if (owner) {
    lines.push(
      `┃ ${config.PREFIX}broadcast <teks>`,
      `┃ ${config.PREFIX}bc <teks>`,
      `┃ ${config.PREFIX}bcgroup <teks>`,
      `┃ ${config.PREFIX}bcg <teks>`,
      `┃ ${config.PREFIX}bcprivate <teks>`,
      `┃ ${config.PREFIX}bcp <teks>`,
      `┃`,
      `┃ ${config.PREFIX}addbl`,
      `┃ ${config.PREFIX}delbl`,
      `┃ ${config.PREFIX}listbl`
    );
  }

  lines.push(
    "╰━━━━━━━━━━━━━━━━━━╯"
  );

  await reply(
    event,
    lines.join("\n")
  );
}

async function handlePing(event) {
  const start = Date.now();

  const sent = await reply(event, "🏓 Pong!");

  const elapsed = Date.now() - start;

  if (sent && typeof sent.edit === "function") {
    try {
      await sent.edit({
        message: `🏓 Pong! ${elapsed}ms`
      });
    } catch (_) {}
  }
}

async function handleId(event) {
  const replied = await getReplyMessage(event);

  const lines = [];

  if (replied) {
    let senderId = null;

    if (
      replied.senderId !== undefined &&
      replied.senderId !== null
    ) {
      senderId = String(replied.senderId);
    } else {
      try {
        const sender = await replied.getSender();

        if (sender && sender.id !== undefined) {
          senderId = String(sender.id);
        }
      } catch (_) {}
    }

    if (senderId) {
      lines.push(`User ID : ${senderId}`);
    }

    if (
      replied.chatId !== undefined &&
      replied.chatId !== null
    ) {
      lines.push(`Chat ID : ${String(replied.chatId)}`);
    }
  } else {
    try {
      const chat = await event.message.getChat();

      if (chat && chat.id !== undefined) {
        lines.push(`Chat ID : ${String(chat.id)}`);
      }
    } catch (_) {}
  }

  const senderId = getSenderId(event);

  if (senderId !== null) {
    lines.push(`Sender  : ${String(senderId)}`);
  }

  if (!lines.length) {
    await reply(event, "Tidak dapat mengambil ID.");
    return;
  }

  await reply(event, lines.join("\n"));
}

async function handleInfo(event) {
  const replied = await getReplyMessage(event);

  if (!replied) {
    await reply(
      event,
      `Gunakan ${config.PREFIX}info dengan reply ke pesan user.`
    );

    return;
  }

  let user = null;

  try {
    user = await replied.getSender();
  } catch (err) {
    console.error("[INFO SENDER ERROR]", err);
  }

  if (!user || !(user instanceof Api.User)) {
    await reply(
      event,
      "Pesan yang direply bukan dari user."
    );

    return;
  }

  const lines = [
    "╭━━━「 USER INFO 」━━━╮",
    `┃ Nama     : ${getDisplayName(user)}`,
    `┃ ID       : ${String(user.id)}`,
    `┃ Username : ${user.username ? "@" + user.username : "-"}`,
    `┃ Bot      : ${user.bot ? "Ya" : "Tidak"}`,
    `┃ Deleted  : ${user.deleted ? "Ya" : "Tidak"}`,
    `┃ Verified : ${user.verified ? "Ya" : "Tidak"}`,
    `┃ Premium  : ${user.premium ? "Ya" : "Tidak"}`,
    `┃ Phone    : ${user.phone ? String(user.phone) : "-"}`,
    `┃ Lang     : ${user.langCode || "-"}`,
    "╰━━━━━━━━━━━━━━━━━━━╯"
  ];

  if (user.status) {
    lines.push(
      "",
      "Status:"
    );

    const status = user.status;

    if (status instanceof Api.UserStatusOnline) {
      lines.push("┃ Online");
    } else if (status instanceof Api.UserStatusOffline) {
      const when = status.wasOnline
        ? new Date(Number(status.wasOnline) * 1000)
        : null;

      lines.push(
        `┃ Offline${when ? " - " + when.toLocaleString() : ""}`
      );
    } else if (status instanceof Api.UserStatusRecently) {
      lines.push("┃ Terakhir online: baru-baru ini");
    } else if (status instanceof Api.UserStatusLastWeek) {
      lines.push("┃ Terakhir online: minggu lalu");
    } else if (status instanceof Api.UserStatusLastMonth) {
      lines.push("┃ Terakhir online: bulan lalu");
    } else {
      lines.push("┃ Status tidak diketahui");
    }
  }

  await reply(event, lines.join("\n"));
}

async function handleStats(event, client) {
  const db = loadDB();

  let me = null;

  try {
    me = await client.getMe();
  } catch (_) {}

  const uptime = formatUptime(Date.now() - START_TIME);

  let sessionSize = 0;

  try {
    const sessionFile = path.join(
      __dirname,
      "session",
      "userbot.session"
    );

    if (fs.existsSync(sessionFile)) {
      sessionSize = fs.statSync(sessionFile).size;
    }
  } catch (_) {}

  const lines = [
    "╭━━━「 BOT STATS 」━━━╮",
    `┃ Uptime       : ${uptime}`,
    `┃ Owner        : ${String(config.OWNER_ID)}`,
    me ? `┃ Akun         : ${getDisplayName(me)}` : "┃ Akun         : -",
    me ? `┃ Akun ID      : ${String(me.id)}` : "┃ Akun ID      : -",
    `┃ Prefix       : ${config.PREFIX}`,
    `┃ BC Delay     : ${fmt(config.BROADCAST_DELAY)} ms`,
    `┃ Blacklist    : ${fmt(db.blacklist.length)}`,
    `┃ AFK          : ${db.afk.enabled ? "Aktif" : "Nonaktif"}`,
    `┃ Command Run  : ${fmt(commandCounter)}`,
    `┃ Session Size : ${fmt(sessionSize)} byte`,
    `┃ Node         : ${process.version}`,
    `┃ Platform     : ${process.platform}`,
    `┃ Memory       : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    "╰━━━━━━━━━━━━━━━━━━━━╯"
  ];

  await reply(event, lines.join("\n"));
}

async function handleSave(event, client) {
  const replied = await getReplyMessage(event);

  if (!replied) {
    await reply(
      event,
      `Gunakan ${config.PREFIX}save dengan reply ke sebuah pesan.`
    );

    return;
  }

  const text =
    replied.message !== undefined &&
    replied.message !== null
      ? String(replied.message)
      : "";

  const media = replied.media;

  try {
    if (media) {
      if (
        media instanceof Api.MessageMediaDocument &&
        media.document &&
        media.document.mimeType === "application/x-tgsticker"
      ) {
        await reply(
          event,
          "Sticker tidak didukung oleh save."
        );

        return;
      }

      await client.sendFile("me", {
        file: media,
        caption: text || ""
      });
    } else {
      if (!text) {
        await reply(
          event,
          "Pesan yang direply tidak memiliki konten yang bisa disimpan."
        );

        return;
      }

      await client.sendMessage("me", {
        message: text
      });
    }

    await reply(event, "Pesan disimpan ke Saved Messages.");
  } catch (err) {
    await reply(
      event,
      `Gagal menyimpan pesan.\n\nError: ${err.message}`
    );
  }
}

async function handlePin(event, client) {
  const replied = await getReplyMessage(event);

  if (!replied) {
    await reply(
      event,
      `Gunakan ${config.PREFIX}pin dengan reply ke sebuah pesan.`
    );

    return;
  }

  try {
    const chat = await event.message.getChat();

    await client.pinMessage(chat, replied, {
      notify: false
    });

    await reply(event, "Pesan berhasil di-pin.");
  } catch (err) {
    await reply(
      event,
      `Gagal pin pesan.\n\nError: ${err.message}`
    );
  }
}

async function handleUnpin(event, client) {
  try {
    const chat = await event.message.getChat();

    await client.unpinMessage(chat);

    await reply(event, "Pesan berhasil di-unpin.");
  } catch (err) {
    await reply(
      event,
      `Gagal unpin pesan.\n\nError: ${err.message}`
    );
  }
}

async function handleAfk(event, args) {
  const parts = args.split(/\s+/).filter(Boolean);

  const mode = (parts[0] || "").toLowerCase();
  const message = parts.slice(1).join(" ").trim();

  if (mode === "on") {
    const afkMessage = message || "Sedang AFK.";

    setAfk(true, afkMessage);

    await reply(
      event,
      `AFK diaktifkan.\n\nPesan: ${afkMessage}`
    );

    return;
  }

  if (mode === "off") {
    setAfk(false, "");

    await reply(event, "AFK dinonaktifkan.");
    return;
  }

  const status = getAfk();

  if (status.enabled) {
    await reply(
      event,
      [
        "AFK sedang aktif.",
        "",
        `Pesan: ${status.message}`,
        status.since
          ? `Sejak: ${formatTimeAgo(Date.now() - status.since)}`
          : ""
      ]
        .filter(Boolean)
        .join("\n")
    );
  } else {
    await reply(
      event,
      `AFK nonaktif.\n\nGunakan ${config.PREFIX}afk on <pesan> untuk mengaktifkan.`
    );
  }
}

async function handleIncomingAfk(event, client) {
  const db = loadDB();

  if (!db.afk.enabled) {
    return;
  }

  const senderId = getSenderId(event);

  if (senderId === null) {
    return;
  }

  if (Number(senderId) === Number(config.OWNER_ID)) {
    return;
  }

  const text = String(event.message.message || "").trim();

  if (text.startsWith(config.PREFIX)) {
    return;
  }

  try {
    const since = db.afk.since
      ? `\nSejak: ${formatTimeAgo(Date.now() - db.afk.since)}`
      : "";

    await event.message.reply({
      message:
        `💤 Owner sedang AFK.\n` +
        `📝 Pesan: ${db.afk.message || "Sedang AFK."}` +
        since
    });
  } catch (err) {
    console.error("[AFK REPLY ERROR]", err);
  }
}

async function handleTagAll(
  event,
  client,
  args
) {
  const chat = await event.message.getChat();

  if (!chat) {
    await reply(
      event,
      "Chat tidak ditemukan."
    );

    return;
  }

  if (!isGroupEntity(chat)) {
    await reply(
      event,
      "Command .tagall hanya dapat digunakan di group."
    );

    return;
  }

  const customText = args || "Member group";

  let participants;

  try {
    participants = await client.getParticipants(
      chat
    );
  } catch (err) {
    const seconds = getFloodWaitSeconds(err);

    if (seconds) {
      await reply(
        event,
        `Telegram meminta FloodWait ${fmt(seconds)} detik.`
      );
      await sleep((seconds + 2) * 1000);

      try {
        participants = await client.getParticipants(
          chat
        );
      } catch (retryError) {
        await reply(
          event,
          `Gagal mengambil member group.\n\nError: ${retryError.message}`
        );

        return;
      }
    } else {
      await reply(
        event,
        `Gagal mengambil member group.\n\nError: ${err.message}`
      );

      return;
    }
  }

  const self = await client.getMe();

  const filtered = [];

  for (const participant of participants) {
    if (!participant) {
      continue;
    }

    if (!(participant instanceof Api.User)) {
      continue;
    }

    if (participant.deleted === true) {
      continue;
    }

    if (participant.bot === true) {
      continue;
    }

    if (
      Number(participant.id) === Number(self.id)
    ) {
      continue;
    }

    filtered.push(participant);
  }

  const batches = chunk(filtered, 5);

  let success = 0;
  let failed = 0;

  for (
    let batchIndex = 0;
    batchIndex < batches.length;
    batchIndex++
  ) {
    const batch = batches[batchIndex];

    const mentions = batch.map((user) => {
      return mention(
        user.id,
        getDisplayName(user)
      );
    });

    const message = [
      customText,
      "",
      mentions.join(" ")
    ].join("\n");

    try {
      await client.sendMessage(
        chat,
        {
          message
        }
      );

      success += batch.length;
    } catch (err) {
      const seconds = getFloodWaitSeconds(err);

      if (seconds) {
        await sleep((seconds + 2) * 1000);

        try {
          await client.sendMessage(
            chat,
            {
              message
            }
          );

          success += batch.length;
        } catch (retryError) {
          failed += batch.length;

          console.error(
            "[TAGALL RETRY ERROR]",
            retryError
          );
        }
      } else {
        failed += batch.length;

        console.error(
          "[TAGALL ERROR]",
          err
        );
      }
    }

    if (batchIndex < batches.length - 1) {
      await sleep(1200);
    }
  }

  await reply(
    event,
    [
      "Tagall selesai.",
      "",
      `Total member : ${fmt(filtered.length)}`,
      `Berhasil     : ${fmt(success)}`,
      `Gagal        : ${fmt(failed)}`,
      `Batch        : ${fmt(batches.length)}`
    ].join("\n")
  );
}

async function getCurrentChatId(event) {
  try {
    const chat = await event.message.getChat();

    if (chat && chat.id !== undefined) {
      return String(chat.id);
    }
  } catch (err) {
    console.error("[GET CHAT ID ERROR]", err);
  }

  if (
    event.message.chatId !== undefined &&
    event.message.chatId !== null
  ) {
    return String(event.message.chatId);
  }

  return null;
}

async function handleAddBlacklist(event) {
  const chatId = await getCurrentChatId(event);

  if (!chatId) {
    await reply(
      event,
      "Gagal mendapatkan ID chat ini."
    );

    return;
  }

  if (isBlacklisted(chatId)) {
    await reply(
      event,
      `Chat ${chatId} sudah ada di blacklist.`
    );

    return;
  }

  const result = addBlacklist(chatId);

  if (!result) {
    await reply(
      event,
      "Gagal menambahkan chat ini ke blacklist."
    );

    return;
  }

  await reply(
    event,
    `Berhasil menambahkan chat ini (${chatId}) ke blacklist.`
  );
}

async function handleRemoveBlacklist(event) {
  const chatId = await getCurrentChatId(event);

  if (!chatId) {
    await reply(
      event,
      "Gagal mendapatkan ID chat ini."
    );

    return;
  }

  if (!isBlacklisted(chatId)) {
    await reply(
      event,
      `Chat ${chatId} tidak ditemukan di blacklist.`
    );

    return;
  }

  const result = removeBlacklist(chatId);

  if (!result) {
    await reply(
      event,
      "Gagal menghapus chat ini dari blacklist."
    );

    return;
  }

  await reply(
    event,
    `Berhasil menghapus chat ini (${chatId}) dari blacklist.`
  );
}

async function handleListBlacklist(event) {
  const db = loadDB();

  if (!db.blacklist.length) {
    await reply(
      event,
      "Blacklist masih kosong."
    );

    return;
  }

  const lines = [
    "╭━━━「 BLACKLIST 」━━━╮"
  ];

  db.blacklist.forEach((id, index) => {
    lines.push(
      `┃ ${index + 1}. ${id}`
    );
  });

  lines.push(
    "╰━━━━━━━━━━━━━━━━━━━╯",
    "",
    `Total: ${fmt(db.blacklist.length)}`
  );

  await reply(
    event,
    lines.join("\n")
  );
}

async function handleCopyText(event, client) {
  const replied = await getReplyMessage(event);

  if (!replied) {
    await reply(
      event,
      `Command ${config.PREFIX}copytext harus digunakan dengan reply ke sebuah pesan.`
    );

    return;
  }

  const chatId = await getCurrentChatId(event);

  if (!chatId) {
    await reply(
      event,
      "Gagal mendapatkan ID chat ini."
    );

    return;
  }

  const text =
    replied.message !== undefined &&
    replied.message !== null
      ? String(replied.message)
      : "";

  const media = replied.media;

  if (!media) {
    if (!text) {
      await reply(
        event,
        "Pesan yang direply tidak memiliki teks atau media yang bisa dicopy."
      );

      return;
    }

    try {
      await client.sendMessage(chatId, {
        message: text
      });
    } catch (err) {
      const seconds = getFloodWaitSeconds(err);

      if (seconds) {
        await sleep((seconds + 2) * 1000);

        try {
          await client.sendMessage(chatId, {
            message: text
          });
        } catch (retryError) {
          await reply(
            event,
            `Gagal mengirim ulang teks.\n\nError: ${retryError.message}`
          );

          return;
        }
      } else {
        await reply(
          event,
          `Gagal mengirim ulang teks.\n\nError: ${err.message}`
        );

        return;
      }
    }

    return;
  }

  if (media instanceof Api.MessageMediaDocument) {
    const document = media.document;

    if (document && document.mimeType === "application/x-tgsticker") {
      await reply(
        event,
        "Sticker tidak didukung oleh copytext."
      );

      return;
    }
  }

  try {
    await client.sendFile(chatId, {
      file: media,
      caption: text || ""
    });
  } catch (err) {
    const seconds = getFloodWaitSeconds(err);

    if (seconds) {
      await sleep((seconds + 2) * 1000);

      try {
        await client.sendFile(chatId, {
          file: media,
          caption: text || ""
        });
      } catch (retryError) {
        await reply(
          event,
          `Gagal mengirim ulang media.\n\nError: ${retryError.message}`
        );

        return;
      }
    } else {
      await reply(
        event,
        `Gagal mengirim ulang media.\n\nError: ${err.message}`
      );

      return;
    }
  }
}

async function handleMessage(
  event,
  client
) {
  if (!event || !event.message) {
    return;
  }

  const messageText = event.message.message;

  if (
    !messageText ||
    typeof messageText !== "string"
  ) {
    return;
  }

  const isOutgoing = event.message.out === true;

  if (
    messageText.startsWith(config.PREFIX)
  ) {
    const parsed = parseCommand(
      messageText
    );

    if (!parsed) {
      return;
    }

    const senderId = getSenderId(event);
    const owner = isOwner(senderId);

    const command = parsed.command;
    const args = parsed.args;

    commandCounter++;

    if (command === "menu" || command === "help") {
      await handleMenu(event, owner);
      return;
    }

    if (command === "ping") {
      await handlePing(event);
      return;
    }

    if (command === "id") {
      await handleId(event);
      return;
    }

    if (command === "info") {
      await handleInfo(event);
      return;
    }

    if (command === "stats") {
      await handleStats(event, client);
      return;
    }

    if (command === "save") {
      await handleSave(event, client);
      return;
    }

    if (command === "pin") {
      await handlePin(event, client);
      return;
    }

    if (command === "unpin") {
      await handleUnpin(event, client);
      return;
    }

    if (command === "afk") {
      if (!owner) {
        return;
      }

      await handleAfk(event, args);
      return;
    }

    if (command === "tagall") {
      await handleTagAll(
        event,
        client,
        args
      );

      return;
    }

    if (command === "copytext" || command === "ct") {
      await handleCopyText(event, client);
      return;
    }

    const ownerCommands = new Set([
      "broadcast",
      "bc",
      "bcgroup",
      "bcg",
      "bcprivate",
      "bcp",
      "addbl",
      "delbl",
      "listbl"
    ]);

    if (
      ownerCommands.has(command) &&
      !owner
    ) {
      return;
    }

    if (
      command === "broadcast" ||
      command === "bc"
    ) {
      let mediaInfo = null;

      const replied = await getReplyMessage(
        event
      );

      if (replied) {
        mediaInfo = detectMedia(replied);
      }

      if (!args && !mediaInfo) {
        await reply(
          event,
          `Gunakan ${config.PREFIX}broadcast <teks> atau reply foto/video dengan command broadcast.`
        );

        return;
      }

      await executeBroadcast(
        event,
        client,
        "broadcast",
        {
          text: args,
          mediaInfo
        }
      );

      return;
    }

    if (
      command === "bcgroup" ||
      command === "bcg"
    ) {
      let mediaInfo = null;

      const replied = await getReplyMessage(
        event
      );

      if (replied) {
        mediaInfo = detectMedia(replied);
      }

      if (!args && !mediaInfo) {
        await reply(
          event,
          `Gunakan ${config.PREFIX}bcgroup <teks> atau reply foto/video.`
        );

        return;
      }

      await executeBroadcast(
        event,
        client,
        "group",
        {
          text: args,
          mediaInfo
        }
      );

      return;
    }

    if (
      command === "bcprivate" ||
      command === "bcp"
    ) {
      let mediaInfo = null;

      const replied = await getReplyMessage(
        event
      );

      if (replied) {
        mediaInfo = detectMedia(replied);
      }

      if (!args && !mediaInfo) {
        await reply(
          event,
          `Gunakan ${config.PREFIX}bcprivate <teks> atau reply foto/video.`
        );

        return;
      }

      await executeBroadcast(
        event,
        client,
        "private",
        {
          text: args,
          mediaInfo
        }
      );

      return;
    }

    if (command === "addbl") {
      await handleAddBlacklist(event);
      return;
    }

    if (command === "delbl") {
      await handleRemoveBlacklist(event);
      return;
    }

    if (command === "listbl") {
      await handleListBlacklist(event);
      return;
    }

    return;
  }

  // ==== Auto AFK reply untuk pesan masuk ====
  if (!isOutgoing) {
    await handleIncomingAfk(event, client);
  }
}

module.exports = {
  handleMessage,
  reply,
  getReplyMessage,
  sleep,
  isOwner,
  fmt,
  mention,
  chunk,
  detectMedia,
  loadDB,
  saveDB,
  isBlacklisted,
  addBlacklist,
  removeBlacklist
};