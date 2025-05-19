import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string
}

export interface AuthenicationRequest extends Request {
    user?: JwtPayload
}

export const authenticateToken = (
    req: AuthenicationRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers["authorization"];

    if(!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token, authentication denied." });
    }

    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
        req.user = decoded
        next()
    }catch(err){
        return res.status(401).json({msg: 'Token is not valid'})
    }

}