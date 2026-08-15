import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import { LoadingState } from "./components/StateMessage";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import Clinics from "./pages/Clinics";
import BookAppointment from "./pages/BookAppointment";
import MyQueue from "./pages/MyQueue";
import LabResults from "./pages/LabResults";
import Profile from "./pages/Profile";

export default function App() {
  const { ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingState label="MedQueue Tashkent yuklanmoqda..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/queue" element={<MyQueue />} />
          <Route path="/labs" element={<LabResults />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="*"
            element={
              <div className="py-24 text-center">
                <p className="text-2xl font-bold text-ink">404</p>
                <p className="mt-2 text-ink/50">Sahifa topilmadi</p>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="border-t border-ink/5 py-6 text-center text-xs text-ink/40">
        MedQueue Tashkent — navbatni kutmang, vaqtingizni boshqaring.
      </footer>
    </div>
  );
}
