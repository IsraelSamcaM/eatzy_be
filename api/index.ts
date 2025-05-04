import app from '../src/index';
import { NowRequest, NowResponse } from '@vercel/node';

export default (req: NowRequest, res: NowResponse) => {
    app(req, res);
};