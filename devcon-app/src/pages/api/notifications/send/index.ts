import { NextApiRequest, NextApiResponse } from 'next'
import webPush, { PushSubscription } from 'web-push';
import { subscriptions, clearSubscriptions } from '../index';

// TODO: Only allow logged-in users to send notifications

export default async function route(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query
    
    if (req.method === 'POST') {
        return post(req, res);
    }
}

webPush.setVapidDetails(
    'mailto:devcon-website@ethereum.org',
    process.env.VAPID_PUBLIC as string,
    process.env.VAPID_PRIVATE as string
);

export const post = async (req: NextApiRequest, res: NextApiResponse) => {
    const message = req.body;

    console.log(subscriptions, 'subscriptions')

    const invalidSubscriptions: PushSubscription[] = [];

    subscriptions.forEach((subscription: PushSubscription) => {
        webPush.sendNotification(subscription, message).catch(({ statusCode, status }) => {
            console.log(statusCode, 'ay')
            if (statusCode === 410) {
                invalidSubscriptions.push(subscription);
            }
        });
    })

    // This should be database calls
    clearSubscriptions(invalidSubscriptions);

    console.log(subscriptions, 'subscriptions post clear')

    return res.status(200).send('ok');
}
