import dotenv from 'dotenv';
dotenv.config();

import createApp from './createApp';

const app = createApp();

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}/`);
});
