import {Markup} from "telegraf";

export const languageButton = Markup.inlineKeyboard([
    Markup.button.callback('🇷🇺 Русский', 'set_lang_ru'),
    Markup.button.callback('🇯🇵 日本語', 'set_lang_jp'),
    Markup.button.callback('🇺🇿 Oʻzbekcha', 'set_lang_uz'),
]);