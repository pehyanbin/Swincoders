import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { API_BASE_URL } from "../constants";


export default function LessonDetail() {
  const { lessonId } = useParams();
  
  const location = useLocation();
  const navigate = useNavigate();

  const passedLesson = location.state?.lesson;
  const [lesson, setLesson] = useState(passedLesson || null);
  const [loading, setLoading] = useState(!passedLesson);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const finishLesson = async () => {
    try {
      setFinishing(true);
      const response = await fetch(API_BASE_URL+"/finish-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "USER#EMP#123", // replace with actual logged-in user
          lessonID: lessonId,
        }),
      });

      if (!response.ok) throw new Error("Failed to finish lesson");
      const data = await response.json();

      navigate("/lessons");
    } catch (error) {
      console.error("Error finishing lesson:", error);
      alert("Failed to finish lesson. Try again.");
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading lesson...</p>;
  if (!lesson) return <p className="text-red-500">Lesson not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{lesson.topic}</h1>
      <p className="mb-4 text-gray-600">{lesson.level} Level</p>

      {/* Theory Content */}
      <div className="space-y-4">
        {lesson.theories?.map((t, index) => (
          <div key={index} className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <p className="text-gray-700">{t.content}</p>
          </div>
        ))}
      </div>

      {/* Quiz Section */}
      {lesson.quiz && (
        <div className="mt-6 p-4 bg-indigo-50 rounded-2xl">
          {!showQuiz ? (
            <div className="text-center">
              <button
                onClick={() => setShowQuiz(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                Take Quiz
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">Quiz</h3>
              <p className="mb-4">{lesson.quiz.question}</p>

              <div className="space-y-2">
                {lesson.quiz.options.map((option, index) => (
                  <label
                    key={index}
                    className={`block p-2 border rounded-xl cursor-pointer transition ${
                      selectedOption === index
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="quiz"
                      value={index}
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="mr-2"
                      disabled={submitted}
                    />
                    {option}
                  </label>
                ))}
              </div>

              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={selectedOption === null}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  Submit
                </button>
              ) : (
                <div className="mt-4 flex gap-4">
                  <div
                    className={`p-3 rounded-xl flex-1 text-center font-semibold ${
                      selectedOption === lesson.quiz.correctAnswer
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedOption === lesson.quiz.correctAnswer
                      ? "Correct!"
                      : "Incorrect. Try again!"}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOption(null);
                      setSubmitted(false);
                    }}
                    className="px-4 py-2 bg-yellow-400 text-black rounded-xl hover:bg-yellow-500"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={finishLesson}
          disabled={finishing}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
        >
          {finishing ? "Finishing..." : "✅ Finish Lesson"}
        </button>
      </div>

      <div className="mt-6">
        <Link to="/lessons" className="text-indigo-600 hover:underline">
          ← Back to Lessons
        </Link>
      </div>
    </div>
  );
}




      
