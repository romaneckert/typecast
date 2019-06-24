import bodyParser from 'body-parser';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import * as https from 'https';
import * as nodePath from 'path';
import { ApplicationConfig } from '../config/application-config';
import { ServerConfig } from '../config/server-config';
import { Container } from '../core/container';
import { ErrorCatchHandler } from '../core/error-catch';
import { Service } from '../decorator/service';
import { IRoute } from '../interface/route';
import { AccessMiddleware } from '../middleware/access';
import { ErrorMiddleware } from '../middleware/error';
import { NotFoundMiddleware } from '../middleware/not-found';
import { FileSystemUtil } from '../util/file-system';
import { LoggerService } from './logger';
import { RendererService } from './renderer';

@Service()
export class ServerService {
    public routes: { [key: string]: IRoute } = {};

    private logger: LoggerService;
    private config: ServerConfig;
    private applicationConfig: ApplicationConfig;
    private renderer: RendererService;
    private router: express.Application;

    private accessMiddleware: AccessMiddleware;
    private errorMiddleware: ErrorMiddleware;

    private pathToKeyPem: string;
    private pathToCertPem: string;

    private connection: any;

    constructor(
        config: ServerConfig,
        applicationConfig: ApplicationConfig,
        logger: LoggerService,
        renderer: RendererService,
        accessMiddleware: AccessMiddleware,
        errorMiddleware: ErrorMiddleware,
    ) {
        this.config = config;
        this.applicationConfig = applicationConfig;
        this.logger = logger;
        this.renderer = renderer;
        this.accessMiddleware = accessMiddleware;
        this.errorMiddleware = errorMiddleware;

        this.router = express();

        this.pathToKeyPem = nodePath.join(this.applicationConfig.rootPath, 'config/key.pem');
        this.pathToCertPem = nodePath.join(this.applicationConfig.rootPath, 'config/cert.pem');
    }

    public async start(): Promise<void> {
        this.renderer.start();
        this.router.enable('strict routing');
        this.router.use(helmet());
        this.router.use(compression());
        this.router.use(bodyParser.urlencoded({ extended: false }));

        for (const path of this.applicationConfig.paths.slice(0).reverse()) {
            const publicPath = nodePath.join(path, 'public');

            if (await FileSystemUtil.isDirectory(publicPath)) {
                this.router.use(express.static(publicPath, { maxAge: '30 days' }));
            }
        }

        // register access middleware
        this.router.use(this.accessMiddleware.handle.bind(this.accessMiddleware));

        await this.registerRoutes();

        // register error middleware
        this.router.use(this.errorMiddleware.handle.bind(this.errorMiddleware));

        // register not found middleware
        const notFoundMiddleware = new NotFoundMiddleware();
        this.router.use(notFoundMiddleware.handle.bind(notFoundMiddleware));

        this.router.engine('pug', this.renderer.render.bind(this.renderer));

        const viewPaths = [];

        for (const path of this.applicationConfig.paths.slice(0).reverse()) {
            const viewPath = nodePath.join(path, 'view/template');

            if (await FileSystemUtil.isDirectory(viewPath)) {
                viewPaths.push(viewPath);
            }
        }

        this.router.set('views', viewPaths);
        this.router.set('view engine', 'pug');

        let server = null;

        // check certificates
        if (!(await FileSystemUtil.isFile(this.pathToKeyPem)) || !(await FileSystemUtil.isFile(this.pathToCertPem))) {
            await this.logger.warning(`.key and .pem files missing`, [this.pathToKeyPem, this.pathToCertPem]);
            server = this.router;
        } else {
            // start https server
            server = https.createServer(
                {
                    cert: await FileSystemUtil.readFile(this.pathToCertPem),
                    key: await FileSystemUtil.readFile(this.pathToKeyPem),
                },
                this.router,
            );
        }

        this.connection = server.listen(this.config.port);

        await this.logger.notice('started');
    }

    public async render(filePath: string, locals: { [key: string]: any } = {}) {
        // set defaults
        if ('string' !== typeof locals.baseUrl || 0 === locals.baseUrl.length) {
            locals.baseUrl = this.applicationConfig.baseUrl;
        }

        return new Promise((resolve, reject) => {
            this.router.render(filePath, locals, (err, html) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(html);
                }
            });
        });
    }

    public async stop() {
        await this.connection.close();

        await this.logger.notice('stopped');
    }

    private async registerRoutes() {
        for (const route of Object.values(await Container.getRoutes())) {
            this.routes[route.name] = route;
        }

        for (const route of Object.values(this.routes)) {
            for (const middleware of this.config.middlewares) {
                for (const method of route.methods) {
                    switch (method) {
                        case 'get':
                            this.router.get(route.path, middleware.handle.bind(middleware));
                            break;
                        case 'post':
                            this.router.post(route.path, middleware.handle.bind(middleware));
                            break;
                        default:
                            throw new Error('method ' + method + ' is not supported');
                    }
                }
            }

            for (const method of route.methods) {
                const errorCatchHandler = new ErrorCatchHandler(route);

                switch (method) {
                    case 'get':
                        this.router.get(route.path, errorCatchHandler.handle.bind(errorCatchHandler));
                        break;
                    case 'post':
                        this.router.post(route.path, errorCatchHandler.handle.bind(errorCatchHandler));
                        break;
                    default:
                        throw new Error('method ' + method + ' is not supported');
                }
            }
        }
    }
}