import { Keyboard } from 'grammy';
import { Language } from '../middlewares/sessionMiddleware';

export const menuButton = (lang: Language) => {
    let text;
    if (lang === 'jp') text = '言語を変更:🇯🇵🇺🇿🇷🇺';
    else if (lang === 'ru') text = 'Изменить язык:🇯🇵🇺🇿🇷🇺';
    else text = 'Tilni o`zgartirish:🇯🇵🇺🇿🇷🇺';

    return new Keyboard().text(text).resized();
};
