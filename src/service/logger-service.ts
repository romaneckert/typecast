import * as nodePath from 'path';
import { Connection, Repository } from 'typeorm';
import { ApplicationConfig } from '../config/application-config';
import { Log } from '../entity/log';
import { ILogger } from '../interface/logger-interface';
import { FileSystemService } from './file-system-service';

export class LoggerService implements ILogger {
    public contextType: string;
    public contextName: string;

    public logRepository: Repository<Log>;

    private maxSizePerLogFile: number = 16 * 1024 * 1024;
    private maxLogRotationsPerType: number = 10;
    private maxHistoryLength: number = 1000;
    private duplicateTime: number = 10000;

    private applicationConfig: ApplicationConfig;
    private fileSystemService: FileSystemService;

    public constructor(
        contextType: string,
        contextName: string,
        applicationConfig: ApplicationConfig,
        fileSystemService: FileSystemService,
    ) {
        this.contextType = contextType;
        this.contextName = contextName;
        this.applicationConfig = applicationConfig;
        this.fileSystemService = fileSystemService;
    }

    public set databaseConnection(connection: Connection) {
        this.logRepository = connection.getRepository(Log);
    }

    public async emergency(message: string, meta: any): Promise<void> {
        await this.log(0, message, meta);
    }

    public async alert(message: string, data?: any): Promise<void> {
        await this.log(1, message, data);
    }

    public async critical(message: string, data?: any): Promise<void> {
        await this.log(2, message, data);
    }

    public async error(message: string, data?: any): Promise<void> {
        await this.log(3, message, data);
    }

    public async warning(message: string, data?: any): Promise<void> {
        await this.log(4, message, data);
    }

    public async notice(message: string, data?: any): Promise<void> {
        await this.log(5, message, data);
    }

    public async info(message: string, data?: any): Promise<void> {
        await this.log(6, message, data);
    }

    public async debug(message: string, data?: any): Promise<void> {
        await this.log(7, message, data);
    }

    private async log(code: number, message: string, data?: any): Promise<void> {
        const date = new Date();

        // trim message
        message = message.trim();

        // remove line breaks from message
        message = message.replace(/(\r?\n|\r)/gm, ' ');

        const log = new Log(code, date, this.contextType, this.contextName, message);

        if (undefined !== this.logRepository) {
            try {
                await this.logRepository.save(log);
            } catch (err) {
                // TODO: handle error
            }
        }

        await this.writeLog(log);
    }

    private async writeLog(log: Log) {
        const logFilePaths = [
            nodePath.join(process.cwd(), 'var', this.applicationConfig.context, log.level + '.log'),
            nodePath.join(
                process.cwd(),
                'var',
                this.applicationConfig.context,
                log.contextType,
                log.contextName,
                log.level + '.log',
            ),
        ];

        let output = '[' + this.dateToString(log.date) + '] ';
        output += '[' + log.level + '] ';
        output += '[' + log.contextType + '/' + log.contextName + '] ';
        output += '[' + log.message + ']';
        output = output.replace(/\r?\n?/g, '').trim();

        for (const logFilePath of logFilePaths) {
            // check if log file exists and create if not
            await this.fileSystemService.ensureFileExists(logFilePath);

            // check if log rotation is necessary
            //await this._rotateLogFile(logFile);

            // write line to log file
            await this.fileSystemService.appendFile(logFilePath, output + '\n');
        }
    }

    private dateToString(date: Date): string {
        return (
            date.getFullYear() +
            '-' +
            ('0' + (date.getMonth() + 1)).slice(-2) +
            '-' +
            ('0' + date.getDate()).slice(-2) +
            ' ' +
            date.toTimeString().slice(0, 8)
        );
    }
}
