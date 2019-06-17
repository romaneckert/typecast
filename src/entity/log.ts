import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity()
export class Log {
    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public code: number;

    @Column()
    public date: Date;

    @Column()
    public message: string;

    @Column()
    public contextType: string;

    @Column()
    public contextName: string;

    constructor(code: number, date: Date, contextType: string, contextName: string, message: string) {
        this.code = code;
        this.date = date;
        this.contextType = contextType;
        this.contextName = contextName;
        this.message = message;
    }

    public get level(): string {
        switch (this.code) {
            case 0:
                return 'emergency';
            case 1:
                return 'alert';
            case 2:
                return 'critical';
            case 3:
                return 'error';
            case 4:
                return 'warning';
            case 5:
                return 'notice';
            case 6:
                return 'info';
            case 7:
                return 'debug';
            default:
                return 'notice';
        }
    }
}
