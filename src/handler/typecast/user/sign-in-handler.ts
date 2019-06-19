import express from 'express';
import { ContainerAware } from '../../../core/container-aware';
import { SignInForm } from '../../../form/sign-in-form';
import { IRouteHandler } from '../../../interface/route-handler-interface';

export class SignInHandler extends ContainerAware implements IRouteHandler {
    public async handle(req: express.Request, res: express.Response): Promise<void> {
        const form = new SignInForm();

        if (!form.valid) {
            return res.render('typecast/user/sign-in', {
                form,
            });
        }
    }
}