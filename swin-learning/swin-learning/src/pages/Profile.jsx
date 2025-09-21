import { useState, useEffect } from "react";

// Mock employee data – replace with API call
const mockEmployee = {
  employeeID: "EMP#123",
  name: "Alice Tan",
  email: "alice@acme.com",
  companyId: "COMP#001",
  department: "IT",
  role: "Software Engineer",
  interests: ["Cloud Security", "AI Basics"],
  goals: "Improve secure coding skills",
  currentLevel: "Beginner",
  averageScore: 0.85,
  preferredTime: "09:00",
  createdAt: "2025-09-20T08:00:00Z",
};

export default function Profile() {
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    setEmployee(mockEmployee);
  }, []);

  if (!employee) return <p>Loading profile...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-indigo-700">Profile</h1>

      {/* Personal Info */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-2">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Personal Information</h2>
        <p><span className="font-semibold">Name:</span> {employee.name}</p>
        <p><span className="font-semibold">Email:</span> {employee.email}</p>
        <p><span className="font-semibold">Employee ID:</span> {employee.employeeID}</p>
        <p><span className="font-semibold">Department:</span> {employee.department}</p>
        <p><span className="font-semibold">Role:</span> {employee.role}</p>
        <p><span className="font-semibold">Company ID:</span> {employee.companyId}</p>
      </div>

      {/* Learning Info with Eye-Catching Score */}
      <div className="p-4 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-2xl shadow space-y-4">
        <h2 className="text-xl font-semibold text-indigo-700">Learning Info</h2>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-700">Current Level</p>
            <span className="inline-block mt-1 px-3 py-1 bg-indigo-600 text-white rounded-full">
              {employee.currentLevel}
            </span>
          </div>

          <div className="flex-1">
            <p className="font-semibold text-gray-700">Average Score</p>
            <div className="w-full bg-gray-300 rounded-full h-6 mt-1 overflow-hidden shadow-inner">
              <div
                className={`h-6 rounded-full transition-all`}
                style={{
                  width: `${employee.averageScore * 100}%`,
                  background: `linear-gradient(to right, #4f46e5, #6366f1)`,
                }}
              ></div>
            </div>
            <p className="mt-1 text-indigo-700 font-semibold">
              {(employee.averageScore * 100).toFixed(0)}%
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-700">Preferred Learning Time</p>
            <span className="inline-block mt-1 px-3 py-1 bg-indigo-300 text-indigo-900 rounded-full">
              {employee.preferredTime}
            </span>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-2">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Goals</h2>
        <p>{employee.goals}</p>
      </div>

      {/* Interests */}
      <div className="p-4 bg-white rounded-2xl shadow space-y-2">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {employee.interests.map((interest, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium shadow-sm"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      <div className="text-gray-500 text-sm">
        Profile created on {new Date(employee.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
