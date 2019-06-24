import { ViewHelper } from '../decorator/view-helper';
import { IViewHelper } from '../interface/view-helper';
import { ServerService } from '../service/server';

@ViewHelper()
export class UrlViewHelper implements IViewHelper {
    private server: ServerService;

    public constructor(server: ServerService) {
        this.server = server;
    }

    public render(routeName: string, data: { [key: string]: any }): string {
        if (undefined === this.server.routes[routeName]) {
            throw new Error(`route with name ${routeName} does not exists`);
        }

        return this.server.routes[routeName].path.replace(/(\/:\w+\??)/g, (m: any, c: any) => {
            c = c.replace(/[/:?]/g, '');
            return data[c] ? '/' + data[c] : '';
        });
    }
}