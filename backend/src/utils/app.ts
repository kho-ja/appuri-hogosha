import express from 'express';
import { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from '../config';

const allowedOrigins = [
    config.FRONTEND_URL,
    /^https:\/\/appuri-hogosha.*kho-jas-projects\.vercel\.app$/,
    /^https:\/\/www\.parents\.jdu\.uz\/?$/,
    /^https:\/\/.*\.d1cwu6doj7iui6\.amplifyapp\.com$/,
];
class App {
    public app: Application;

    constructor(routes: any[]) {
        this.app = express();

        this.app.use(
            express.json({
                limit: '20mb',
            })
        );

        this.app.use(morgan('dev'));

        this.app.use(
            cors({
                origin: function (origin, callback) {
                    if (!origin) return callback(null, true); // allow server-to-server or tools

                    const isAllowed = allowedOrigins.some(allowed =>
                        typeof allowed === 'string'
                            ? allowed === origin
                            : allowed?.test(origin)
                    );

                    if (isAllowed) {
                        callback(null, true);
                    } else {
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: 'GET,HEAD,PUT,POST,DELETE',
                credentials: true,
                optionsSuccessStatus: 204,
                exposedHeaders: ['Content-Disposition'],
            })
        );

        // Lightweight health check endpoint
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', time: new Date().toISOString() });
        });

        routes.forEach(route => {
            if (route.path) {
                this.app.use(route.path, route.router);
            } else {
                this.app.use(route.router);
            }
        });
    }

    public listen() {
        if (config.NODE_ENV !== 'production') {
            this.app.listen(config.PORT, () => {
                console.log(`http://127.0.0.1:${config.PORT}/`);
            });
        }

        return this.app;
    }
}

export default App;