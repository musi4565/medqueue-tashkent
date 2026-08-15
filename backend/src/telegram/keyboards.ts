import { Markup } from "telegraf";

export const MAIN_MENU_BUTTONS = [
  ["🏥 Navbat olish", "👨‍⚕️ Shifokorlar"],
  ["🏢 Klinikalar", "🎫 Mening navbatim"],
  ["🧪 Tahlillar", "👤 Profil"],
];

export function mainMenuKeyboard() {
  return Markup.keyboard(MAIN_MENU_BUTTONS).resize();
}

export function contactRequestKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest("📱 Raqamni ulashish")],
  ])
    .resize()
    .oneTime();
}
