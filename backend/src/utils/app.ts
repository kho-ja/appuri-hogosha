import express from 'express'
import { Application } from 'express'
import cors from 'cors';
import process from "node:process";
import morgan from 'morgan';

class App {
    public app: Application

    constructor(routes: any[]) {
        this.app = express()

        this.app.use(express.json({
            limit: '20mb'
        }));

        this.app.use(morgan('dev'));

        this.app.use(cors({
            origin: '*',
            methods: 'GET,HEAD,PUT,POST,DELETE',
            credentials: true,
            optionsSuccessStatus: 204,
            exposedHeaders: ['Content-Disposition']
        }));

        routes.forEach(route => {
            if (route.path) {
                this.app.use(route.path, route.router);
            } else {
                this.app.use(route.router);
            }
        });
    }

    public listen() {
        if (process.env.NODE_ENV !== 'production') {
            this.app.listen(process.env.PORT, () => {
                console.log(`http://127.0.0.1:${process.env.PORT}/`)
            })
        }

        return this.app;
    }
}

export default App