import { Router, type Request, type Response } from "express";
import authController from "../controllers/authcontroller.js";

import authmiddleware from "../middlewares/authmiddleware.js";

const router = Router();

router.get("/getme", authmiddleware, authController.getme);
router.put("/profile", authmiddleware, authController.updateProfile);

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const user = await authController.signup(req.body);

    res.status(201).json({
      message: "User created successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: user.token,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signup failed";

    res.status(400).json({ message });
  }
});

router.post("/signin", async (req: Request, res: Response) => {
  try {
    const user = await authController.signin(req.body);

    res.status(200).json({
      message: "Signin successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: user.token,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signin failed";

    res.status(401).json({ message });
  }
});

export default router;
