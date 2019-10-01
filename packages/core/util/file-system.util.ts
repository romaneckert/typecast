import * as nodeFs from 'fs';
import * as nodePath from 'path';

export default class FileSystemUtil {
    public static async symlink(target: string, path: string) {
        return nodeFs.promises.symlink(target, path);
    }

    public static async rename(oldPath: string, newPath: string): Promise<void> {
        return nodeFs.promises.rename(oldPath, newPath);
    }

    public static async remove(path: string): Promise<void> {
        if ((await this.isFile(path)) || (await this.isSymlink(path))) {
            await nodeFs.promises.unlink(path);
        } else if (await this.isDirectory(path)) {
            for (const file of await nodeFs.promises.readdir(path)) {
                await this.remove(nodePath.join(path, file));
            }

            await nodeFs.promises.rmdir(path);
        }
    }

    public static async isFile(path: string): Promise<boolean> {
        try {
            return (await nodeFs.promises.lstat(path)).isFile();
        } catch (err) {
            return false;
        }
    }

    public static async isSymlink(path: string): Promise<boolean> {
        try {
            return (await nodeFs.promises.lstat(path)).isSymbolicLink();
        } catch (err) {
            return false;
        }
    }

    public static async isDirectory(path: string): Promise<boolean> {
        try {
            return (await nodeFs.promises.lstat(path)).isDirectory();
        } catch (err) {
            return false;
        }
    }

    public static async isSymlinkToDirectory(path: string): Promise<boolean> {
        try {
            return (await nodeFs.promises.stat(path)).isDirectory() && (await this.isSymlink(path));
        } catch (err) {
            return false;
        }
    }

    public static async ensureFileExists(path: string): Promise<void> {
        try {
            return await nodeFs.promises.access(path, nodeFs.constants.R_OK);
        } catch (err) {
            await this.ensureDirExists(nodePath.dirname(path));
        }

        return await nodeFs.promises.appendFile(path, '');
    }

    public static async ensureFileExistsSync(path: string): Promise<void> {
        try {
            return nodeFs.accessSync(path, nodeFs.constants.R_OK);
        } catch (err) {
            this.ensureDirExistsSync(nodePath.dirname(path));
        }

        return nodeFs.appendFileSync(path, '');
    }

    public static async ensureDirExists(path: string): Promise<void> {
        return nodeFs.promises.mkdir(path, { recursive: true });
    }

    public static async ensureDirExistsSync(path: string): Promise<void> {
        return nodeFs.mkdirSync(path, { recursive: true });
    }

    public static async appendFile(path: string, data: any): Promise<void> {
        return nodeFs.promises.appendFile(path, data);
    }

    public static async readFile(path: string): Promise<string> {
        return String(await nodeFs.promises.readFile(path, 'utf8'));
    }

    public static async readDirectory(path: string): Promise<string[]> {
        return nodeFs.promises.readdir(path);
    }
}