import jwt from 'jsonwebtoken';

const examAccessTokenExpiry = "2h";

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

export const generateExamAccessToken = (userId: string, examId: string) => {
  const secret = process.env.JWT_SECRET as string;

  return jwt.sign(
    { userId, examId, purpose: "exam-access" },
    secret,
    { expiresIn: examAccessTokenExpiry }
  );
};

export const isValidExamAccessToken = (
  token: string | undefined,
  userId: string,
  examId: string
) => {
  if (!token) return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId?: string;
      examId?: string;
      purpose?: string;
    };

    return payload.purpose === "exam-access" && payload.userId === userId && payload.examId === examId;
  } catch {
    return false;
  }
};
