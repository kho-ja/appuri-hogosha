import { Keyboard } from 'grammy';
import { Language } from '../middlewares/sessionMiddleware';

export const menuButton = (lang: Language, isLoggedIn: boolean) => {
    let text;
    if (lang === 'jp') text = '言語を変更:🇯🇵🇺🇿🇷🇺';
    else if (lang === 'ru') text = 'Изменить язык:🇯🇵🇺🇿🇷🇺';
    else text = 'Tilni o`zgartirish:🇯🇵🇺🇿🇷🇺';

    const keyboard = new Keyboard().text(text).row();
    if (isLoggedIn) {
        keyboard.text(
            lang === 'jp'
                ? '🚪 ログアウト'
                : lang === 'ru'
                  ? '🚪 Выйти'
                  : '🚪 Logout'
        );
    }
    return keyboard.resized();
};
