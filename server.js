import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// --------------------
// Connect to MongoDB
// --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(`MongoDB connected to DB: ${mongoose.connection.name}`))
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });

// --------------------
// Schema + Model
// --------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    surname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "contactes", versionKey: false }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });
userSchema.index({ surname: 1, name: 1 });

const User = mongoose.model("User", userSchema);

// --------------------
// CRUD Routes
// --------------------

// List all users
app.get("/list", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List users by date range
// Example: /listrange?start=YYYY-MM-DD&end=YYYY-MM-DD
app.get("/listrange", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).send("Missing start or end date");

    const users = await User.find({
      createdAt: { $gte: new Date(start), $lte: new Date(end) },
    });
    res.json(users);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// --------------------
// Add user
// --------------------

// Browser-friendly GET
// Example: /add?name=Laura&surname=Martinez&phone=600111003&email=laura@mail.com
app.get("/add", async (req, res) => {
  try {
    const { name, surname, phone, email } = req.query;
    if (!name || !surname || !phone || !email) return res.status(400).send("Missing required fields");

    const newUser = new User({ name, surname, phone, email });
    await newUser.save();
    res.send(`User added successfully: ${JSON.stringify(newUser)}`);
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("Email already exists");
    res.status(400).send(err.message);
  }
});

// Postman-friendly POST
app.post("/add", async (req, res) => {
  try {
    const { name, surname, phone, email } = req.body;
    if (!name || !surname || !phone || !email) return res.status(400).json({ error: "Missing required fields" });

    const newUser = new User({ name, surname, phone, email });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Email already exists" });
    res.status(400).json({ error: err.message });
  }
});

// --------------------
// Update user
// --------------------

// Browser GET
// Example: /update/ID?name=NewName&phone=600999888
app.get("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, phone, email } = req.query;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, surname, phone, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).send("User not found");

    res.send(`User updated successfully: ${JSON.stringify(updatedUser)}`);
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("Email already exists");
    res.status(400).send(err.message);
  }
});

// Postman PUT
// Example: PUT /update/ID with JSON body
app.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, phone, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, surname, phone, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Email already exists" });
    res.status(400).json({ error: err.message });
  }
});

// --------------------
// Delete user
// --------------------

// Browser GET
// Example: /delete/ID
app.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).send("User not found");
    res.send(`User deleted successfully: ${JSON.stringify(deletedUser)}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Postman DELETE
app.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully", deletedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --------------------
// Start server
// --------------------
const PORT = process.env.PORT || 3021;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API ready: http://localhost:${PORT}/list`);
});
