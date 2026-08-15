import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Doctor } from "../types";

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col overflow-hidden rounded-xl2 bg-white shadow-card transition hover:shadow-soft">
      <img
        src={doctor.photoUrl}
        alt={doctor.name}
        className="h-44 w-full object-cover"
        loading="lazy"
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-semibold text-ink">{doctor.name}</p>
        <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {doctor.specialty}
        </span>
        {doctor.clinic && (
          <p className="flex items-center gap-1.5 text-sm text-ink/50">
            <Building2 className="h-3.5 w-3.5" />
            {doctor.clinic.name}
          </p>
        )}
        <button
          onClick={() =>
            navigate(`/book?doctorId=${doctor.id}&clinicId=${doctor.clinicId}`)
          }
          className="mt-3 rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Navbat olish
        </button>
      </div>
    </div>
  );
}
