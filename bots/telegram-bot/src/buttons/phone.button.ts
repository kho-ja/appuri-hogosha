import {Markup} from "telegraf";
import {Language} from "../sessionHandler";

export function phoneButton(lang: Language) {
    let text;
    if (lang === 'jp') {
        text = '☎️電話番号を送信';
    } else if (lang === 'ru') {
        text = '☎️Отправить номер телефона';
    } else {
        text = '☎️Telefon raqamini yuboring';
    }
    return Markup.keyboard([
        Markup.button.contactRequest(text)
    ]).resize()
}