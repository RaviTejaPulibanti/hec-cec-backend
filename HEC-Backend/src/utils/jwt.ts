import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, role: string) => {
  const secret = process.env.JWT_SECRET as string;

  return jwt.sign(
    {
      _id: userId,
      userId,
      role,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
};
