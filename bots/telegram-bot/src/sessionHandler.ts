import {Context, MiddlewareFn} from 'telegraf';
import DB from './utils/db-client';

export type Language = 'jp' | 'ru' | 'uz';

interface IUserSession {
    id: number;
    chat_id: number;
    language: Language | '';
    scene: string;
    step: number;
    parent_id: number;
}

export const saveSession = async (sessionData: IUserSession): Promise<void> => {
    const {id, chat_id, language, scene, step, parent_id} = sessionData;

    try {
        if (id > 0) {
            console.log('update session');
            const query = "UPDATE ParentSession  SET language = :language, scene = :scene, step = :step, parent_id = :parent_id WHERE chat_id = :chat_id;";
            await DB.execute(query, {
                language: language,
                scene: scene,
                step: step,
                parent_id: parent_id,
                chat_id: chat_id
            });
        } else {
            console.log('insert session');
            const query = `INSERT INTO ParentSession (chat_id, language, scene, step, parent_id)
                               VALUE (:chat_id, :language, :scene, :step, :parent_id);`;
            await DB.execute(query, {
                language: language,
                scene: scene,
                step: step,
                parent_id: parent_id,
                chat_id: chat_id
            });
        }
    } catch
        (e) {
        console.error('Error in saveSession:', e);
    }
}

export const getSession = async (chatId: number) => {
    try {
        const query = "SELECT id, chat_id, scene, step, parent_id, language FROM ParentSession WHERE chat_id = :chat_id;";
        const result = await DB.query(query, {chat_id: chatId});
        return result[0];
    } catch (e) {
        console.error('Error in getSession:', e);
        return null;
    }
}

export const sessionMiddleware: MiddlewareFn<IBotContext> = async (ctx: any, next: any) => {
    if (!ctx.chat || !ctx.chat) {
        throw new Error('Chat not found');
    }

    const chatId = ctx.chat.id;

    try {
        let session: IUserSession = await getSession(chatId);
        // console.log('session:', session);
        if (!session) {
            session = {
                id: 0,
                chat_id: chatId,
                language: '',
                scene: '',
                step: 0,
                parent_id: 0
            }

            await saveSession(session);
        }

        ctx.session = session;
        ctx.saveSession = async (updates: Partial<IUserSession>) => {
            Object.assign(ctx.session, updates);
            console.log('saveSession:', ctx.session);
            await saveSession(ctx.session);
        }
        ctx.clearScene = async () => {
            await ctx.saveSession({scene: ''});
        };

        await next();
    } catch (e) {
        console.error('Error in sessionMiddleware:', e);
    }
}


export interface IBotContext extends Context {
    session: IUserSession;
    saveSession: (updates: Partial<IUserSession>) => Promise<void>;
    clearScene: () => Promise<void>;
}
