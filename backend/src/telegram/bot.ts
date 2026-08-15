import { Telegraf, Markup, Context } from "telegraf";
import axios from "axios";
import { BOT_INTERNAL_SECRET } from "../lib/botSecret";
import { mainMenuKeyboard, contactRequestKeyboard } from "./keyboards";

interface WizardState {
  clinicId?: string;
  clinicName?: string;
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  date?: string;
  time?: string;
}

interface Session {
  token: string;
  userId: string;
  wizard: WizardState;
}

const sessions = new Map<string, Session>();

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

const QUEUE_STATUS_LABEL: Record<string, string> = {
  WAITING: "🟢 Navbatda",
  APPROACHING: "🟡 Yaqinlashmoqda",
  CALLED: "✅ Qabul",
  CANCELLED: "❌ Bekor qilingan",
};

const GENERIC_ERROR = "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";

let bot: Telegraf | null = null;

function apiBase() {
  return `http://localhost:${process.env.PORT || 4000}/api`;
}

async function internalPost(path: string, body: unknown) {
  const res = await axios.post(`${apiBase()}${path}`, body, {
    headers: { "x-bot-secret": BOT_INTERNAL_SECRET },
    timeout: 15000,
  });
  return res.data;
}

function authedApi(token: string) {
  return axios.create({
    baseURL: apiBase(),
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function nextDays(count: number) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function safe(handler: (ctx: Context) => Promise<void>) {
  return async (ctx: Context) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error("bot handler error:", err);
      try {
        await (ctx as any).answerCbQuery?.();
      } catch {
        /* ignore */
      }
      await ctx.reply(GENERIC_ERROR).catch(() => {});
    }
  };
}

function getSession(ctx: Context): Session | null {
  const id = ctx.from?.id;
  if (!id) return null;
  return sessions.get(String(id)) ?? null;
}

async function requireSession(ctx: Context): Promise<Session | null> {
  const session = getSession(ctx);
  if (!session) {
    await ctx.reply(
      "Avval /start buyrug'ini yuboring va ro'yxatdan o'ting yoki hisobingizni bog'lang."
    );
    return null;
  }
  return session;
}

// ---------- /start, registration, linking ----------

async function sendWelcome(ctx: Context, name: string) {
  await ctx.reply(
    `Xush kelibsiz, ${name}! MedQueue Tashkent bilan navbat oling, kuzating va tahlil natijalaringizni shu yerda ko'ring.`,
    mainMenuKeyboard()
  );
}

async function attemptLinkWithCode(ctx: Context, code: string): Promise<boolean> {
  const telegramId = String(ctx.from!.id);
  try {
    const data = await internalPost("/telegram/link", {
      code,
      telegramId,
      telegramUsername: ctx.from!.username,
    });
    sessions.set(telegramId, { token: data.token, userId: data.user.id, wizard: {} });
    await ctx.reply("✅ Hisobingiz muvaffaqiyatli bog'landi!", { reply_markup: { remove_keyboard: true } });
    await sendWelcome(ctx, data.user.name);
    return true;
  } catch (err: any) {
    const message = err?.response?.data?.error || "Kod noto'g'ri yoki muddati o'tgan.";
    await ctx.reply(`❌ ${message}`);
    return false;
  }
}

function registerStart(bot: Telegraf) {
  bot.start(
    safe(async (ctx) => {
      const telegramId = String(ctx.from!.id);
      const existing = sessions.get(telegramId);
      if (existing) {
        await sendWelcome(ctx, "qaytganingizdan xursandmiz");
        return;
      }

      try {
        const data = await internalPost("/telegram/session", { telegramId });
        sessions.set(telegramId, { token: data.token, userId: data.user.id, wizard: {} });
        await sendWelcome(ctx, data.user.name);
        return;
      } catch {
        // not linked yet — fall through to onboarding
      }

      // supports deep links from the website: t.me/<bot>?start=link_123456
      const payload = (ctx as any).startPayload as string | undefined;
      if (payload?.startsWith("link_")) {
        const linked = await attemptLinkWithCode(ctx, payload.slice("link_".length));
        if (linked) return;
      }

      await ctx.reply(
        "Assalomu alaykum! 👋\nMedQueue Tashkent botiga xush kelibsiz.\n\n" +
          "Shifokor qabuliga navbat oling va navbatingizni telefoningizdan kuzating.\n\n" +
          "Davom etish uchun telefon raqamingizni ulashing, yoki agar saytda hisobingiz bo'lsa, " +
          "Profil sahifasidagi kodni /link 123456 shaklida yuboring."
      );
      await ctx.reply("👇", contactRequestKeyboard());
    })
  );

  bot.on(
    "contact",
    safe(async (ctx) => {
      const msg = ctx.message as any;
      const contact = msg.contact;
      const telegramId = String(ctx.from!.id);

      if (String(contact.user_id) !== telegramId) {
        await ctx.reply("Iltimos, o'zingizning raqamingizni ulashing.");
        return;
      }

      const name =
        [ctx.from!.first_name, ctx.from!.last_name].filter(Boolean).join(" ") || "MedQueue foydalanuvchisi";

      const data = await internalPost("/telegram/register", {
        telegramId,
        telegramUsername: ctx.from!.username,
        name,
        phone: contact.phone_number,
      });

      sessions.set(telegramId, { token: data.token, userId: data.user.id, wizard: {} });
      await ctx.reply("✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!", { reply_markup: { remove_keyboard: true } });
      await sendWelcome(ctx, data.user.name);
    })
  );

  bot.command(
    "link",
    safe(async (ctx) => {
      const text = (ctx.message as any).text as string;
      const code = text.split(" ")[1]?.trim();
      if (!code) {
        await ctx.reply("Kodni shu formatda yuboring: /link 123456");
        return;
      }
      await attemptLinkWithCode(ctx, code);
    })
  );
}

// ---------- main menu ----------

function registerMainMenu(bot: Telegraf) {
  bot.hears(
    "🏢 Klinikalar",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      const { data: clinics } = await authedApi(session.token).get("/clinics");
      if (clinics.length === 0) {
        await ctx.reply("Hozircha klinikalar mavjud emas.");
        return;
      }
      await ctx.reply(
        "🏢 Klinikalar ro'yxati:",
        Markup.inlineKeyboard(
          clinics.map((c: any) => [Markup.button.callback(c.name, `clinic:detail:${c.id}`)])
        )
      );
    })
  );

  bot.hears(
    "👨‍⚕️ Shifokorlar",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      await sendDoctorList(ctx, session);
    })
  );

  bot.hears(
    "🏥 Navbat olish",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      session.wizard = {};
      await sendClinicPicker(ctx, session);
    })
  );

  bot.hears(
    "🎫 Mening navbatim",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      await sendMyQueue(ctx, session);
    })
  );

  bot.hears(
    "🧪 Tahlillar",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      await sendLabs(ctx, session);
    })
  );

  bot.hears(
    "👤 Profil",
    safe(async (ctx) => {
      const session = await requireSession(ctx);
      if (!session) return;
      await sendProfile(ctx, session);
    })
  );

  bot.action(
    "nav:home",
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply("Bosh menyu:", mainMenuKeyboard());
    })
  );
}

// ---------- clinics & doctors browsing ----------

async function sendDoctorList(ctx: Context, session: Session, clinicId?: string) {
  const { data: doctors } = await authedApi(session.token).get("/doctors", {
    params: clinicId ? { clinicId } : undefined,
  });
  if (doctors.length === 0) {
    await ctx.reply("Shifokorlar topilmadi.");
    return;
  }
  await ctx.reply(
    "👨‍⚕️ Shifokorlar ro'yxati:",
    Markup.inlineKeyboard(
      doctors.map((d: any) => [
        Markup.button.callback(`${d.name} — ${d.specialty}`, `doctor:detail:${d.id}`),
      ])
    )
  );
}

function registerClinicsAndDoctors(bot: Telegraf) {
  bot.action(
    /^clinic:detail:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      const { data: clinic } = await authedApi(session.token).get(`/clinics/${id}`);
      await ctx.reply(
        `🏢 ${clinic.name}\n📍 ${clinic.address}\n🕐 ${clinic.workingHours}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("👨‍⚕️ Shifokorlar", `clinic:doctors:${clinic.id}`)],
          [Markup.button.callback("🏥 Navbat olish", `book:clinic:${clinic.id}`)],
          [Markup.button.callback("🏠 Bosh menyu", "nav:home")],
        ])
      );
    })
  );

  bot.action(
    /^clinic:doctors:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      await sendDoctorList(ctx, session, id);
    })
  );

  bot.action(
    /^doctor:detail:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      const { data: doctor } = await authedApi(session.token).get(`/doctors/${id}`);
      await ctx.reply(
        `👨‍⚕️ ${doctor.name}\n${doctor.specialty}\n\n🏢 ${doctor.clinic.name}\n🕐 ${doctor.clinic.workingHours}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🏥 Navbat olish", `book:doctor:${doctor.id}`)],
          [Markup.button.callback("🏠 Bosh menyu", "nav:home")],
        ])
      );
    })
  );
}

// ---------- booking wizard ----------

async function sendClinicPicker(ctx: Context, session: Session) {
  const { data: clinics } = await authedApi(session.token).get("/clinics");
  await ctx.reply(
    "1️⃣ Klinikani tanlang:",
    Markup.inlineKeyboard(
      clinics.map((c: any) => [Markup.button.callback(c.name, `book:clinic:${c.id}`)])
    )
  );
}

async function sendDoctorPicker(ctx: Context, session: Session) {
  const { data: doctors } = await authedApi(session.token).get("/doctors", {
    params: { clinicId: session.wizard.clinicId },
  });
  if (doctors.length === 0) {
    await ctx.reply("Bu klinikada shifokor topilmadi. Boshqa klinikani tanlang.");
    return;
  }
  await ctx.reply(
    "2️⃣ Shifokorni tanlang:",
    Markup.inlineKeyboard(
      doctors.map((d: any) => [
        Markup.button.callback(`${d.name} — ${d.specialty}`, `book:doctor:${d.id}`),
      ])
    )
  );
}

async function sendDatePicker(ctx: Context) {
  const days = nextDays(7);
  await ctx.reply(
    "3️⃣ Sanani tanlang:",
    Markup.inlineKeyboard(
      days.map((iso) => [Markup.button.callback(formatDate(iso), `book:date:${iso}`)])
    )
  );
}

async function sendTimePicker(ctx: Context) {
  const rows = [];
  for (let i = 0; i < TIME_SLOTS.length; i += 3) {
    rows.push(
      TIME_SLOTS.slice(i, i + 3).map((t) => Markup.button.callback(t, `book:time:${t}`))
    );
  }
  await ctx.reply("4️⃣ Vaqtni tanlang:", Markup.inlineKeyboard(rows));
}

async function sendConfirmSummary(ctx: Context, session: Session) {
  const w = session.wizard;
  await ctx.reply(
    `🏥 ${w.clinicName}\n\n👨‍⚕️ ${w.doctorName}\n${w.doctorSpecialty}\n\n📅 ${formatDate(w.date!)}\n🕐 ${w.time}`,
    Markup.inlineKeyboard([[Markup.button.callback("✅ Tasdiqlash", "book:confirm")]])
  );
}

function registerBookingWizard(bot: Telegraf) {
  bot.action(
    /^book:clinic:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      const { data: clinic } = await authedApi(session.token).get(`/clinics/${id}`);
      session.wizard = { clinicId: clinic.id, clinicName: clinic.name };
      await sendDoctorPicker(ctx, session);
    })
  );

  bot.action(
    /^book:doctor:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      const { data: doctor } = await authedApi(session.token).get(`/doctors/${id}`);
      session.wizard = {
        ...session.wizard,
        clinicId: doctor.clinicId,
        clinicName: doctor.clinic.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
      };
      await sendDatePicker(ctx);
    })
  );

  bot.action(
    /^book:date:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      session.wizard.date = ((ctx as any).match as RegExpMatchArray)[1];
      await sendTimePicker(ctx);
    })
  );

  bot.action(
    /^book:time:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      session.wizard.time = ((ctx as any).match as RegExpMatchArray)[1];
      await sendConfirmSummary(ctx, session);
    })
  );

  bot.action(
    "book:confirm",
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const w = session.wizard;
      if (!w.clinicId || !w.doctorId || !w.date || !w.time) {
        await ctx.reply("Iltimos, avval 🏥 Navbat olish orqali barcha bosqichlarni to'ldiring.");
        return;
      }

      const { data: appointment } = await authedApi(session.token).post("/appointments", {
        clinicId: w.clinicId,
        doctorId: w.doctorId,
        date: w.date,
        time: w.time,
      });

      session.wizard = {};

      await ctx.reply(
        `✅ Navbatingiz muvaffaqiyatli olindi!\n\n` +
          `🎫 Navbat №${appointment.queue.queueNumber}\n` +
          `👥 Oldinda: ${appointment.queue.peopleAhead} kishi\n` +
          `⏱️ Taxminiy kutish: ${appointment.queue.estimatedWaitMinutes} daqiqa`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔎 Tafsilotlar", "queue:refresh")],
          [Markup.button.callback("🏠 Bosh menyu", "nav:home")],
        ])
      );
    })
  );
}

// ---------- my queue ----------

async function sendMyQueue(ctx: Context, session: Session) {
  const { data: appointments } = await authedApi(session.token).get("/appointments");
  const active = appointments.find((a: any) => a.queue && a.queue.status !== "CALLED" && a.status !== "CANCELLED");
  const lastCalled = appointments.find((a: any) => a.queue && a.queue.status === "CALLED");
  const current = active || lastCalled;

  if (!current) {
    await ctx.reply(
      "Hozirda faol navbatingiz yo'q.",
      Markup.inlineKeyboard([[Markup.button.callback("🏥 Navbat olish", "book:start")]])
    );
    return;
  }

  const q = current.queue;
  const buttons = [[Markup.button.callback("🔄 Yangilash", "queue:refresh")]];
  if (q.status !== "CALLED") {
    buttons.push([Markup.button.callback("❌ Bekor qilish", `queue:cancel:${current.id}`)]);
  }

  await ctx.reply(
    `🎫 Navbat №${q.queueNumber}\n\n` +
      `👥 Oldinda: ${q.peopleAhead} kishi\n\n` +
      `⏱️ Taxminiy kutish:\n${q.estimatedWaitMinutes} daqiqa\n\n` +
      `Status:\n${QUEUE_STATUS_LABEL[q.status] ?? q.status}`,
    Markup.inlineKeyboard(buttons)
  );
}

function registerMyQueue(bot: Telegraf) {
  bot.action(
    "queue:refresh",
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      await sendMyQueue(ctx, session);
    })
  );

  bot.action(
    "book:start",
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      session.wizard = {};
      await sendClinicPicker(ctx, session);
    })
  );

  bot.action(
    /^queue:cancel:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      await ctx.reply(
        "Rostdan ham navbatni bekor qilmoqchimisiz?",
        Markup.inlineKeyboard([
          [Markup.button.callback("✅ Ha, bekor qilish", `queue:cancel-confirm:${id}`)],
          [Markup.button.callback("⬅️ Yo'q", "nav:home")],
        ])
      );
    })
  );

  bot.action(
    /^queue:cancel-confirm:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      await authedApi(session.token).patch(`/appointments/${id}/cancel`);
      await ctx.reply("Navbatingiz bekor qilindi.", mainMenuKeyboard());
    })
  );
}

// ---------- labs ----------

async function sendLabs(ctx: Context, session: Session) {
  const { data: labs } = await authedApi(session.token).get("/labs");
  if (labs.length === 0) {
    await ctx.reply("Hozircha tahlillaringiz mavjud emas.");
    return;
  }

  const lines = labs.map((l: any) => {
    const emoji = l.status === "READY" ? "🟢" : "🟡";
    const status = l.status === "READY" ? "Tayyor" : "Jarayonda";
    return `${emoji} ${l.name} — ${status} (${l.date})`;
  });

  const readyButtons = labs
    .filter((l: any) => l.status === "READY")
    .map((l: any) => [Markup.button.callback(`📄 ${l.name}`, `lab:view:${l.id}`)]);

  await ctx.reply(
    `🧪 Tahlillaringiz:\n\n${lines.join("\n")}`,
    readyButtons.length ? Markup.inlineKeyboard(readyButtons) : undefined
  );
}

function registerLabs(bot: Telegraf) {
  bot.action(
    /^lab:view:(.+)$/,
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const id = ((ctx as any).match as RegExpMatchArray)[1];
      const { data: lab } = await authedApi(session.token).get(`/labs/${id}`);
      await ctx.reply(
        `🧪 ${lab.name}\n📅 ${lab.date}\n\n📊 Natija: ${lab.result ?? "—"}\n📈 Normal diapazon: ${
          lab.normalRange ?? "—"
        }`
      );
    })
  );
}

// ---------- profile ----------

async function sendProfile(ctx: Context, session: Session) {
  const { data: user } = await authedApi(session.token).get("/auth/me");
  await ctx.reply(
    `👤 ${user.name}\n📞 ${user.phone}\n📧 ${user.email}`,
    Markup.inlineKeyboard([[Markup.button.callback("📜 Tashriflar tarixi", "profile:history")]])
  );
}

function registerProfile(bot: Telegraf) {
  bot.action(
    "profile:history",
    safe(async (ctx) => {
      await ctx.answerCbQuery();
      const session = await requireSession(ctx);
      if (!session) return;
      const { data: appointments } = await authedApi(session.token).get("/appointments");
      if (appointments.length === 0) {
        await ctx.reply("Hali tashriflar yo'q.");
        return;
      }
      const STATUS_LABEL: Record<string, string> = {
        BOOKED: "Kutishmoqda",
        DONE: "Yakunlangan",
        CANCELLED: "Bekor qilingan",
      };
      const lines = appointments.map(
        (a: any) =>
          `• ${a.doctor.name} — ${a.clinic.name}\n  ${a.date} ${a.time} — ${STATUS_LABEL[a.status] ?? a.status}`
      );
      await ctx.reply(`📜 Tashriflar tarixi:\n\n${lines.join("\n\n")}`);
    })
  );
}

// ---------- lifecycle ----------

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log("BOT_TOKEN not set — Telegram bot disabled.");
    return;
  }

  bot = new Telegraf(token);

  registerStart(bot);
  registerMainMenu(bot);
  registerClinicsAndDoctors(bot);
  registerBookingWizard(bot);
  registerMyQueue(bot);
  registerLabs(bot);
  registerProfile(bot);

  bot.catch((err, ctx) => {
    console.error("telegraf error:", err);
    ctx.reply(GENERIC_ERROR).catch(() => {});
  });

  // bot.launch() only resolves once the bot is stopped, so don't await it —
  // fire it and only react to a startup failure via .catch()
  bot.launch().catch((err) => console.error("Telegram bot failed to launch:", err));
  console.log("Telegram bot starting (long polling)...");
}

export function stopBot() {
  bot?.stop("shutdown");
}

export async function sendTelegramMessage(telegramId: string, message: string) {
  if (!bot) return;
  await bot.telegram.sendMessage(telegramId, message);
}
