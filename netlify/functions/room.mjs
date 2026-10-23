import { getStore } from "@netlify/blobs";

const WORDS = ["Phở","Xe máy","Trà sữa","Bánh mì","Karaoke","Lẩu","Cà phê muối","Tết","Áo dài","Ngủ nướng","Người yêu cũ","Sếp","Deadline","Kẹt xe","Shipper","Chung cư","Tăng ca","Nem chua","Bún bò","Hủ tiếu","Selfie","TikTok","Nhậu","Tiền lì xì","Đám cưới","Thang máy","Máy lạnh","Mì gói","Sầu riêng","Nón lá","Đèn giao thông","Rửa chén","Gấu bông","Trễ giờ","Hết pin","Sống ảo","Gặp mẹ người yêu","Đi chợ","Cà phê sữa đá","Bóng đá","Cá tháng Tư","Ngủ gật trong họp","Hẹn hò lần đầu","Say xỉn","Chụp ảnh nhóm","Đi bão","Trà đá vỉa hè","Chạy deadline","Bỏ phố về quê","Phỏng vấn xin việc"];
const PUN = {
  1: ["Khen người bên cạnh 3 câu thật lòng", "Uống 1 ngụm bia", "Hát 1 câu tùy ý", "Kể 1 chuyện xấu hổ nhỏ"],
  2: ["Uống nửa ly", "Đi catwalk quanh bàn", "Nhái giọng một người trong nhóm", "Nhắn “nhớ cậu ghê” cho một người bạn lâu rồi chưa nói chuyện"],
  3: ["Cạn ly", "Tỏ tình với cái ghế", "Nhảy một đoạn TikTok bất kỳ", "Selfie mặt xấu nhất và đăng story 1 tiếng"],
};
const TURN_MS = 60000, NEED = 3, STALE_MS = 30000;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function nextWord(r) {
  if (r.used.length >= WORDS.length) r.used = [];
  let w;
  do { w = pick(WORDS); } while (r.used.includes(w));
  r.used.push(w);
  return w;
}

function endTurn(r) {
  r.lose = r.cor < NEED;
  r.sc[r.team] += r.cor;
  r.pun = "";
  if (r.lose) {
    const pool = [...PUN[r.lv], ...r.players.flatMap((p) => p.cp)];
    r.pun = pick(pool);
  }
  r.ph = "res";
  r.w = "";
}

function view(r, pid, now) {
  const me = r.players.find((p) => p.id === pid);
  return {
    now, ph: r.ph, end: r.end, hostId: r.hostId, lv: r.lv, sc: r.sc, n: r.n,
    team: r.team, d: r.d, dn: r.dn, cor: r.cor, lose: r.lose, pun: r.pun, need: NEED,
    w: r.ph === "turn" && pid === r.d ? r.w : "",
    players: r.players.map((p) => ({ id: p.id, name: p.name, team: p.team })),
    me: me ? { id: me.id, team: me.team, cp: me.cp } : null,
  };
}

export default async (req) => {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "party";
  const pid = String(b.pid || "").slice(0, 40);
  const store = getStore("rooms");
  const now = Date.now();
  const r = (await store.get(code, { type: "json" })) ||
    { ph: "lobby", players: [], lv: 2, sc: [0, 0], n: 0, used: [], rot: [0, 0], hostId: null, cor: 0 };

  // Dọn người đã rời khi chưa vào ván
  if (r.ph === "lobby" || r.ph === "ready") {
    r.players = r.players.filter((p) => now - p.seen < STALE_MS);
  }
  let p = r.players.find((x) => x.id === pid);
  if (b.a === "join" && !p && pid) {
    p = { id: pid, name: String(b.name || "Bạn").slice(0, 16), team: null, cp: [], seen: now };
    r.players.push(p);
  }
  if (p) p.seen = now;
  if (!r.players.some((x) => x.id === r.hostId)) r.hostId = r.players[0]?.id ?? null;
  if (r.ph === "turn" && now >= r.end) endTurn(r);

  const isHost = pid === r.hostId;
  if (p) {
    if (b.a === "cp" && p.cp.length < 5) {
      const t = String(b.text || "").trim().slice(0, 60);
      if (t) p.cp.push(t);
    } else if (b.a === "lv" && isHost && [1, 2, 3].includes(+b.lv)) {
      r.lv = +b.lv;
    } else if (b.a === "split" && isHost && r.players.length >= 2) {
      const order = [...r.players].sort(() => Math.random() - 0.5);
      order.forEach((x, i) => { x.team = i % 2; });
      Object.assign(r, { ph: "ready", sc: [0, 0], n: 0, rot: [0, 0] });
    } else if (b.a === "turn" && isHost && (r.ph === "ready" || r.ph === "res")) {
      const team = +b.team === 1 ? 1 : 0;
      const m = r.players.filter((x) => x.team === team);
      if (m.length) {
        const d = m[r.rot[team]++ % m.length];
        Object.assign(r, { ph: "turn", team, d: d.id, dn: d.name, w: nextWord(r), end: now + TURN_MS, cor: 0, n: r.n + 1 });
      }
    } else if ((b.a === "ok" || b.a === "skip") && r.ph === "turn" && pid === r.d) {
      if (b.a === "ok") r.cor++;
      r.w = nextWord(r);
    } else if (b.a === "reset" && isHost) {
      Object.assign(r, { ph: "lobby", sc: [0, 0], n: 0 });
    }
  }

  await store.setJSON(code, r);
  return Response.json(view(r, pid, now));
};

export const config = { path: "/api/room" };
