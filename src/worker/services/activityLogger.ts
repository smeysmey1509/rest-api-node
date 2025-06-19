import Activity from "../../models/Activity";

export const logActivity = async (data: any) => {
    const activity = new Activity({
        user: data.user,
        action: data.action,
        product: data.product,
    });
    await activity.save();
};
