import { Link } from "react-router-dom";
import { useProgress } from "../contexts/AuthContext";

// Mock lessons (replace with API data)
const lessons = [
  { lessonId: "LESSON#001", topic: "MFA", level: "Beginner" },
  { lessonId: "LESSON#002", topic: "Password Hygiene", level: "Beginner" },
  { lessonId: "LESSON#003", topic: "Phishing Awareness", level: "Beginner" },
];

export default function Home() {
  const { progress } = useProgress(); // { "LESSON#001": 100, "LESSON#002": 50 }

  // Calculate overall completion percentage
  const totalLessons = lessons.length;
  const completedLessons = Object.keys(progress).filter(
    (key) => progress[key] === 100
  ).length;
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  // Determine next lesson
  const nextLesson =
    lessons.find((lesson) => !progress[lesson.lessonId] || progress[lesson.lessonId] < 100) || lessons[0];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome Back!</h1>

      {/* Overall Progress */}
      <div className="p-4 bg-white rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-2">Your Learning Progress</h2>
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-4 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-gray-600">
          {completedLessons} of {totalLessons} lessons completed ({overallProgress}%)
        </p>
      </div>

      {/* Next Lesson */}
      <div className="p-4 bg-indigo-50 rounded-2xl shadow">
        <h2 className="text-xl font-semibold mb-2">Next Lesson</h2>
        <p className="text-gray-700 mb-2">{nextLesson.topic}</p>
        <Link
          to={`/lessons/${nextLesson.lessonId}`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          Continue Learning
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/lessons"
          className="p-4 bg-white rounded-2xl shadow text-center hover:shadow-lg transition"
        >
          <h3 className="text-lg font-semibold">All Lessons</h3>
        </Link>
        <Link
          to="/profile"
          className="p-4 bg-white rounded-2xl shadow text-center hover:shadow-lg transition"
        >
          <h3 className="text-lg font-semibold">Profile</h3>
        </Link>
        
      </div>
    </div>
  );
}
