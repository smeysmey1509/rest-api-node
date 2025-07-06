import { AuthenicationRequest} from "../../../middleware/auth";
import {Response} from "express";
import Notification from "../../../models/Notification";

export const deleteNotification = async (req: AuthenicationRequest, res: Response) => {
    try{
        const {id} = req.params;

        const deleteNotif = await Notification.findByIdAndDelete(id);
        if (!deleteNotif) {
            res.status(404).json({ msg: "NNotification not found." });
            return;
        }

        res.status(200).json({msg: "Successfully deleted notification."});
        return;
    }catch(err){
        console.error("Failed to delete notification:", err);
        res.status(500).json({ msg: "Server error deleting notification." });
        return
    }
}