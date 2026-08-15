import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Stethoscope } from "lucide-react";
import { Clinic } from "../types";

export default function ClinicCard({ clinic }: { clinic: Clinic }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 rounded-xl2 bg-white p-6 shadow-card transition hover:shadow-soft">
      <p className="text-lg font-semibold text-ink">{clinic.name}</p>
      <p className="flex items-start gap-2 text-sm text-ink/55">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        {clinic.address}
      </p>
      <p className="flex items-center gap-2 text-sm text-ink/55">
        <Clock className="h-4 w-4 shrink-0" />
        {clinic.workingHours}
      </p>
      {clinic.doctors && (
        <p className="flex items-center gap-2 text-sm text-ink/55">
          <Stethoscope className="h-4 w-4 shrink-0" />
          {clinic.doctors.length} ta shifokor
        </p>
      )}
      <button
        onClick={() => navigate(`/book?clinicId=${clinic.id}`)}
        className="mt-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Navbat olish
      </button>
    </div>
  );
}
