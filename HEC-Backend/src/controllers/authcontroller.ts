import bcrypt from "bcrypt";
import User, { UserRole } from "../models/user.js";
import { generateToken } from "../utils/jwt.js";

interface SignupData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

interface SigninData {
  email?: string;
  password?: string;
}

const signup = async (data: SignupData) => {
  const { name, email, password, role } = data;

  if (!name || !name.trim()) {
    throw new Error("Name is required");
  }
  if (!email || !email.trim()) {
    throw new Error("Email is required");
  }
  if (!password) {
    throw new Error("Password is required");
  }

  
  const emailRegex = /^s\d{6}@rguktsklm\.ac\.in$/i;
  if (!emailRegex.test(email.trim())) {
    throw new Error("only college emails are allowed");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  
  const formattedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: formattedEmail });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  
  const hashedPassword = await bcrypt.hash(password, 10);

  const userPayload: any = {
    name: name.trim(),
    email: formattedEmail,
    password: hashedPassword,
  };

  if (role) {
    if (Object.values(UserRole).includes(role)) {
      userPayload.role = role;
    } else {
      const allowedRoles = Object.values(UserRole).join(", ");
      throw new Error(`Invalid role. Choose from: ${allowedRoles}`);
    }
  }

  
  const user = await User.create(userPayload);
  const token = await generateToken(user._id.toString(), user.role);
  
 
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token,
  };
};


const signin = async(data : SigninData)=>{
  
  const { email, password} = data;
  if(!email ||!email.trim()){
    throw new Error("Email is required");
  }
  if(!password){
    throw new Error("Password is required");
  }

  const formattedEmail = email.toLowerCase().trim();
  const user = await User.findOne({email : formattedEmail}).select("+password");

  if(!user){
    throw new Error("Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if(!isPasswordValid){
    throw new Error("Invalid credentials");
  }

  const token = await generateToken(user._id.toString(), user.role);

  return{
    id : user._id,
    name : user.name,
    email : user.email,
    token,
    role : user.role,
  }
}

const getme = async( req :any, res:any)=>{
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message : "User fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        year: user.year,
        studentClass: user.studentClass,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

const updateProfile = async (req: any, res: any) => {
  try {
    const { name, branch, year, studentClass } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updates: any = { name: name.trim() };

    if (branch) {
      if (!["CSE", "AIML", "ECE", "EEE", "CIVIL", "MECH"].includes(branch)) {
        return res.status(400).json({ message: "Invalid branch" });
      }
      updates.branch = branch;
    }

    if (year) {
      if (!["E1", "E2", "E3", "E4"].includes(year)) {
        return res.status(400).json({ message: "Invalid year" });
      }
      updates.year = year;
    }

    if (studentClass) {
      if (!["A", "B", "C", "D", "E"].includes(studentClass)) {
        return res.status(400).json({ message: "Invalid class" });
      }
      updates.studentClass = studentClass;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        branch: updatedUser.branch,
        year: updatedUser.year,
        studentClass: updatedUser.studentClass,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update profile" });
  }
};

export default  {
  signup,
  signin,
  getme,
  updateProfile,
};