import type {NextFunction, Request, Response} from "express";


export const adminMiddleware = (req: Request | any, res: Response, next: NextFunction) => {
  try {
    if (req.user && req.user.role === "COLLEGE_ADMIN") {  

      next();
    }
  else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
    } 
  }catch(err) {
    return res.status(401).json({
      message : "Went wrong in Admin Middleware"
    })
  }

}