import { Link, NavLink, useNavigate } from "react-router-dom";
import { lazy, useState } from "react";
import { Menu, X } from "lucide-react"; // hamburger icons
import { useProgress } from "../contexts/AuthContext"; // optional if you implement auth

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useProgress()|| {}; // optional auth

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout?.();
    navigate("/auth/login");
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/lessons", label: "Lessons" },
    { to: "/profile", label: "Profile", protected: true },
    {
      to: "/onboarding", label: "Onboarding"
    }
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-indigo-600">
          MicroLearn
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map(
            (link) =>
              (!link.protected || user) && (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `hover:text-indigo-600 transition ${
                      isActive ? "text-indigo-600 font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-500 transition"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth/login"
              className="px-3 py-1 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={toggleMenu}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t shadow-sm">
          {navLinks.map(
            (link) =>
              (!link.protected || user) && (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 ${
                      isActive ? "bg-indigo-50 text-indigo-600" : "text-gray-700"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              )
          )}
          {user ? (
            <button
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-red-500"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth/login"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 bg-indigo-600 text-white text-center hover:bg-indigo-700"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
