import {Markup} from "telegraf";
import {Language} from "../sessionHandler";

// send one keyboard for change lanaugae
export function menuButton(lang: Language) {
    let text;
    if (lang === 'jp') {
        text = '言語を変更:🇯🇵🇺🇿🇷🇺';
    } else if (lang === 'ru') {
        text = 'Изменить язык:🇯🇵🇺🇿🇷🇺';
    } else {
        text = 'Tilni o`zgartirish:🇯🇵🇺🇿🇷🇺';
    }
    return Markup.keyboard([
        Markup.button.callback(text, 'language'),
    ]).resize();
}