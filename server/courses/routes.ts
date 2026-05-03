import { Express } from "express";
import { storage } from "../storage";
import { logServerError } from '../middleware/audit-logger';

export function registerCourseRoutes(app: Express) {
  // ===== Course Routes =====
  
  // Get all courses
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      return res.status(200).json(courses);
    } catch (error: any) {
      logServerError("Get courses error:", error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get course by ID
  app.get("/api/courses/:id", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      return res.status(200).json(course);
    } catch (error: any) {
      logServerError("Get course error:", error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get courses by user ID
  app.get("/api/users/:userId/courses", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const courses = await storage.getCoursesByUserId(userId);
      return res.status(200).json(courses);
    } catch (error: any) {
      logServerError("Get user courses error:", error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Enroll user in course
  app.post("/api/users/:userId/courses/:courseId/enroll", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const courseId = parseInt(req.params.courseId);
      
      const enrollment = await storage.enrollUserInCourse(userId, courseId);
      return res.status(201).json(enrollment);
    } catch (error: any) {
      logServerError("Enroll user error:", error, req);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  });
}