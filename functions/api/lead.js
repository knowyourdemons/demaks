const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const JSON_HEADERS = { "content-type": "application/json", ...CORS };

function clean(v, max) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_json" }), { status: 400, headers: JSON_HEADERS });
  }

  if (typeof data?.hp === "string" && data.hp.trim() !== "") {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
  }

  const name    = clean(data?.name, 200);
  const phone   = clean(data?.phone, 100);
  const email   = clean(data?.email, 200);
  const need    = clean(data?.need, 200);
  const volume  = clean(data?.volume, 80);
  const comment = clean(data?.comment, 2000);
  const source  = clean(data?.source, 500);
  const referrer = clean(data?.referrer, 500);
  const utm = {
    source:   clean(data?.utm?.source, 100),
    medium:   clean(data?.utm?.medium, 100),
    campaign: clean(data?.utm?.campaign, 100),
    content:  clean(data?.utm?.content, 100),
    term:     clean(data?.utm?.term, 100),
  };

  if (!name || !phone) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400, headers: JSON_HEADERS });
  }

  const token = env.TG_BOT_TOKEN;
  const chatId = env.TG_CHAT_ID;
  if (!token || !chatId) {
    return new Response(JSON.stringify({ ok: false, error: "not_configured" }), { status: 500, headers: JSON_HEADERS });
  }

  const cf = request.cf || {};
  const country = clean(cf.country, 8);
  const city = clean(cf.city, 80);

  const lines = [
    "<b>📦 Новая заявка с сайта</b>",
    "",
    "👤 <b>Имя:</b> " + escapeHtml(name),
    "📞 <b>Контакт:</b> " + escapeHtml(phone),
  ];
  if (email)   lines.push("✉️ <b>Email:</b> " + escapeHtml(email));
  lines.push("📋 <b>Что нужно:</b> " + escapeHtml(need || "—"));
  if (volume)  lines.push("📊 <b>Тираж:</b> " + escapeHtml(volume));
  if (comment) lines.push("💬 <b>Комментарий:</b>\n" + escapeHtml(comment));

  lines.push("");
  if (source)   lines.push("🌐 <b>Страница:</b> " + escapeHtml(source));
  if (referrer) lines.push("↩️ <b>Откуда:</b> " + escapeHtml(referrer));

  const utmParts = [];
  if (utm.source)   utmParts.push("source=" + utm.source);
  if (utm.medium)   utmParts.push("medium=" + utm.medium);
  if (utm.campaign) utmParts.push("campaign=" + utm.campaign);
  if (utm.content)  utmParts.push("content=" + utm.content);
  if (utm.term)     utmParts.push("term=" + utm.term);
  if (utmParts.length) lines.push("📊 <b>UTM:</b> " + escapeHtml(utmParts.join(" | ")));

  if (country || city) lines.push("📍 <b>Геолокация (по IP):</b> " + escapeHtml([city, country].filter(Boolean).join(", ")));

  const text = lines.join("\n");

  const tgRes = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!tgRes.ok) {
    const detail = await tgRes.text();
    return new Response(JSON.stringify({ ok: false, error: "tg_failed", detail }), { status: 502, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, "access-control-max-age": "86400" },
  });
}
