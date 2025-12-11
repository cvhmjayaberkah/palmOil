import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Ambil nilai tema dari localStorage
    const savedTheme = localStorage.getItem("theme"); 
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Menentukan apakah mode gelap harus diaktifkan
    const initialDark = savedTheme ? savedTheme === "dark" : systemDark;

    setIsDarkMode(initialDark);
    // Menerapkan kelas dark ke dokument
    document.documentElement.classList.toggle("dark", initialDark);
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // Terapkan tema ke dokumen
    document.documentElement.classList.toggle("dark", newDarkMode);
    // Simpan preferensi tema di localStorage
    localStorage.setItem("theme", newDarkMode ? "dark" : "light"); 
  };

  return (
    <button
      onClick={toggleTheme}
      className="cursor-pointer p-1 md:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Ubah Tema"
    >
      <span className="text-lg md:text-xl">
        {isDarkMode ? "🌙" : "☀️"}
      </span>
    </button>
  );
};

export default ThemeToggle;