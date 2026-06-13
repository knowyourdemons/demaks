export async function onRequestPost({ request, env }) {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400, headers: { "content-type": "application/json", ...cors },
    });
  }

  if (data && typeof data.hp === "string" && data.hp.trim() !== "") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "content-type": "application/json", ...cors },
    });
  }

  const name = String(data?.name ?? "").trim().slice(0, 200);
  const phone = String(data?.phone ?? "").trim().slice(0, 100);
  const need = String(data?.need ?? "").trim().slice(0, 200);

  if (!name || !phone) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
      status: 400, headers: { "content-type": "application/json", ...cors },
    });
  }

  const token = env.TG_BOT_TOKEN;
  const chatId = env.TG_CHAT_ID;
  if (!token || !chatId) {
    return new Response(JSON.stringify({ ok: false, error: "not_configured" }), {
      status: 500, headers: { "content-type": "application/json", ...cors },
    });
  }

  const text =
    "📦 Новая заявка с сайта!\n\n" +
    "👤 Имя: " + name + "\n" +
    "📞 Телефон: " + phone + "\n" +
    "📋 Что нужно: " + (need || "—");

  const tgRes = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });

  if (!tgRes.ok) {
    const detail = await tgRes.text();
    return new Response(JSON.stringify({ ok: false, error: "tg_failed", detail }), {
      status: 502, headers: { "content-type": "application/json", ...cors },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "content-type": "application/json", ...cors },
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}
