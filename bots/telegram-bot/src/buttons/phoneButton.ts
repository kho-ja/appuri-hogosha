import { Keyboard } from 'grammy';
import { Language } from '../middlewares/sessionMiddleware';

export const phoneButton = (lang: Language) => {
    let text;
    if (lang === 'jp') text = '☎️電話番号を送信';
    else if (lang === 'ru') text = '☎️Отправить номер телефона';
    else text = '☎️Telefon raqamini yuboring';

    return new Keyboard().requestContact(text).resized();
};
