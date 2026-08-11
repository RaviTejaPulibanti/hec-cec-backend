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

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error("Please enter a valid email address");
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
    res.status(200).json({
      message : "User fetched successfully",
      user : req.user,
    });
}

export default  {
  signup,
  signin,
  getme,
};