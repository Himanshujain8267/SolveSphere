import mongoose from "mongoose";
const connectDb = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is missing");
        }

        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Database Connected");
    } catch (error) {
        console.error("Database error:", error.message);
        throw error;

        
    }


}
export default connectDb