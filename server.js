import express from "express";
import mongoose from "mongoose";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// --------------------
// MongoDB connection (cached for Vercel)
// --------------------
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log("MongoDB connected");
}

// --------------------
// Schema + Model
// --------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    surname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: "contactes",
    versionKey: false
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

// --------------------
// Routes
// --------------------

// Health check
app.get("/", async (req, res) => {
  await connectDB();
  res.send("API is running 🚀");
});

// List all
app.get("/list", async (req, res) => {
  await connectDB();
  const users = await User.find();
  res.json(users);
});

// Add (Postman)
app.post("/add", async (req, res) => {
  await connectDB();
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(400).json({ error: err.message });
  }
});

// Add (Browser)
app.get("/add", async (req, res) => {
  await connectDB();
  try {
    const user = new User(req.query);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Update (Postman)
app.put("/update/:id", async (req, res) => {
  await connectDB();
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update (Browser)
app.get("/update/:id", async (req, res) => {
  await connectDB();
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      req.query,
      { new: true }
    );
    if (!updated) return res.status(404).send("User not found");
    res.json(updated);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Delete
app.delete("/delete/:id", async (req, res) => {
  await connectDB();
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User deleted", deleted });
});

// Browser delete
app.get("/delete/:id", async (req, res) => {
  await connectDB();
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).send("User not found");
  res.json(deleted);
});

// --------------------
// Export for Vercel
// --------------------
export default serverless(app);
