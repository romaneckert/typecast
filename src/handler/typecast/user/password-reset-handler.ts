import express from 'express';
import { Form } from '../../../core/form';
import { Inject } from '../../../core/inject';
import { ILogger } from '../../../interface/service/logger-service-interface';
import { IRouteHandler } from '../../../interface/route-handler-interface';
import { EmailValidator } from '../../../validator/email-validator';

export class TypecastUserPasswordResetHandler implements IRouteHandler {
    @Inject('service', 'logger', 'handler', 'typecast-user-password-reset')
    private logger: ILogger;

    public async handle(req: express.Request, res: express.Response): Promise<void> {
        const form = await new Form(new EmailValidator()).handle(req);

        if (!form.valid) {
            return res.render('typecast/user/password-reset', {
                form,
            });
        }

        const user = await this.container.repository.user.findOne({ where: { email: form.data.email } });

        if (undefined === user) {
            return res.render('typecast/user/password-reset-success', {
                form,
            });
        }

        // generate password token
        const passwordToken = await this.container.service.auth.generatePasswordToken();

        if (undefined !== (await this.container.repository.user.findOne({ where: { passwordToken } }))) {
            this.logger.error('password token already exists');

            form.addError(
                {
                    data_process: 'typecast.error.data_process',
                },
                'user',
            );

            return res.render('typecast/user/password-reset', {
                form,
            });
        }

        user.passwordToken = passwordToken;
        user.passwordTokenCreationDate = new Date();

        await this.container.repository.user.save(user);

        // send email with confirm token
        const html = await this.container.service.server.render('typecast/user/email/set-password', { user });
        const subject =
            this.container.service.i18n.translate(res.locals.locale, 'application.title') +
            ' | ' +
            this.container.service.i18n.translate(res.locals.locale, 'typecast.user.email.password.subject');

        await this.container.service.mail.send({
            html,
            subject,
            to: user.email,
        });

        return res.render('typecast/user/password-reset-success');
    }
}
