import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProgress } from "../contexts/AuthContext";
import { API_BASE_URL } from "../constants";

export default function Lessons() {
  const { progress } = useProgress();
  const { user } = useProgress(); // { userId: "EMP#123", name: "Alice" }
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if (!user?.userId) return; // Wait until user is loaded

    async function fetchLessons() {
      try {
        const res = await fetch(`${API_BASE_URL}/latest-lesson`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "USER#EMP#123",
            done: false, // only fetch unfinished lessons
          }),
        });

        const data = await res.json();
        const {lessons} = JSON.parse(data.body);
        console.log("Fetched lessons:", lessons);
        setLessons(lessons || []);
      } catch (error) {
        console.error("Failed to fetch lessons:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLessons();
  }, []);

  // if (!user?.userId) return <p>Loading user...</p>;
  if (loading) return <p>Loading lessons...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lessons</h1>

      {/* Recommended Lesson */}
      {
        lessons.length > 0 ? (
          lessons.map((lesson) => (
            <Link
              key={lesson.lessonID}
              to={`/lessons/${lesson.lessonID}`}
              state={{ lesson }} // pass lesson data
              className="p-4 bg-white rounded-2xl shadow hover:shadow-lg transition block"
            >
              <h3 className="text-lg font-semibold mb-1">{lesson.topic}</h3>
              <p className="text-gray-600 mb-2">{lesson.level} Level</p>
              <p className="text-sm"> { lesson.done ? "done" : "learning"}</p>
             
            </Link>
          ))  
         
        ) : (
          <p className="text-gray-500">You have completed all available lessons. Great job!</p>
        )
      }

     
    </div>
  );
}
