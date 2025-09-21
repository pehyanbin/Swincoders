import { useState } from "react";
import { useNavigate } from "react-router-dom";

const questions = [
  "Hi! Let's set up your learning journey. Can you tell me a bit about your current experience or share your resume summary?",
  "Great! What skills or topics do you want to focus on learning?",
  "What skill gaps are you trying to fill?",
  "Awesome! What are your main goals or areas you want to improve?",
];

export default function Onboarding() {
  const [chatHistory, setChatHistory] = useState([
    { sender: "ai", text: questions[0] },
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [answers, setAnswers] = useState([]); // store 4 answers
  const [isGenerating, setIsGenerating] = useState(false); // new loading state
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const updatedChat = [
      ...chatHistory,
      { sender: "user", text: userAnswer },
    ];
    setChatHistory(updatedChat);

    // Store this answer
    const updatedAnswers = [...answers, userAnswer];
    setAnswers(updatedAnswers);
    setUserAnswer("");

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          { sender: "ai", text: questions[nextIndex] },
        ]);
        setCurrentQuestionIndex(nextIndex);
      }, 500);
    } else {
      // All 4 answers collected → show "Generating lesson"
      setIsGenerating(true);
      setChatHistory([]); // hide chat history
      await sendAnswersToBackend(updatedAnswers);
    }
  };

  const sendAnswersToBackend = async (finalAnswers) => {
    try {
      const response = await fetch(
        "https://2behmsvo35.execute-api.ap-southeast-5.amazonaws.com/production/onboard-chat/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "EMP#123", // Replace with logged-in user id
            answers: finalAnswers,
            currentLevel: "Beginner", // Or fetch from profile
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send answers: ${response.status}`);
      }

      const lesson = await response.json();
      console.log("Generated lesson from backend:", lesson);

      // Navigate and pass lesson as state
      navigate("/lessons", { state: { lesson } });
    } catch (error) {
      console.error("Error sending answers to backend:", error);
      alert("Failed to generate your learning path. Please try again.");
      setIsGenerating(false); // allow retry
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">
        Welcome to MicroLearning!
      </h1>

      {/* Show chat OR loading message */}
      {!isGenerating ? (
        <>
          {/* Chat Box */}
          <div className="bg-gray-50 p-4 rounded-2xl shadow space-y-2 max-h-[60vh] overflow-y-auto">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === "ai" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`p-3 rounded-xl max-w-[80%] ${
                    msg.sender === "ai"
                      ? "bg-indigo-100 text-indigo-900"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* User Input */}
          {currentQuestionIndex < questions.length && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                Send
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-40">
          <div className="animate-pulse text-lg text-indigo-700 font-medium">
            Generating learning lesson for you...
          </div>
        </div>
      )}
    </div>
  );
}
