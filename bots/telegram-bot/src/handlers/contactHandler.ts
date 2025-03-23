import { IBotContext } from '../middlewares/sessionMiddleware';
import DB from '../utils/db-client';
import { userNotExist } from './userNotExist';
import { menuHandler } from '../commands/menuCommand';

export const contactHandler = async (ctx: IBotContext) => {
    try {
        if (ctx.session.parent_id !== 0) {
            await menuHandler(ctx);
        } else {
            // @ts-ignore
            let phone = ctx.message.contact.phone_number;
            phone = phone.startsWith('+') ? phone.slice(1) : phone;

            const users = await DB.query(
                'SELECT id FROM Parent WHERE phone_number = :phone_number;',
                { phone_number: phone }
            );

            if (users.length === 0) {
                await userNotExist(ctx);
            } else {
                ctx.session.parent_id = users[0].id;
                await ctx.save(ctx.session);
                await menuHandler(ctx);
            }
        }
    } catch (error) {
        console.error('Error in contactHandler:', error);
    }
};
