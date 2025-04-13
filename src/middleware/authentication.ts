import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || 'defaultSecretKey';

export enum permissionsType {
    users = 0,
    audits = 1,
    forms1And2 = 2,
    dataCatalog = 3,
    planning = 4,
}

export enum permissionsRequiered {
    read,
    write,
    delete
}

export const authenticateToken = (permissionsNeeded?: permissionsRequiered, permission?: permissionsType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = req.header('Authorization');

        if (!token)
            return res.status(401).json({ message: 'Unauthorized' });

        jwt.verify(token, secretKey, (err: any, user: any) => {
            if (err) return res.status(403).json({ message: 'Forbidden' });
            if (permissionsNeeded && permission && !userHasPermission(permissionsNeeded, permission, user.role.permissions_read, user.role.permissions_modify, user.role.permissions_delete))
                return res.status(403).json({ message: 'The token has expired' });
            next();
        });
    };
}

function userHasPermission(
    permissionsNeeded: permissionsRequiered,
    permission: number,
    userReadPermissions: [boolean, boolean, boolean, boolean, boolean],
    userWritePermissions: [boolean, boolean, boolean, boolean, boolean],
    userDeletePermissions: [boolean, boolean, boolean, boolean, boolean]
): boolean {
    switch (permissionsNeeded) {
        case permissionsRequiered.read:
            return userReadPermissions[permission];
        case permissionsRequiered.write:
            return userWritePermissions[permission];
        case permissionsRequiered.delete:
            return userDeletePermissions[permission];
        default:
            return false;
    }
}